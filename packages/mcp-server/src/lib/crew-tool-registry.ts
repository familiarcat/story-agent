/**
 * Crew Tool Registry — Autonomous MCP Tool Discovery & Evaluation
 *
 * The crew can discover, evaluate, and select external MCP tools autonomously.
 * This is the "sensor array" of the Sovereign Factory starship.
 *
 * Discovery pipeline:
 * 1. Capability gap detected (crew mission debrief)
 * 2. Tool proposed for evaluation
 * 3. Worf security pre-screening (required — can block at this stage)
 * 4. Quark cost evaluation
 * 5. Crew specialist evaluation (role-matched)
 * 6. Picard final approval or mission trial
 * 7. Registration in sa_tool_registry table
 *
 * "If we're going to explore strange new worlds, we need the right tools." — Picard
 */

import { getDbClient } from '@story-agent/shared/db';
import { executePromptEngineCall } from './prompt-engine.js';
import { getCrewForTask } from './domain-registry.js';
import type { CrewId } from './crew-personas.js';

export type ToolCategory =
  | 'code-search'
  | 'documentation'
  | 'ci-cd'
  | 'security'
  | 'database'
  | 'analytics'
  | 'communication'
  | 'infrastructure'
  | 'testing'
  | 'ai-tooling'
  | 'project-management';

export type SecurityClearance = 'approved' | 'review' | 'blocked';
export type CostProfile = 'free' | 'paid' | 'self-hosted';
export type ToolStatus = 'proposed' | 'under_evaluation' | 'approved' | 'rejected' | 'deprecated';

export interface ToolRecord {
  id?: string;
  /** Unique tool name (e.g. 'github-mcp', 'supabase-mcp') */
  name: string;
  /** Human-readable description */
  description: string;
  category: ToolCategory;
  /** What this tool can do — used for capability gap matching */
  capabilities: string[];
  /** Optional MCP server endpoint */
  endpoint?: string;
  /** npm package, GitHub URL, or registry reference */
  sourceReference?: string;
  /** 0-1 quality score from crew evaluation */
  qualityScore: number;
  costProfile: CostProfile;
  securityClearance: SecurityClearance;
  status: ToolStatus;
  /** Worf's veto — if true, tool CANNOT be used regardless of other votes */
  worfVeto: boolean;
  /** Worf's veto reason if vetoed */
  worfVetoReason?: string;
  /** Per-crew votes */
  crewVotes: Partial<Record<CrewId, 'approve' | 'reject' | 'abstain'>>;
  /** Per-crew evaluation notes */
  crewEvaluationNotes: Partial<Record<CrewId, string>>;
  /** UI hints for LCARS console rendering */
  uiMetadata?: {
    icon?: string;
    color?: 'gold' | 'blue' | 'red' | 'purple';
    component?: string; // e.g. 'SecurityAuditWidget'
  };
  metadata: Record<string, unknown>;
  lastEvaluatedAt?: string;
  createdAt?: string;
}

export interface ToolEvaluationResult {
  tool: ToolRecord;
  approved: boolean;
  worfVetoed: boolean;
  crewApprovalCount: number;
  crewRejectCount: number;
  finalDecision: 'approved' | 'rejected' | 'trial' | 'pending_review';
  decisionRationale: string;
}

export interface CapabilityGap {
  description: string;
  affectedCrewIds: CrewId[];
  missionContext: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ── WORF SECURITY SCREENING ─────────────────────────────────────────────────

/**
 * Worf's security pre-screen — first gate in the evaluation pipeline.
 * If Worf vetoes, the tool is blocked regardless of other votes.
 */
async function runWorfSecurityScreen(tool: Omit<ToolRecord, 'id' | 'createdAt'>): Promise<{
  clearance: SecurityClearance;
  veto: boolean;
  vetoReason?: string;
  notes: string;
}> {
  const result = await executePromptEngineCall(
    'worf',
    {
      storyNum: 'TOOL-EVAL',
      storyName: `Security evaluation: ${tool.name}`,
      storyDescription: `Tool: ${tool.name}
Description: ${tool.description}
Category: ${tool.category}
Capabilities: ${tool.capabilities.join(', ')}
Endpoint: ${tool.endpoint ?? 'none'}
Source: ${tool.sourceReference ?? 'unknown'}
Cost Profile: ${tool.costProfile}

Evaluate this tool for security risk. Consider:
1. External network calls — data exfiltration risk
2. Controlled data leakage — does this tool touch sa_* data?
3. Policy compliance — Bayer Skyhigh enterprise policy constraints
4. Supply chain risk — is the source trustworthy?
5. Permission scope — what access does this tool require?

Respond with: CLEARANCE: approved/review/blocked, VETO: true/false, REASON: [if veto], NOTES: [findings]`,
      acceptanceCriteria: 'Security screening completed with clear verdict',
      repoFullName: 'familiarcat/story-agent',
      targetBranch: 'main',
    },
    'TOOL-EVAL',
    ['security-review']
  );

  const text = result.findings.join('\n');
  const veto = /VETO:\s*true/i.test(text);
  const clearanceMatch = text.match(/CLEARANCE:\s*(approved|review|blocked)/i);
  const clearance: SecurityClearance = veto
    ? 'blocked'
    : ((clearanceMatch?.[1]?.toLowerCase() ?? 'review') as SecurityClearance);
  const vetoReasonMatch = text.match(/REASON:\s*([^\n]+)/i);

  return {
    clearance,
    veto,
    vetoReason: veto ? (vetoReasonMatch?.[1] ?? 'Security risk identified by Worf') : undefined,
    notes: text,
  };
}

// ── QUARK COST EVALUATION ───────────────────────────────────────────────────

async function runQuarkCostEvaluation(tool: Omit<ToolRecord, 'id' | 'createdAt'>): Promise<{
  costAssessment: string;
  recommendation: string;
  notes: string;
}> {
  const result = await executePromptEngineCall(
    'quark',
    {
      storyNum: 'TOOL-EVAL',
      storyName: `Cost evaluation: ${tool.name}`,
      storyDescription: `Tool: ${tool.name}
Cost Profile: ${tool.costProfile}
Category: ${tool.category}
Capabilities: ${tool.capabilities.join(', ')}

Evaluate the cost implications of adding this tool:
1. Direct cost (free/paid/self-hosted)
2. Operational overhead (setup, maintenance)
3. Token/API cost if LLM-adjacent
4. Opportunity cost vs. alternatives
5. ROI estimate based on capability value

Respond with: ASSESSMENT: [summary], RECOMMENDATION: approve/reject/trial, NOTES: [detail]`,
      acceptanceCriteria: 'Cost evaluation completed',
      repoFullName: 'familiarcat/story-agent',
      targetBranch: 'main',
    },
    'TOOL-EVAL',
    ['cost-review']
  );

  const text = result.findings.join('\n');
  const recMatch = text.match(/RECOMMENDATION:\s*(approve|reject|trial)/i);
  const assessmentMatch = text.match(/ASSESSMENT:\s*([^\n]+)/i);

  return {
    costAssessment: assessmentMatch?.[1] ?? 'No specific cost assessment provided',
    recommendation: recMatch?.[1] ?? 'trial',
    notes: text,
  };
}

// ── SPECIALIST CREW EVALUATION ──────────────────────────────────────────────

const TOOL_EVALUATORS: Record<ToolCategory, CrewId[]> = {
  'code-search': ['data', 'geordi'],
  'documentation': ['uhura', 'crusher'],
  'ci-cd': ['geordi', 'obrien'],
  'security': ['worf', 'yar'],
  'database': ['data', 'obrien'],
  'analytics': ['data', 'quark'],
  'communication': ['uhura', 'troi'],
  'infrastructure': ['geordi', 'obrien'],
  'testing': ['yar', 'crusher'],
  'ai-tooling': ['data', 'picard'],
  'project-management': ['riker', 'troi'],
};

async function runSpecialistEvaluations(
  tool: Omit<ToolRecord, 'id' | 'createdAt'>
): Promise<Partial<Record<CrewId, { vote: 'approve' | 'reject' | 'abstain'; notes: string }>>> {
  const evaluators = TOOL_EVALUATORS[tool.category] ?? ['data'];
  const results: Partial<Record<CrewId, { vote: 'approve' | 'reject' | 'abstain'; notes: string }>> = {};

  await Promise.all(
    evaluators.map(async (crewId) => {
      const result = await executePromptEngineCall(
        crewId,
        {
          storyNum: 'TOOL-EVAL',
          storyName: `Tool evaluation: ${tool.name}`,
          storyDescription: `Tool: ${tool.name}
Category: ${tool.category}
Capabilities: ${tool.capabilities.join(', ')}
Description: ${tool.description}

From your domain perspective, evaluate this tool:
1. Does it address a real capability gap in your domain?
2. Is it the best-of-breed option for this capability?
3. Does it integrate well with existing tools?
4. What are the risks from your perspective?

Respond with: VOTE: approve/reject/abstain, NOTES: [domain-specific evaluation]`,
          acceptanceCriteria: 'Tool evaluation from domain perspective',
          repoFullName: 'familiarcat/story-agent',
          targetBranch: 'main',
        },
        'TOOL-EVAL',
        ['tool-evaluation']
      );

      const text = result.findings.join('\n');
      const voteMatch = text.match(/VOTE:\s*(approve|reject|abstain)/i);
      results[crewId] = {
        vote: (voteMatch?.[1]?.toLowerCase() as 'approve' | 'reject' | 'abstain') ?? 'abstain',
        notes: text,
      };
    })
  );

  return results;
}

// ── PICARD FINAL APPROVAL ───────────────────────────────────────────────────

async function runPicardFinalApproval(
  tool: Omit<ToolRecord, 'id' | 'createdAt'>,
  worfResult: Awaited<ReturnType<typeof runWorfSecurityScreen>>,
  quarkResult: Awaited<ReturnType<typeof runQuarkCostEvaluation>>,
  specialistResults: Awaited<ReturnType<typeof runSpecialistEvaluations>>
): Promise<{ decision: 'approved' | 'rejected' | 'trial'; rationale: string }> {
  const approvals = Object.values(specialistResults).filter(r => r?.vote === 'approve').length;
  const rejections = Object.values(specialistResults).filter(r => r?.vote === 'reject').length;

  const result = await executePromptEngineCall(
    'picard',
    {
      storyNum: 'TOOL-EVAL',
      storyName: `Command review: ${tool.name}`,
      storyDescription: `Final command review for tool: ${tool.name}

WORF SECURITY SCREEN:
- Clearance: ${worfResult.clearance}
- Veto: ${worfResult.veto}
- Notes: ${worfResult.notes.substring(0, 500)}

QUARK COST EVALUATION:
- Assessment: ${quarkResult.costAssessment}
- Recommendation: ${quarkResult.recommendation}

SPECIALIST EVALUATIONS:
- Approvals: ${approvals}
- Rejections: ${rejections}
- Details: ${JSON.stringify(specialistResults).substring(0, 500)}

Make the final decision: approve (add to registry), trial (limited use), or reject (do not add).
Respond with: DECISION: approved/rejected/trial, RATIONALE: [reasoning]`,
      acceptanceCriteria: 'Final command decision on tool adoption',
      repoFullName: 'familiarcat/story-agent',
      targetBranch: 'main',
    },
    'TOOL-EVAL',
    ['command-review']
  );

  const text = result.findings.join('\n');
  const decisionMatch = text.match(/DECISION:\s*(approved|rejected|trial)/i);
  const rationaleMatch = text.match(/RATIONALE:\s*([^\n]+)/i);

  return {
    decision: (decisionMatch?.[1]?.toLowerCase() as 'approved' | 'rejected' | 'trial') ?? 'trial',
    rationale: rationaleMatch?.[1] ?? 'Command decision pending full review',
  };
}

// ── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Submit a tool for full crew evaluation.
 * Runs Worf security screen → Quark cost eval → specialist eval → Picard approval.
 * Persists the result in sa_tool_registry.
 */
export async function submitToolForEvaluation(
  proposal: Omit<ToolRecord, 'id' | 'qualityScore' | 'crewVotes' | 'crewEvaluationNotes' | 'worfVeto' | 'securityClearance' | 'status' | 'lastEvaluatedAt' | 'createdAt'>
): Promise<ToolEvaluationResult> {
  // Step 1: Worf security screen (blocks everything else if vetoed)
  const worfResult = await runWorfSecurityScreen(proposal as ToolRecord);

  if (worfResult.veto) {
    const blockedTool: ToolRecord = {
      ...proposal,
      qualityScore: 0,
      securityClearance: 'blocked',
      status: 'rejected',
      worfVeto: true,
      worfVetoReason: worfResult.vetoReason,
      crewVotes: { worf: 'reject' },
      crewEvaluationNotes: { worf: worfResult.notes },
    };

    await persistToolRecord(blockedTool);

    return {
      tool: blockedTool,
      approved: false,
      worfVetoed: true,
      crewApprovalCount: 0,
      crewRejectCount: 1,
      finalDecision: 'rejected',
      decisionRationale: `WORF VETO: ${worfResult.vetoReason ?? 'Security risk identified'}`,
    };
  }

  // Step 2: Quark cost evaluation
  const quarkResult = await runQuarkCostEvaluation(proposal as ToolRecord);

  // Step 3: Specialist evaluations (parallel)
  const specialistResults = await runSpecialistEvaluations(proposal as ToolRecord);

  // Step 4: Picard final approval
  const picardResult = await runPicardFinalApproval(
    proposal as ToolRecord,
    worfResult,
    quarkResult,
    specialistResults
  );

  const crewVotes: Partial<Record<CrewId, 'approve' | 'reject' | 'abstain'>> = {
    worf: 'approve', // passed security screen
    quark: quarkResult.recommendation === 'reject' ? 'reject' : 'approve',
    picard: picardResult.decision === 'rejected' ? 'reject' : 'approve',
  };
  const crewNotes: Partial<Record<CrewId, string>> = {
    worf: worfResult.notes,
    quark: quarkResult.notes,
    picard: picardResult.rationale,
  };

  for (const [crewId, result] of Object.entries(specialistResults)) {
    crewVotes[crewId as CrewId] = result?.vote ?? 'abstain';
    crewNotes[crewId as CrewId] = result?.notes ?? '';
  }

  const approvalCount = Object.values(crewVotes).filter(v => v === 'approve').length;
  const rejectCount = Object.values(crewVotes).filter(v => v === 'reject').length;
  const qualityScore = approvalCount / (approvalCount + rejectCount + 0.001);

  const evaluatedTool: ToolRecord = {
    ...proposal,
    qualityScore,
    securityClearance: worfResult.clearance,
    status: picardResult.decision === 'approved' ? 'approved'
      : picardResult.decision === 'trial' ? 'proposed'
      : 'rejected',
    worfVeto: false,
    crewVotes,
    crewEvaluationNotes: crewNotes,
    lastEvaluatedAt: new Date().toISOString(),
  };

  await persistToolRecord(evaluatedTool);

  return {
    tool: evaluatedTool,
    approved: picardResult.decision === 'approved',
    worfVetoed: false,
    crewApprovalCount: approvalCount,
    crewRejectCount: rejectCount,
    finalDecision: picardResult.decision,
    decisionRationale: picardResult.rationale,
  };
}

async function persistToolRecord(tool: ToolRecord): Promise<void> {
  try {
    const db = await getDbClient();
    await db.from('sa_tool_registry').upsert({
      name: tool.name,
      description: tool.description,
      category: tool.category,
      capabilities: tool.capabilities,
      endpoint: tool.endpoint ?? null,
      source_reference: tool.sourceReference ?? null,
      quality_score: tool.qualityScore,
      cost_profile: tool.costProfile,
      security_clearance: tool.securityClearance,
      status: tool.status,
      worf_veto: tool.worfVeto,
      worf_veto_reason: tool.worfVetoReason ?? null,
      crew_votes: tool.crewVotes,
      crew_evaluation_notes: tool.crewEvaluationNotes,
      metadata: tool.metadata,
      last_evaluated_at: tool.lastEvaluatedAt ?? new Date().toISOString(),
    }, { onConflict: 'name' });
  } catch (err) {
    console.error('[crew-tool-registry] Failed to persist tool record:', err);
  }
}

/**
 * Get all approved tools for a specific crew member (filtered by their role).
 * Supports "Support Officer Elevation" if a storyId is provided for a high-priority mission.
 */
export async function getApprovedToolsForCrew(crewId: CrewId, storyId?: string): Promise<ToolRecord[]> {
  try {
    const db = await getDbClient();
    const { data: allTools, error } = await db
      .from('sa_tool_registry')
      .select('*')
      .eq('status', 'approved')
      .eq('worf_veto', false);

    if (error || !allTools) return [];

    const relevantCategories = new Set<ToolCategory>();
    
    // 1. Add categories for the member's primary/secondary domains
    Object.entries(TOOL_EVALUATORS).forEach(([cat, evaluators]) => {
      if (evaluators.includes(crewId)) {
        relevantCategories.add(cat as ToolCategory);
      }
    });

    // 2. Support Officer Elevation: If this is a high-priority mission and we are supporting, 
    // gain access to the Lead's tool categories.
    if (storyId) {
      const { data: story } = await db.from('stories').select('tags, status').eq('story_id', storyId).single();
      if (story && story.status !== 'merged') {
        const routing = getCrewForTask(story.tags || []);
        const isSupport = routing.some(r => r.crewId === crewId && !r.domains.some((d: { domainId: string; expertise: string }) => d.expertise === 'primary'));
        
        if (isSupport) {
          // Identify categories of the primary lead to share them with the support console
          const leadId = routing.find(r => r.domains.some((d: { domainId: string; expertise: string }) => d.expertise === 'primary'))?.crewId;
          if (leadId) {
            Object.entries(TOOL_EVALUATORS).forEach(([cat, evaluators]) => {
              if (evaluators.includes(leadId as CrewId)) {
                relevantCategories.add(cat as ToolCategory);
              }
            });
          }
        }
      }
    }

    return (allTools as Record<string, unknown>[])
      .filter((t) => relevantCategories.has(t['category'] as ToolCategory))
      .map((t) => ({
        id: t['id'] as string,
        name: t['name'] as string,
        description: t['description'] as string,
        category: t['category'] as ToolCategory,
        capabilities: (t['capabilities'] as string[]) ?? [],
        endpoint: t['endpoint'] as string | undefined,
        sourceReference: t['source_reference'] as string | undefined,
        qualityScore: t['quality_score'] as number,
        costProfile: t['cost_profile'] as CostProfile,
        securityClearance: t['security_clearance'] as SecurityClearance,
        status: t['status'] as ToolStatus,
        worfVeto: t['worf_veto'] as boolean,
        worfVetoReason: t['worf_veto_reason'] as string | undefined,
        crewVotes: (t['crew_votes'] as ToolRecord['crewVotes']) ?? {},
        crewEvaluationNotes: (t['crew_evaluation_notes'] as ToolRecord['crewEvaluationNotes']) ?? {},
        uiMetadata: (t['ui_metadata'] as ToolRecord['uiMetadata']) ?? { icon: 'default', color: 'gold' },
        metadata: (t['metadata'] as Record<string, unknown>) ?? {},
        lastEvaluatedAt: t['last_evaluated_at'] as string | undefined,
        createdAt: t['created_at'] as string | undefined,
      }));
  } catch {
    return [];
  }
}

/**
 * List all tools in the registry with their current status.
 */
export async function listToolRegistry(): Promise<ToolRecord[]> {
  try {
    const db = await getDbClient();
    const { data, error } = await db
      .from('sa_tool_registry')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return (data as Record<string, unknown>[]).map((t) => ({
      id: t['id'] as string,
      name: t['name'] as string,
      description: t['description'] as string,
      category: t['category'] as ToolCategory,
      capabilities: (t['capabilities'] as string[]) ?? [],
      endpoint: t['endpoint'] as string | undefined,
      sourceReference: t['source_reference'] as string | undefined,
      qualityScore: t['quality_score'] as number,
      costProfile: t['cost_profile'] as CostProfile,
      securityClearance: t['security_clearance'] as SecurityClearance,
      status: t['status'] as ToolStatus,
      worfVeto: t['worf_veto'] as boolean,
      worfVetoReason: t['worf_veto_reason'] as string | undefined,
      crewVotes: (t['crew_votes'] as ToolRecord['crewVotes']) ?? {},
      crewEvaluationNotes: (t['crew_evaluation_notes'] as ToolRecord['crewEvaluationNotes']) ?? {},
      metadata: (t['metadata'] as Record<string, unknown>) ?? {},
      lastEvaluatedAt: t['last_evaluated_at'] as string | undefined,
      createdAt: t['created_at'] as string | undefined,
    }));
  } catch {
    return [];
  }
}
