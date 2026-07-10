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
// cross-surface sync ledger (AHA-SYNC-TIERS)
import { emitAhaEventSafe } from '@story-agent/shared/aha-events';
import { executeAhaStoryWithMemory } from '../lib/crew-aha-mission.js';
import { getRelevantObservationMemories, getRecentObservationMemories } from '@story-agent/shared/db';
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
      epic: z.string().optional().describe('Optional epic reference (e.g. JONAH-E-1) to link the story under — sets both the epic and the sprint in one call.'),
      confirm: z.boolean().optional().describe('true to execute (human-approved, or automated after agent verification)'),
    },
    async ({ agentId, releaseId, name, description, epic, confirm }) => {
      const authz = authorizeAhaWrite(agentId, 'aha:create-feature');
      if (!authz.authorized) return ok({ rejected: true, reason: authz.reason });
      // Auto-mode classification (crew governance): a draft feature create is AUTO.
      const { proceed, classification } = gateAhaWrite({ verb: 'create', resource: 'feature', publishedState: 'draft', agentId }, confirm);
      if (classification.decision === 'block') return ok({ blocked: true, agent: agentId, classification });
      if (!proceed) return ok({ dryRun: true, agent: agentId, identity: authz.reason, classification, wouldCreate: { releaseId, name, description, epic }, note: `auto-mode=${classification.decision}: re-call with confirm:true to execute.` });
      audit('create-feature', { agentId, releaseId, name, epic, decision: classification.decision });
      const feature: Record<string, unknown> = { name, description };
      if (epic) feature.epic = epic;  // Aha links both the epic and the sprint from the release-scoped create.
      const res = await aha(`releases/${releaseId}/features`, { method: 'POST', body: JSON.stringify({ feature }) });
      void emitAhaEventSafe({ actor: 'mcp', resourceType: 'story', operation: 'created', resourceId: String(res.feature?.reference_num ?? res.feature?.id ?? ''), meta: { sprint_id: releaseId } });
      return ok({ created: res.feature?.reference_num, name: res.feature?.name, by: agentId, autoMode: classification });
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
      const feature: Record<string, unknown> = {};
      if (name) feature.name = name;
      if (description) feature.description = description;
      if (workflowStatus) feature.workflow_status = workflowStatus;
      // Auto-mode: status changes are stakeholder-sensitive → CONFIRM; plain field edits → AUTO.
      const { proceed, classification } = gateAhaWrite({ verb: 'update', resource: 'feature', fieldsMutated: Object.keys(feature), agentId }, confirm);
      if (classification.decision === 'block') return ok({ blocked: true, agent: agentId, classification });
      if (!proceed) return ok({ dryRun: true, agent: agentId, identity: authz.reason, classification, reference, wouldUpdate: feature, note: `auto-mode=${classification.decision}: re-call with confirm:true to execute.` });
      audit('update-feature', { agentId, reference, fields: Object.keys(feature), decision: classification.decision });
      const res = await aha(`features/${reference}`, { method: 'PUT', body: JSON.stringify({ feature }) });
      void emitAhaEventSafe({ actor: 'mcp', resourceType: 'story', operation: workflowStatus ? 'status_changed' : 'updated', resourceId: reference, meta: workflowStatus ? { status_to: workflowStatus } : undefined });
      return ok({ updated: res.feature?.reference_num, status: res.feature?.workflow_status?.name, by: agentId, autoMode: classification });
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
      const { proceed, classification } = gateAhaWrite({ verb: 'create', resource: 'requirement', publishedState: 'draft', agentId }, confirm);
      if (classification.decision === 'block') return ok({ blocked: true, agent: agentId, classification });
      if (!proceed) return ok({ dryRun: true, agent: agentId, identity: authz.reason, classification, wouldCreate: { featureRef, name, description }, note: `auto-mode=${classification.decision}: re-call with confirm:true to execute.` });
      audit('create-requirement', { agentId, featureRef, name, decision: classification.decision });
      const res = await aha(`features/${featureRef}/requirements`, { method: 'POST', body: JSON.stringify({ requirement: { name, description } }) });
      void emitAhaEventSafe({ actor: 'mcp', resourceType: 'requirement', operation: 'created', resourceId: String(res.requirement?.reference_num ?? res.requirement?.id ?? '') });
      return ok({ created: res.requirement?.reference_num, id: res.requirement?.id, name: res.requirement?.name, by: agentId, autoMode: classification });
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
      confirm: z.boolean().optional(),
    },
    async ({ agentId, reference, name, description, confirm }) => {
      const authz = authorizeAhaWrite(agentId, 'aha:update-requirement');
      if (!authz.authorized) return ok({ rejected: true, reason: authz.reason });
      const requirement: Record<string, unknown> = {};
      if (name) requirement.name = name;
      if (description) requirement.description = description;
      const { proceed, classification } = gateAhaWrite({ verb: 'update', resource: 'requirement', fieldsMutated: Object.keys(requirement), agentId }, confirm);
      if (classification.decision === 'block') return ok({ blocked: true, agent: agentId, classification });
      if (!proceed) return ok({ dryRun: true, agent: agentId, identity: authz.reason, classification, reference, wouldUpdate: requirement, note: `auto-mode=${classification.decision}: re-call with confirm:true to execute.` });
      audit('update-requirement', { agentId, reference, fields: Object.keys(requirement), decision: classification.decision });
      const res = await aha(`requirements/${reference}`, { method: 'PUT', body: JSON.stringify({ requirement }) });
      void emitAhaEventSafe({ actor: 'mcp', resourceType: 'requirement', operation: 'updated', resourceId: reference });
      return ok({ updated: res.requirement?.reference_num, name: res.requirement?.name, by: agentId, autoMode: classification });
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
}
