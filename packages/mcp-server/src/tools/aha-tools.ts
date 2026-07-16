/**
 * Aha! crew tools — REST-API based (key-authenticated), the crew's autonomous lane into Aha!.
 *
 * Per the crew review: the Aha! remote MCP endpoint (/api/v1/mcp) requires OAuth and is the
 * IDE/human assistant path; the crew automates Aha! via the REST API with AHA_API_KEY (no OAuth).
 *
 * Concept mapping: Product = project/workspace · Epic = epic · Feature = story ·
 * Requirement = task · Release = sprint.
 *
 * WorfGate controls (from Worf's review): write operations require explicit `confirm: true`
 * (otherwise return a dry-run preview), and every write is audit-logged.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCrewAhaMatrix, authorizeAhaWrite } from '../lib/crew-aha-roles.js';
import { resolveAhaCredentials } from '@story-agent/shared/aha-credentials';
import { AGILE_SPRINT_GUARDRAILS, buildCrewCompletionComment, decideCrewAssignment, estimateStoryGravity, resolvePrimaryAhaAssigneeId, type StoryRiskLevel } from '@story-agent/shared';
// cross-surface sync ledger (AHA-SYNC-TIERS)
import { emitAhaEventSafe } from '@story-agent/shared/aha-events';
import { executeAhaStoryWithMemory } from '../lib/crew-aha-mission.js';
import { getRelevantObservationMemories, getRecentObservationMemories, storeObservationMemory } from '@story-agent/shared/db';
import { gateAhaWrite } from '../lib/crew-aha-automode.js';
import { syncCrewResultToAha } from '../lib/crew-aha-sync.js';
import { getAhaStory } from '../lib/aha.js';
import { ahaRefToBranchName, branchCreateCommand } from '../lib/git-aha-branching.js';
import { startStoryWithBranch, linkStoryToPR, completeStory } from '../lib/crew-story-lifecycle.js';

async function aha(path: string, init?: RequestInit): Promise<any> {
  // Single source of truth: AWS Secrets Manager → direct-Aha env fallback (see aha-credentials.ts).
  const { domain: d, apiKey: k } = await resolveAhaCredentials();
  const resp = await fetch(`https://${d}/api/v1/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${k}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Aha! ${resp.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] });
const audit = (op: string, detail: Record<string, unknown>) =>
  process.stderr.write(`[AHA-AUDIT] ${op} ${JSON.stringify(detail)}\n`);

const COMPLETED_STATUS_RE = /\b(done|complete|completed|shipped|fulfilled)\b/i;

function shouldPublishCompletionComment(status?: string): boolean {
  return typeof status === 'string' && COMPLETED_STATUS_RE.test(status);
}

async function postAhaCommentSafe(path: string, body: string): Promise<void> {
  try {
    await aha(path, { method: 'POST', body: JSON.stringify({ comment: { body } }) });
  } catch (error) {
    process.stderr.write(`[AHA-AUDIT] comment-failed ${JSON.stringify({ path, error: error instanceof Error ? error.message : String(error) })}\n`);
  }
}

async function storeAgileSprintMemorySafe(input: {
  agentId: string;
  action: 'create' | 'update';
  sprintId: string;
  sprintName: string;
  productPrefix?: string;
}): Promise<void> {
  try {
    await storeObservationMemory({
      storyId: `agile-sprint-${input.sprintId}`,
      source: 'mcp',
      transcript: {
        storyRef: `agile-sprint-${input.sprintId}`,
        summary: `${input.action} sprint board ${input.sprintName}`,
        participants: ['riker', 'quark', input.agentId],
        rounds: [],
        consensus: 'Sprint updates must preserve explicit ownership, status freshness, and completion evidence.',
        decisions: AGILE_SPRINT_GUARDRAILS,
      } as any,
      tags: ['agile', 'sprint-board', 'riker', 'quark', `action-${input.action}`],
    });
  } catch (error) {
    process.stderr.write(`[AHA-AUDIT] agile-memory-failed ${JSON.stringify({ sprintId: input.sprintId, error: error instanceof Error ? error.message : String(error) })}\n`);
  }
}

export function registerAhaTools(server: McpServer): void {
  // ── Crew self-organization: who owns which Aha! capability, on which model tier ──
  server.tool(
    'aha:crew-assignments',
    'Return the crew↔Aha! capability matrix: each member\'s Aha! focus, owned tools, leader/supporter tier, and the OpenRouter model they use (cost_optimized: leaders=quality, supporters=cheap). Crew calls this to self-organize Aha! work.',
    {},
    async () => ok(getCrewAhaMatrix()),
  );

  // ── Full mission loop: agree→RAG → governed Aha! write → result→RAG ──────────
  server.tool(
    'aha:execute-story',
    'Run an agreed story through the governed loop: store the agreement to RAG memory, execute a verified+confirmed Aha! create (else dry-run), then store the result to RAG. This is how the crew uses Aha! as the PM system while remembering every decision + outcome.',
    {
      agentId: z.string().describe('Executing crew member (identity-verified), e.g. riker'),
      releaseId: z.string().describe('Aha! release (sprint) id to create the story in'),
      name: z.string().describe('Story (feature) name'),
      description: z.string().optional(),
      clientId: z.string().optional().describe('Client org for RAG memory isolation'),
      confirm: z.boolean().optional().describe('true = live Aha! write; false/omitted = dry-run (still records to RAG)'),
    },
    async ({ agentId, releaseId, name, description, clientId, confirm }) =>
      ok(await executeAhaStoryWithMemory({ executor: agentId, releaseId, story: { name, description }, clientId: clientId ?? null, confirm })),
  );

  // ── Crew learning: recall past Aha! interactions from RAG to inform new work ──
  server.tool(
    'aha:recall',
    'Recall the crew\'s past Aha! interactions (agreed + executed stories) from RAG memory, so the crew can learn from prior decisions/outcomes and reuse what it knows about Aha! when planning new clients, projects, epics, or stories.',
    {
      query: z.string().describe('What to recall, e.g. "stories about crew skill registry" or "past Aha epics"'),
      limit: z.number().optional(),
      clientId: z.string().optional(),
    },
    async ({ query, limit, clientId }) => {
      const mems = await getRelevantObservationMemories({ queryText: query, clientId: clientId ?? null, limit: (limit ?? 8) * 2 });
      const aha = mems.filter(m => (m.tags ?? []).some(t => t.startsWith('aha') || t.startsWith('story-')));
      return ok(aha.slice(0, limit ?? 8).map(m => ({
        storyId: m.storyId, tags: m.tags, when: m.createdAt,
        memory: (m.transcriptText ?? '').slice(0, 300),
      })));
    },
  );

  // ── READ (Resources analog) ────────────────────────────────────────────────
  server.tool(
    'aha:list-products',
    'List Aha! products/workspaces (mapped to projects). Use to discover available reference prefixes.',
    {},
    async () => ok((await aha('products?per_page=50')).products?.map((p: any) => ({ name: p.name, prefix: p.reference_prefix, id: p.id })) ?? []),
  );

  server.tool(
    'aha:list-epics',
    'List epics in a product (by reference prefix, e.g. "PROD"). Epics group features/stories.',
    { productPrefix: z.string().describe('Product reference prefix, e.g. PROD'), perPage: z.number().optional() },
    async ({ productPrefix, perPage }) =>
      ok((await aha(`products/${productPrefix}/epics?per_page=${perPage ?? 25}`)).epics?.map((e: any) => ({ ref: e.reference_num, name: e.name, status: e.workflow_status?.name })) ?? []),
  );

  server.tool(
    'aha:list-features',
    'List features (stories) in a product, optionally filtered by release. Features map to stories.',
    { productPrefix: z.string(), releaseId: z.string().optional(), perPage: z.number().optional() },
    async ({ productPrefix, releaseId, perPage }) => {
      const base = releaseId ? `releases/${releaseId}/features` : `products/${productPrefix}/features`;
      return ok((await aha(`${base}?per_page=${perPage ?? 25}`)).features?.map((f: any) => ({ ref: f.reference_num, name: f.name, status: f.workflow_status?.name, assignee: f.assigned_to_user?.name })) ?? []);
    },
  );

  server.tool(
    'aha:list-releases',
    'List releases (sprints) in a product by reference prefix. Releases map to sprints.',
    { productPrefix: z.string(), perPage: z.number().optional() },
    async ({ productPrefix, perPage }) =>
      ok((await aha(`products/${productPrefix}/releases?per_page=${perPage ?? 25}`)).releases?.map((r: any) => ({ id: r.id, name: r.name, released: r.released, release_date: r.release_date })) ?? []),
  );

  server.tool(
    'aha:get-record',
    'Retrieve an Aha! feature/requirement/epic by reference number (e.g. "PROD-123"). Use before planning work to align with product expectations.',
    { reference: z.string().describe('Reference number, e.g. PROD-123') },
    async ({ reference }) => {
      // Try feature, then requirement, then epic.
      for (const kind of ['features', 'requirements', 'epics']) {
        try { return ok(await aha(`${kind}/${reference}`)); } catch { /* try next */ }
      }
      throw new Error(`No feature/requirement/epic found for ${reference}`);
    },
  );

  // ── WRITE (Tools) — WorfGate-gated: dry-run unless confirm:true, always audited ──
  server.tool(
    'aha:create-feature',
    'Create a feature (story) in a release. WorfGate: requires a verified agentId (write-owner) AND confirm:true. Without confirm, returns a dry-run preview after verifying identity.',
    {
      agentId: z.string().describe('Crew member performing the write (e.g. riker, worf, obrien) — verified against the Aha! role matrix'),
      releaseId: z.string().describe('Target release (sprint) id'),
      name: z.string(),
      description: z.string().optional(),
      storyPoints: z.number().int().positive().optional().describe('Optional explicit story point override. If omitted, points are estimated using the Einstein-Fibonacci model.'),
      dependencyCount: z.number().int().nonnegative().optional(),
      integrationSurfaceCount: z.number().int().nonnegative().optional(),
      riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      uncertainty: z.number().min(0).max(1).optional().describe('0..1 uncertainty weight used by the estimator.'),
      epic: z.string().optional().describe('Optional epic reference (e.g. JONAH-E-1) to link the story under — sets both the epic and the sprint in one call.'),
      confirm: z.boolean().optional().describe('true to execute (human-approved, or automated after agent verification)'),
    },
    async ({ agentId, releaseId, name, description, storyPoints, dependencyCount, integrationSurfaceCount, riskLevel, uncertainty, epic, confirm }) => {
      const authz = authorizeAhaWrite(agentId, 'aha:create-feature');
      if (!authz.authorized) return ok({ rejected: true, reason: authz.reason });
      const assignment = decideCrewAssignment({ title: name, description });
      const assigneeId = resolvePrimaryAhaAssigneeId(assignment, process.env);
      const estimate = estimateStoryGravity({
        name,
        description,
        dependencyCount,
        integrationSurfaceCount,
        riskLevel: riskLevel as StoryRiskLevel | undefined,
        uncertainty,
      });
      const finalStoryPoints = storyPoints ?? estimate.storyPoints;
      // Auto-mode classification (crew governance): a draft feature create is AUTO.
      const { proceed, classification } = gateAhaWrite({ verb: 'create', resource: 'feature', publishedState: 'draft', agentId }, confirm);
      if (classification.decision === 'block') return ok({ blocked: true, agent: agentId, classification });
      if (!proceed) return ok({
        dryRun: true,
        agent: agentId,
        identity: authz.reason,
        classification,
        wouldCreate: { releaseId, name, description, epic, score: finalStoryPoints, assignedCrew: assignment.primary, assignedAhaUserId: assigneeId },
        estimation: {
          model: estimate.model,
          suggestedStoryPoints: estimate.storyPoints,
          appliedStoryPoints: finalStoryPoints,
          gravityWeight: estimate.gravityWeight,
          effectiveVelocityLoad: estimate.effectiveVelocityLoad,
          rationale: estimate.rationale,
        },
        note: `auto-mode=${classification.decision}: re-call with confirm:true to execute.`,
      });
      audit('create-feature', { agentId, releaseId, name, epic, decision: classification.decision });
      const feature: Record<string, unknown> = { name, description, score: finalStoryPoints };
      if (epic) feature.epic = epic;  // Aha links both the epic and the sprint from the release-scoped create.
      if (assigneeId) feature.assigned_to_user = { id: assigneeId };
      const res = await aha(`releases/${releaseId}/features`, { method: 'POST', body: JSON.stringify({ feature }) });
      const ref = String(res.feature?.reference_num ?? res.feature?.id ?? '');
      await postAhaCommentSafe(`features/${ref}/comments`, buildCrewCompletionComment({
        actor: assignment.primary,
        summary: `Initial ownership assigned to ${assignment.primary}. Advisor lane: ${assignment.advisors.join(', ')}.`,
      }));
      void emitAhaEventSafe({ actor: 'mcp', resourceType: 'story', operation: 'created', resourceId: String(res.feature?.reference_num ?? res.feature?.id ?? ''), meta: { sprint_id: releaseId } });
      return ok({
        created: res.feature?.reference_num,
        name: res.feature?.name,
        by: agentId,
        assignedCrew: assignment.primary,
        assignedAhaUserId: assigneeId,
        assignmentReason: assignment.reason,
        storyPoints: res.feature?.score ?? finalStoryPoints,
        estimation: {
          model: estimate.model,
          suggestedStoryPoints: estimate.storyPoints,
          appliedStoryPoints: finalStoryPoints,
          gravityWeight: estimate.gravityWeight,
          effectiveVelocityLoad: estimate.effectiveVelocityLoad,
          rationale: estimate.rationale,
        },
        autoMode: classification,
      });
    },
  );

  server.tool(
    'aha:update-feature',
    'Update a feature (story) by reference — name, description, or workflow status. WorfGate: requires a verified agentId (write-owner) AND confirm:true; else dry-run after identity check.',
    {
      agentId: z.string().describe('Crew member performing the write (e.g. riker, worf, obrien) — verified against the Aha! role matrix'),
      reference: z.string().describe('Feature reference, e.g. PROD-123'),
      name: z.string().optional(),
      description: z.string().optional(),
      workflowStatus: z.string().optional().describe('Target workflow status name'),
      confirm: z.boolean().optional(),
    },
    async ({ agentId, reference, name, description, workflowStatus, confirm }) => {
      const authz = authorizeAhaWrite(agentId, 'aha:update-feature');
      if (!authz.authorized) return ok({ rejected: true, reason: authz.reason });
      const assignment = decideCrewAssignment({ title: name, description });
      const assigneeId = resolvePrimaryAhaAssigneeId(assignment, process.env);
      const feature: Record<string, unknown> = {};
      if (name) feature.name = name;
      if (description) feature.description = description;
      if (workflowStatus) feature.workflow_status = workflowStatus;
      if (assigneeId) feature.assigned_to_user = { id: assigneeId };
      // Auto-mode: status changes are stakeholder-sensitive → CONFIRM; plain field edits → AUTO.
      const { proceed, classification } = gateAhaWrite({ verb: 'update', resource: 'feature', fieldsMutated: Object.keys(feature), agentId }, confirm);
      if (classification.decision === 'block') return ok({ blocked: true, agent: agentId, classification });
      if (!proceed) return ok({ dryRun: true, agent: agentId, identity: authz.reason, classification, reference, wouldUpdate: feature, note: `auto-mode=${classification.decision}: re-call with confirm:true to execute.` });
      audit('update-feature', { agentId, reference, fields: Object.keys(feature), decision: classification.decision });
      const res = await aha(`features/${reference}`, { method: 'PUT', body: JSON.stringify({ feature }) });
      if (shouldPublishCompletionComment(workflowStatus)) {
        await postAhaCommentSafe(`features/${reference}/comments`, buildCrewCompletionComment({
          actor: assignment.primary,
          summary: `Workflow moved to '${workflowStatus}' and execution outcomes were synchronized by the autonomous crew lane.`,
          includeChecklist: true,
        }));
      }
      void emitAhaEventSafe({ actor: 'mcp', resourceType: 'story', operation: workflowStatus ? 'status_changed' : 'updated', resourceId: reference, meta: workflowStatus ? { status_to: workflowStatus } : undefined });
      return ok({ updated: res.feature?.reference_num, status: res.feature?.workflow_status?.name, by: agentId, assignedCrew: assignment.primary, assignedAhaUserId: assigneeId, autoMode: classification });
    },
  );

  // ── CREATE RELEASE (sprint) ────────────────────────────────────────────────
  server.tool(
    'aha:create-release',
    'Create a release (sprint) in a product. This is what unblocks the full hierarchy — features/epics need a release to live in. WorfGate: requires a verified agentId AND (for a draft) auto-proceeds; else dry-run preview. name + product prefix required; start/end dates optional.',
    {
      agentId: z.string().describe('Crew member performing the write (e.g. picard, riker) — verified against the Aha! role matrix'),
      productPrefix: z.string().describe('Target product reference prefix, e.g. JONAH'),
      name: z.string().describe('Release (sprint) name, e.g. "S1 · wk 1-4"'),
      startDate: z.string().optional().describe('Sprint start date YYYY-MM-DD'),
      endDate: z.string().optional().describe('Sprint end / release date YYYY-MM-DD'),
      confirm: z.boolean().optional().describe('true to execute; omitted = dry-run after identity check'),
    },
    async ({ agentId, productPrefix, name, startDate, endDate, confirm }) => {
      const authz = authorizeAhaWrite(agentId, 'aha:create-release');
      if (!authz.authorized) return ok({ rejected: true, reason: authz.reason });
      const { proceed, classification } = gateAhaWrite({ verb: 'create', resource: 'release', publishedState: 'draft', agentId }, confirm);
      if (classification.decision === 'block') return ok({ blocked: true, agent: agentId, classification });
      if (!proceed) return ok({ dryRun: true, agent: agentId, identity: authz.reason, classification, wouldCreate: { productPrefix, name, startDate, endDate }, note: `auto-mode=${classification.decision}: re-call with confirm:true to execute.` });
      audit('create-release', { agentId, productPrefix, name, decision: classification.decision });
      const release: Record<string, unknown> = { name };
      if (startDate) release.start_date = startDate;
      if (endDate) release.release_date = endDate;
      const res = await aha(`products/${productPrefix}/releases`, { method: 'POST', body: JSON.stringify({ release }) });
      await storeAgileSprintMemorySafe({
        agentId,
        action: 'create',
        sprintId: String(res.release?.id ?? name),
        sprintName: String(res.release?.name ?? name),
        productPrefix,
      });
      void emitAhaEventSafe({ actor: 'mcp', resourceType: 'release', operation: 'created', resourceId: String(res.release?.id ?? res.release?.reference_num ?? ''), meta: { project_id: productPrefix } });
      return ok({ created: res.release?.reference_num, id: res.release?.id, name: res.release?.name, by: agentId, autoMode: classification });
    },
  );

  // ── CREATE EPIC ────────────────────────────────────────────────────────────
  server.tool(
    'aha:create-epic',
    'Create an epic in a release (sprint). Epics group features/stories. WorfGate: verified agentId + auto-mode (draft create is AUTO); else dry-run preview.',
    {
      agentId: z.string().describe('Crew member performing the write (e.g. data, riker) — verified against the Aha! role matrix'),
      releaseId: z.string().describe('Target release (sprint) id the epic belongs to'),
      name: z.string().describe('Epic name'),
      description: z.string().optional(),
      confirm: z.boolean().optional().describe('true to execute; omitted = dry-run after identity check'),
    },
    async ({ agentId, releaseId, name, description, confirm }) => {
      const authz = authorizeAhaWrite(agentId, 'aha:create-epic');
      if (!authz.authorized) return ok({ rejected: true, reason: authz.reason });
      const { proceed, classification } = gateAhaWrite({ verb: 'create', resource: 'epic', publishedState: 'draft', agentId }, confirm);
      if (classification.decision === 'block') return ok({ blocked: true, agent: agentId, classification });
      if (!proceed) return ok({ dryRun: true, agent: agentId, identity: authz.reason, classification, wouldCreate: { releaseId, name, description }, note: `auto-mode=${classification.decision}: re-call with confirm:true to execute.` });
      audit('create-epic', { agentId, releaseId, name, decision: classification.decision });
      const res = await aha(`releases/${releaseId}/epics`, { method: 'POST', body: JSON.stringify({ epic: { name, description } }) });
      void emitAhaEventSafe({ actor: 'mcp', resourceType: 'epic', operation: 'created', resourceId: String(res.epic?.reference_num ?? res.epic?.id ?? ''), meta: { sprint_id: releaseId } });
      return ok({ created: res.epic?.reference_num, id: res.epic?.id, name: res.epic?.name, by: agentId, autoMode: classification });
    },
  );

  // ── CREATE REQUIREMENT (task) ──────────────────────────────────────────────
  server.tool(
    'aha:create-requirement',
    'Create a requirement (task) under a feature (story). WorfGate: verified agentId + auto-mode (draft create is AUTO); else dry-run preview.',
    {
      agentId: z.string().describe('Crew member performing the write (e.g. yar, riker) — verified against the Aha! role matrix'),
      featureRef: z.string().describe('Parent feature (story) reference, e.g. JONAH-1'),
      name: z.string().describe('Requirement (task) name'),
      description: z.string().optional(),
      confirm: z.boolean().optional().describe('true to execute; omitted = dry-run after identity check'),
    },
    async ({ agentId, featureRef, name, description, confirm }) => {
      const authz = authorizeAhaWrite(agentId, 'aha:create-requirement');
      if (!authz.authorized) return ok({ rejected: true, reason: authz.reason });
      const assignment = decideCrewAssignment({ title: name, description });
      const assigneeId = resolvePrimaryAhaAssigneeId(assignment, process.env);
      const { proceed, classification } = gateAhaWrite({ verb: 'create', resource: 'requirement', publishedState: 'draft', agentId }, confirm);
      if (classification.decision === 'block') return ok({ blocked: true, agent: agentId, classification });
      if (!proceed) return ok({ dryRun: true, agent: agentId, identity: authz.reason, classification, wouldCreate: { featureRef, name, description, assignedCrew: assignment.primary, assignedAhaUserId: assigneeId }, note: `auto-mode=${classification.decision}: re-call with confirm:true to execute.` });
      audit('create-requirement', { agentId, featureRef, name, decision: classification.decision });
      const requirement: Record<string, unknown> = { name, description };
      if (assigneeId) requirement.assigned_to_user = { id: assigneeId };
      const res = await aha(`features/${featureRef}/requirements`, { method: 'POST', body: JSON.stringify({ requirement }) });
      const reqRef = String(res.requirement?.reference_num ?? res.requirement?.id ?? '');
      await postAhaCommentSafe(`requirements/${reqRef}/comments`, buildCrewCompletionComment({
        actor: assignment.primary,
        summary: `Task ownership assigned to ${assignment.primary}. Advisor lane: ${assignment.advisors.join(', ')}.`,
      }));
      void emitAhaEventSafe({ actor: 'mcp', resourceType: 'requirement', operation: 'created', resourceId: String(res.requirement?.reference_num ?? res.requirement?.id ?? '') });
      return ok({ created: res.requirement?.reference_num, id: res.requirement?.id, name: res.requirement?.name, by: agentId, assignedCrew: assignment.primary, assignedAhaUserId: assigneeId, autoMode: classification });
    },
  );

  // ── UPDATE release / epic / requirement (mirror update-feature) ────────────
  server.tool(
    'aha:update-release',
    'Update a release (sprint) by id — name, start/end dates. WorfGate: verified agentId; a date change is stakeholder-sensitive → CONFIRM, plain name edit → AUTO; else dry-run.',
    {
      agentId: z.string().describe('Crew member performing the write — verified against the Aha! role matrix'),
      id: z.string().describe('Release (sprint) id to update'),
      name: z.string().optional(),
      startDate: z.string().optional().describe('Sprint start date YYYY-MM-DD'),
      endDate: z.string().optional().describe('Sprint end / release date YYYY-MM-DD'),
      confirm: z.boolean().optional(),
    },
    async ({ agentId, id, name, startDate, endDate, confirm }) => {
      const authz = authorizeAhaWrite(agentId, 'aha:update-release');
      if (!authz.authorized) return ok({ rejected: true, reason: authz.reason });
      const release: Record<string, unknown> = {};
      if (name) release.name = name;
      if (startDate) release.start_date = startDate;
      if (endDate) release.release_date = endDate;
      const { proceed, classification } = gateAhaWrite({ verb: 'update', resource: 'release', fieldsMutated: Object.keys(release), agentId }, confirm);
      if (classification.decision === 'block') return ok({ blocked: true, agent: agentId, classification });
      if (!proceed) return ok({ dryRun: true, agent: agentId, identity: authz.reason, classification, id, wouldUpdate: release, note: `auto-mode=${classification.decision}: re-call with confirm:true to execute.` });
      audit('update-release', { agentId, id, fields: Object.keys(release), decision: classification.decision });
      const res = await aha(`releases/${id}`, { method: 'PUT', body: JSON.stringify({ release }) });
      await storeAgileSprintMemorySafe({
        agentId,
        action: 'update',
        sprintId: id,
        sprintName: String(res.release?.name ?? id),
      });
      void emitAhaEventSafe({ actor: 'mcp', resourceType: 'release', operation: 'updated', resourceId: id, meta: { sprint_id: id } });
      return ok({ updated: res.release?.reference_num, id: res.release?.id, name: res.release?.name, by: agentId, autoMode: classification });
    },
  );

  server.tool(
    'aha:update-epic',
    'Update an epic by reference — name or description. WorfGate: verified agentId + auto-mode (plain field edit is AUTO); else dry-run.',
    {
      agentId: z.string().describe('Crew member performing the write — verified against the Aha! role matrix'),
      reference: z.string().describe('Epic reference, e.g. JONAH-E-1'),
      name: z.string().optional(),
      description: z.string().optional(),
      confirm: z.boolean().optional(),
    },
    async ({ agentId, reference, name, description, confirm }) => {
      const authz = authorizeAhaWrite(agentId, 'aha:update-epic');
      if (!authz.authorized) return ok({ rejected: true, reason: authz.reason });
      const epic: Record<string, unknown> = {};
      if (name) epic.name = name;
      if (description) epic.description = description;
      const { proceed, classification } = gateAhaWrite({ verb: 'update', resource: 'epic', fieldsMutated: Object.keys(epic), agentId }, confirm);
      if (classification.decision === 'block') return ok({ blocked: true, agent: agentId, classification });
      if (!proceed) return ok({ dryRun: true, agent: agentId, identity: authz.reason, classification, reference, wouldUpdate: epic, note: `auto-mode=${classification.decision}: re-call with confirm:true to execute.` });
      audit('update-epic', { agentId, reference, fields: Object.keys(epic), decision: classification.decision });
      const res = await aha(`epics/${reference}`, { method: 'PUT', body: JSON.stringify({ epic }) });
      void emitAhaEventSafe({ actor: 'mcp', resourceType: 'epic', operation: 'updated', resourceId: reference });
      return ok({ updated: res.epic?.reference_num, name: res.epic?.name, by: agentId, autoMode: classification });
    },
  );

  server.tool(
    'aha:update-requirement',
    'Update a requirement (task) by reference — name or description. WorfGate: verified agentId + auto-mode (plain field edit is AUTO); else dry-run.',
    {
      agentId: z.string().describe('Crew member performing the write — verified against the Aha! role matrix'),
      reference: z.string().describe('Requirement reference, e.g. JONAH-9-1'),
      name: z.string().optional(),
      description: z.string().optional(),
      workflowStatus: z.string().optional().describe('Optional requirement workflow status name'),
      completionSummary: z.string().optional().describe('Optional completion details to post as an Aha comment when task is fulfilled'),
      confirm: z.boolean().optional(),
    },
    async ({ agentId, reference, name, description, workflowStatus, completionSummary, confirm }) => {
      const authz = authorizeAhaWrite(agentId, 'aha:update-requirement');
      if (!authz.authorized) return ok({ rejected: true, reason: authz.reason });
      const assignment = decideCrewAssignment({ title: name, description: `${description ?? ''}\n${completionSummary ?? ''}` });
      const assigneeId = resolvePrimaryAhaAssigneeId(assignment, process.env);
      const requirement: Record<string, unknown> = {};
      if (name) requirement.name = name;
      if (description) requirement.description = description;
      if (workflowStatus) requirement.workflow_status = { name: workflowStatus };
      if (assigneeId) requirement.assigned_to_user = { id: assigneeId };
      const { proceed, classification } = gateAhaWrite({ verb: 'update', resource: 'requirement', fieldsMutated: Object.keys(requirement), agentId }, confirm);
      if (classification.decision === 'block') return ok({ blocked: true, agent: agentId, classification });
      if (!proceed) return ok({ dryRun: true, agent: agentId, identity: authz.reason, classification, reference, wouldUpdate: requirement, note: `auto-mode=${classification.decision}: re-call with confirm:true to execute.` });
      audit('update-requirement', { agentId, reference, fields: Object.keys(requirement), decision: classification.decision });
      const res = await aha(`requirements/${reference}`, { method: 'PUT', body: JSON.stringify({ requirement }) });
      if (completionSummary || shouldPublishCompletionComment(workflowStatus)) {
        await postAhaCommentSafe(`requirements/${reference}/comments`, buildCrewCompletionComment({
          actor: assignment.primary,
          summary: completionSummary ?? `Requirement moved to '${workflowStatus}' and marked fulfilled by the autonomous crew lane.`,
          includeChecklist: shouldPublishCompletionComment(workflowStatus),
        }));
      }
      void emitAhaEventSafe({ actor: 'mcp', resourceType: 'requirement', operation: 'updated', resourceId: reference });
      return ok({ updated: res.requirement?.reference_num, name: res.requirement?.name, by: agentId, status: workflowStatus ?? null, assignedCrew: assignment.primary, assignedAhaUserId: assigneeId, autoMode: classification });
    },
  );

  // ── DELETE feature / epic / release / requirement ──────────────────────────
  // Destructive: gateAhaWrite/classifyAhaAction BLOCKS verb:'delete' by design, so deletes are
  // gated directly on an explicit confirm:true (identity-verified + audited; Aha has no undo).
  const deleteResourceType = { feature: 'story', epic: 'epic', release: 'release', requirement: 'requirement' } as const;
  const deleteTool = (name: string, kind: keyof typeof deleteResourceType, endpoint: (ref: string) => string) =>
    server.tool(
      name,
      `Delete an Aha! ${kind} by reference. DESTRUCTIVE + irreversible (Aha has no undo): requires a verified agentId AND confirm:true; without confirm returns a dry-run preview.`,
      {
        agentId: z.string().describe('Crew member performing the delete — verified against the Aha! role matrix'),
        reference: z.string().describe(`${kind} reference/id to delete`),
        confirm: z.boolean().optional().describe('true to permanently delete; omitted = dry-run preview'),
      },
      async ({ agentId, reference, confirm }) => {
        const authz = authorizeAhaWrite(agentId, name);
        if (!authz.authorized) return ok({ rejected: true, reason: authz.reason });
        if (confirm !== true) return ok({ dryRun: true, agent: agentId, identity: authz.reason, wouldDelete: { kind, reference }, note: 'DESTRUCTIVE + irreversible — re-call with confirm:true to permanently delete.' });
        audit(`delete-${kind}`, { agentId, reference });
        await aha(endpoint(reference), { method: 'DELETE' });
        void emitAhaEventSafe({ actor: 'mcp', resourceType: deleteResourceType[kind], operation: 'deleted', resourceId: reference });
        return ok({ deleted: reference, kind, by: agentId });
      },
    );
  deleteTool('aha:delete-feature', 'feature', (r) => `features/${r}`);
  deleteTool('aha:delete-epic', 'epic', (r) => `epics/${r}`);
  deleteTool('aha:delete-release', 'release', (r) => `releases/${r}`);
  deleteTool('aha:delete-requirement', 'requirement', (r) => `requirements/${r}`);

  // ── CREW STATUS FEED → AHA STORY (auto-maintain the backlog from crew memory) ──
  server.tool(
    'crew_sync_to_aha',
    'Turn a stored crew mission/status RESULT (from RAG, by storyId) into an Aha! story under a release, so the crew auto-maintains its own backlog. WorfGate-gated: dry-run draft unless confirm:true; identity-verified executor; audited; remembered to RAG. The crew proposes, a human confirms.',
    {
      storyId: z.string().describe('RAG mission storyId to convert (e.g. crew-autonomy, snyk-mcp-tools, stall-research)'),
      releaseId: z.string().describe('Aha! release (sprint) to create the story in'),
      executor: z.enum(['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark']).optional().default('riker'),
      clientId: z.string().optional(),
      confirm: z.boolean().optional().describe('true = live Aha! write; false/omitted = dry-run draft (still recorded to RAG)'),
    },
    async ({ storyId, releaseId, executor, clientId, confirm }) => {
      const mems = await getRecentObservationMemories(1, storyId, clientId ?? null);
      if (!mems.length) return ok({ error: `no RAG mission memory found for storyId '${storyId}'` });
      const m = mems[0];
      const contributions = (m.transcript?.rounds?.[0]?.entries ?? []).map((e) => ({ crewId: e.speakerId }));
      const result = { goals: m.transcript?.rounds?.[0]?.title ?? storyId, missionPlan: m.transcript?.consensusSummary ?? '', contributions, storyId };
      return ok(await syncCrewResultToAha(result, { releaseId, executor, clientId: clientId ?? null, confirm }));
    },
  );

  // ── GIT BRANCH ↔ AHA STORY (mirror the backlog in git) ─────────────────────
  server.tool(
    'aha_branch_for_story',
    'Derive the git branch name for an Aha! story/task so branches mirror the backlog (story/<REF>-<kebab-slug>). Returns the branch name + the from-main create command (never force) for the agent to run via WorfGate-governed git. Does NOT create the branch itself — derivation only.',
    {
      ref: z.string().describe('Aha reference, e.g. PROD-17 (story) or PROD-17.1 (task)'),
      name: z.string().optional().describe('Story title; if omitted, fetched from Aha'),
      kind: z.enum(['story', 'task', 'epic']).optional().default('story'),
      base: z.string().optional().default('main'),
    },
    async ({ ref, name, kind, base }) => {
      let title = name;
      if (!title) { try { title = (await getAhaStory(ref)).name; } catch { /* title optional */ } }
      const branch = ahaRefToBranchName({ ref, name: title, kind });
      return ok({ ref, kind, branch, base, command: branchCreateCommand(branch, base), note: 'Run via agent-core run_shell (WorfGate-gated); never force-push or rewrite main.' });
    },
  );

  // ── START STORY (Aha story + matching git branch, in sync) ─────────────────
  server.tool(
    'crew_start_story',
    'Start a unit of work end-to-end in sync: create an Aha! story AND its matching git branch (story/<REF>-<slug>, from main, no switch, never force). WorfGate-gated: dry-run unless confirm:true; the Aha write is identity-verified + audited + RAG-remembered. Keeps git and the backlog in lockstep.',
    {
      name: z.string().describe('Story title'),
      description: z.string().optional(),
      releaseId: z.string().describe('Aha! release (sprint) to create the story in'),
      executor: z.enum(['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark']).optional().default('riker'),
      push: z.boolean().optional().describe('also push the new branch to origin'),
      confirm: z.boolean().optional().describe('true = create story + branch; false/omitted = dry-run'),
    },
    async ({ name, description, releaseId, executor, push, confirm }) =>
      ok(await startStoryWithBranch({ name, description, releaseId, executor, push, confirm })),
  );

  // ── LINK STORY TO PR (Move to code review) ─────────────────────────────────
  server.tool(
    'crew_link_story_pr',
    'Link an Aha story to its PR and move it to code review (gated).',
    {
      ref: z.string(),
      prUrl: z.string(),
      prTitle: z.string(),
      confirm: z.boolean().optional()
    },
    async (a) => ok(await linkStoryToPR(a))
  );

  // ── COMPLETE STORY (Mark shipped + delete branch) ──────────────────────────
  server.tool(
    'crew_complete_story',
    'Mark an Aha story shipped and delete its branch on merge (gated; never main).',
    {
      ref: z.string(),
      branch: z.string(),
      confirm: z.boolean().optional()
    },
    async (a) => ok(await completeStory(a))
  );

  // ── PHASE 3: CREW SELF-ASSIGNMENT (Observation Lounge → Aha story ownership) ─
  server.tool(
    'aha_crew_self_assign',
    'Crew member self-assigns to an Aha story after Observation Lounge consensus. Updates story assignee + custom crew fields + logs deliberation to crew memory with bidirectional Aha link. Call once per story after the daily 09:00 Observation Lounge.',
    {
      ref: z.string().describe('Aha feature reference, e.g. PROD-42'),
      crewMember: z.enum(['picard', 'data', 'riker', 'worf', 'geordi', 'obrien', 'yar', 'troi', 'crusher', 'uhura', 'quark'])
        .describe('Crew member claiming the story'),
      collaborators: z.array(z.enum(['picard', 'data', 'riker', 'worf', 'geordi', 'obrien', 'yar', 'troi', 'crusher', 'uhura', 'quark']))
        .optional().describe('Other crew members collaborating on this story'),
      rationale: z.string().describe('Why this crew member is best fit (domain match, memory priors, etc.)'),
      memoryPriorsUsed: z.array(z.string()).optional().describe('Crew memory tags recalled before this decision'),
      consensusGate: z.enum(['AUTO', 'YELLOW', 'RED']).optional().default('AUTO').describe('Gate type from Observation Lounge'),
      confirm: z.boolean().optional().describe('true = live Aha write; false/omitted = dry-run preview'),
    },
    async ({ ref, crewMember, collaborators, rationale, memoryPriorsUsed, consensusGate, confirm }) => {
      const preview = {
        ref,
        crewMember,
        collaborators: collaborators ?? [],
        rationale,
        memoryPriorsUsed: memoryPriorsUsed ?? [],
        consensusGate,
        ahaUpdate: {
          workflow_status: { name: 'In development' },
          custom_fields: [
            { key: 'crew_member_primary', value: crewMember },
            { key: 'crew_team', value: (collaborators ?? []).join(', ') },
            { key: 'crew_consensus_gate', value: consensusGate },
            { key: 'deliberation_log_id', value: `${crewMember}-${ref}-deliberation-${new Date().toISOString().split('T')[0]}` },
          ],
        },
      };

      if (!confirm) {
        return ok({ dryRun: true, preview, note: 'Pass confirm:true to execute the Aha write + memory log.' });
      }

      audit('crew_self_assign', { ref, crewMember, consensusGate });

      try {
        await aha(`features/${ref}`, {
          method: 'PUT',
          body: JSON.stringify({
            feature: {
              workflow_status: { name: 'In development' },
              custom_fields: [
                { key: 'crew_member_primary', value: crewMember },
                { key: 'crew_team', value: (collaborators ?? []).join(', ') },
                { key: 'crew_consensus_gate', value: consensusGate },
                { key: 'deliberation_log_id', value: `${crewMember}-${ref}-deliberation-${new Date().toISOString().split('T')[0]}` },
                { key: 'status_last_updated_by_crew', value: crewMember },
              ],
            },
          }),
        });
      } catch (e) {
        process.stderr.write(`[AHA-AUDIT] crew_self_assign custom_fields_failed — Aha may not support these custom fields yet: ${e}\n`);
      }

      await postAhaCommentSafe(`features/${ref}/comments`, [
        `🖖 **${crewMember.charAt(0).toUpperCase() + crewMember.slice(1)} self-assigned** via Observation Lounge (gate: ${consensusGate})`,
        `**Rationale:** ${rationale}`,
        collaborators?.length ? `**Collaborators:** ${collaborators.join(', ')}` : null,
        memoryPriorsUsed?.length ? `**Memory priors applied:** ${memoryPriorsUsed.join(', ')}` : null,
      ].filter(Boolean).join('\n'));

      const memoryLogId = `${crewMember}-${ref}-deliberation-${new Date().toISOString().split('T')[0]}`;
      await storeObservationMemory({
        storyId: memoryLogId,
        source: 'mcp',
        transcript: {
          storyRef: ref,
          summary: `${crewMember} self-assigned to ${ref} (gate: ${consensusGate}). Rationale: ${rationale}`,
          participants: [crewMember, ...(collaborators ?? [])],
          rounds: [],
          consensus: rationale,
          decisions: memoryPriorsUsed ?? [],
        } as any,
        tags: ['phase-3', 'self-assignment', ref, crewMember, `gate-${consensusGate?.toLowerCase()}`],
      });

      return ok({ success: true, ref, crewMember, consensusGate, memoryLogId, note: 'Story assigned in Aha + crew memory logged.' });
    },
  );

  // ── PHASE 3: CREW DAILY STANDUP UPDATE ──────────────────────────────────────
  server.tool(
    'aha_crew_standup_update',
    'Crew member posts their daily standup update (17:00 PST) to an Aha story: progress %, health signal, cognitive load, decisions made, risks, and optional blocker discovery. Auto-logs to crew memory with bidirectional Aha link.',
    {
      ref: z.string().describe('Aha feature reference, e.g. PROD-42'),
      crewMember: z.enum(['picard', 'data', 'riker', 'worf', 'geordi', 'obrien', 'yar', 'troi', 'crusher', 'uhura', 'quark']),
      completedToday: z.string().describe('What was accomplished today'),
      percentageComplete: z.number().min(0).max(100).describe('Overall story completion 0-100'),
      confidenceLevel: z.number().min(0).max(10).describe('Confidence in on-time delivery (0-10)'),
      healthSignal: z.enum(['Healthy', 'Fatigued', 'Stressed']).describe('Crew member health signal'),
      cognitiveLoad: z.number().min(0).max(10).describe('Cognitive load 0-10 (>7 = approaching limit)'),
      risks: z.array(z.string()).optional().describe('Risks identified today'),
      decisions: z.array(z.string()).optional().describe('Key decisions made today'),
      blockerDiscovered: z.object({
        description: z.string(),
        blockedByRef: z.string().optional().describe('Aha ref of blocking story, e.g. PROD-38'),
        severity: z.enum(['YELLOW', 'RED']),
      }).optional().describe('Blocker found during execution'),
      confirm: z.boolean().optional().describe('true = live Aha write; false/omitted = dry-run'),
    },
    async ({ ref, crewMember, completedToday, percentageComplete, confidenceLevel, healthSignal, cognitiveLoad, risks, decisions, blockerDiscovered, confirm }) => {
      const today = new Date().toISOString().split('T')[0];
      const progressNotes = [
        `**${today} standup — ${crewMember}**`,
        `Completed: ${completedToday}`,
        `Progress: ${percentageComplete}% | Confidence: ${confidenceLevel}/10`,
        `Health: ${healthSignal} | Cognitive load: ${cognitiveLoad}/10`,
        risks?.length ? `Risks: ${risks.join('; ')}` : null,
        decisions?.length ? `Decisions: ${decisions.join('; ')}` : null,
        blockerDiscovered ? `⚠️ BLOCKER (${blockerDiscovered.severity}): ${blockerDiscovered.description}${blockerDiscovered.blockedByRef ? ` [blocked by ${blockerDiscovered.blockedByRef}]` : ''}` : null,
      ].filter(Boolean).join('\n');

      if (!confirm) {
        return ok({ dryRun: true, progressNotes, percentageComplete, healthSignal, cognitiveLoad, blockerDiscovered: blockerDiscovered ?? null, note: 'Pass confirm:true to write to Aha + crew memory.' });
      }

      audit('crew_standup_update', { ref, crewMember, percentageComplete, healthSignal, cognitiveLoad });

      const customFields: Array<{ key: string; value: unknown }> = [
        { key: 'percentage_complete', value: percentageComplete },
        { key: 'crew_health_signal', value: healthSignal },
        { key: 'cognitive_load', value: cognitiveLoad },
        { key: 'status_last_updated_by_crew', value: crewMember },
      ];
      if (blockerDiscovered) {
        customFields.push({ key: 'blocked_by', value: blockerDiscovered.blockedByRef ?? '' });
        customFields.push({ key: 'blocker_status', value: blockerDiscovered.severity === 'YELLOW' ? 'YELLOW_OVERRIDE_PENDING' : 'RED_ESCALATION' });
      }

      try {
        await aha(`features/${ref}`, {
          method: 'PUT',
          body: JSON.stringify({ feature: { custom_fields: customFields } }),
        });
      } catch (e) {
        process.stderr.write(`[AHA-AUDIT] crew_standup_update custom_fields_failed: ${e}\n`);
      }

      await postAhaCommentSafe(`features/${ref}/comments`, progressNotes);

      const memoryLogId = `${crewMember}-${ref}-standup-${today}`;
      await storeObservationMemory({
        storyId: memoryLogId,
        source: 'mcp',
        transcript: {
          storyRef: ref,
          summary: `${crewMember} standup ${today}: ${percentageComplete}% complete, health=${healthSignal}, load=${cognitiveLoad}/10${blockerDiscovered ? `. BLOCKER: ${blockerDiscovered.description}` : ''}`,
          participants: [crewMember],
          rounds: [],
          consensus: completedToday,
          decisions: decisions ?? [],
        } as any,
        tags: ['phase-3', 'daily-standup', ref, crewMember, `health-${healthSignal.toLowerCase()}`, ...(blockerDiscovered ? [`blocker-${blockerDiscovered.severity.toLowerCase()}`] : [])],
      });

      return ok({
        success: true,
        ref,
        crewMember,
        percentageComplete,
        healthSignal,
        cognitiveLoad,
        blockerEscalationRequired: !!blockerDiscovered,
        blockerSeverity: blockerDiscovered?.severity ?? null,
        memoryLogId,
        note: blockerDiscovered ? `Standup logged. Call aha_crew_blocker_escalate to notify ${blockerDiscovered.severity === 'YELLOW' ? 'Riker' : 'Admiral'}.` : 'Standup logged to Aha + crew memory.',
      });
    },
  );

  // ── PHASE 3: CREW BLOCKER ESCALATION (YELLOW→Riker / RED→Admiral) ───────────
  server.tool(
    'aha_crew_blocker_escalate',
    'Escalate a blocker discovered during story execution. YELLOW gate = Riker decides (30-min window, proceeds with defensive assumptions by default). RED gate = flags to Admiral for post-sprint review; crew proceeds with best-effort. Logs gate decision to Aha + crew memory audit trail.',
    {
      ref: z.string().describe('Aha feature reference of the blocked story'),
      crewMember: z.enum(['picard', 'data', 'riker', 'worf', 'geordi', 'obrien', 'yar', 'troi', 'crusher', 'uhura', 'quark']),
      description: z.string().describe('What is blocking progress'),
      blockedByRef: z.string().optional().describe('Aha ref of the blocking story/dependency'),
      severity: z.enum(['YELLOW', 'RED']).describe('YELLOW = Riker authority; RED = Admiral escalation'),
      recommendedAction: z.string().describe('Crew member recommended path forward'),
      rikerDecision: z.enum([
        'PROCEED_WITH_DEFENSIVE_ASSUMPTIONS',
        'PROCEED_WITH_MODIFICATIONS',
        'WAIT_FOR_BLOCKER',
        'DEFER_STORY',
      ]).optional().describe('Riker override decision (only for YELLOW gates when Riker is invoking this)'),
      confirm: z.boolean().optional().describe('true = live Aha write; false/omitted = dry-run'),
    },
    async ({ ref, crewMember, description, blockedByRef, severity, recommendedAction, rikerDecision, confirm }) => {
      const today = new Date().toISOString().split('T')[0];
      const isRikerOverride = !!rikerDecision;
      const blockerStatus = rikerDecision
        ? (rikerDecision.startsWith('PROCEED') ? 'YELLOW_OVERRIDE' : rikerDecision === 'WAIT_FOR_BLOCKER' ? 'BLOCKED_PENDING' : 'DEFERRED')
        : (severity === 'YELLOW' ? 'YELLOW_OVERRIDE_PENDING' : 'RED_ESCALATION');

      const commentBody = isRikerOverride
        ? [
            `🎯 **Riker override** — gate: ${severity}`,
            `Decision: **${rikerDecision}**`,
            `Rationale: ${recommendedAction}`,
          ].join('\n')
        : [
            `⚠️ **Blocker escalation** (${severity} gate) — ${crewMember}`,
            `Issue: ${description}`,
            blockedByRef ? `Blocked by: ${blockedByRef}` : null,
            `Recommended action: ${recommendedAction}`,
            severity === 'YELLOW' ? `**Riker: please review and decide within 30 min.**` : `**RED gate: logged for Admiral post-sprint review. Crew proceeds best-effort.**`,
          ].filter(Boolean).join('\n');

      if (!confirm) {
        return ok({ dryRun: true, ref, severity, blockerStatus, commentBody, note: 'Pass confirm:true to write to Aha + crew memory.' });
      }

      audit('crew_blocker_escalate', { ref, crewMember, severity, blockerStatus, isRikerOverride });

      const customFields: Array<{ key: string; value: unknown }> = [
        { key: 'blocker_status', value: blockerStatus },
        { key: 'status_last_updated_by_crew', value: isRikerOverride ? 'riker' : crewMember },
      ];
      if (blockedByRef) customFields.push({ key: 'blocked_by', value: blockedByRef });

      // If Riker approved proceed, restore IN_PROGRESS
      const featureUpdate: Record<string, unknown> = { custom_fields: customFields };
      if (rikerDecision?.startsWith('PROCEED')) {
        featureUpdate.workflow_status = { name: 'In development' };
      }

      try {
        await aha(`features/${ref}`, {
          method: 'PUT',
          body: JSON.stringify({ feature: featureUpdate }),
        });
      } catch (e) {
        process.stderr.write(`[AHA-AUDIT] crew_blocker_escalate custom_fields_failed: ${e}\n`);
      }

      await postAhaCommentSafe(`features/${ref}/comments`, commentBody);

      const memoryLogId = `${isRikerOverride ? 'riker' : crewMember}-${ref}-${severity.toLowerCase()}-gate-${today}`;
      await storeObservationMemory({
        storyId: memoryLogId,
        source: 'mcp',
        transcript: {
          storyRef: ref,
          summary: isRikerOverride
            ? `Riker ${severity} gate decision for ${ref}: ${rikerDecision}. ${recommendedAction}`
            : `${crewMember} escalated ${severity} blocker on ${ref}: ${description}. Recommended: ${recommendedAction}`,
          participants: isRikerOverride ? ['riker', crewMember] : [crewMember, 'riker'],
          rounds: [],
          consensus: rikerDecision ?? `${severity} gate escalation pending`,
          decisions: [description, recommendedAction],
        } as any,
        tags: [
          'phase-3', 'blocker-escalation', ref, crewMember,
          `gate-${severity.toLowerCase()}`,
          ...(rikerDecision ? [`riker-decision-${rikerDecision.toLowerCase().replace(/_/g, '-')}`] : []),
        ],
      });

      return ok({
        success: true,
        ref,
        severity,
        blockerStatus,
        isRikerOverride,
        rikerDecision: rikerDecision ?? null,
        memoryLogId,
        note: severity === 'YELLOW' && !rikerDecision
          ? 'YELLOW gate logged. Riker should call this tool again with rikerDecision to unblock.'
          : severity === 'RED'
          ? 'RED gate logged to Aha + crew memory. Admiral will review post-sprint. Crew proceeds best-effort.'
          : `${rikerDecision} logged. Story unblocked.`,
      });
    },
  );
}
