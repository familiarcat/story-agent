/**
 * Aha! auto-mode classification system — the crew's self-governance layer for Aha! actions.
 *
 * Designed by the crew (Worf policy, Data schema, Quark risk heuristic, Picard synthesis;
 * stored to RAG tag `auto-mode-classifier`). Mirrors a harness auto-mode classifier but for the
 * crew's Aha! operations: every action is classified AUTO | CONFIRM | BLOCK so the crew can act
 * autonomously where it's safe and escalate where it isn't.
 *
 *   AUTO    — reversible + low-blast (reads; draft creates; low-sensitivity draft updates).
 *   CONFIRM — irreversible / cross-resource / stakeholder-visible (goals, published, status/date, bulk).
 *   BLOCK   — destructive (delete) or outside the Aha! permission boundary (e.g. idea_organizations=403).
 *
 * "Injected" into the Aha! write tools: AUTO executes without confirm; CONFIRM requires confirm:true;
 * BLOCK is refused. All paths still record to the crew's own RAG audit (Aha! exposes no audit API).
 */

export type AhaDecision = 'auto' | 'confirm' | 'block';

export interface AhaAction {
  verb: 'read' | 'create' | 'update' | 'delete' | 'bulk';
  resource: string;                 // feature | epic | release | goal | idea_organization | ...
  scope?: 'single' | 'batch';
  batchSize?: number;
  fieldsMutated?: string[];
  publishedState?: 'draft' | 'published';
  stakeholderVisible?: boolean;
  agentId?: string;
  clientTier?: 'regulated' | 'enterprise' | 'standard';
}

// Resources outside the API permission boundary (observed 403 on the live tier).
const FORBIDDEN_RESOURCES = new Set(['idea_organization', 'idea_organizations']);
// Fields whose change has stakeholder/roadmap impact → always escalate.
const SENSITIVE_FIELDS = new Set(['status', 'release_date', 'workflow_status', 'workflowStatus']);

export interface AhaClassification { decision: AhaDecision; reason: string; rule: string; }

/** Classify one Aha! action into auto / confirm / block (default-deny → confirm). */
export function classifyAhaAction(a: AhaAction): AhaClassification {
  // BLOCK — destructive or permission-edge
  if (a.verb === 'delete') return { decision: 'block', rule: 'destructive', reason: 'Delete is irreversible — requires explicit human action, never auto.' };
  if (FORBIDDEN_RESOURCES.has(a.resource)) return { decision: 'block', rule: 'permission-boundary', reason: `Resource '${a.resource}' is outside the Aha! permission boundary (403).` };

  // AUTO — idempotent reads
  if (a.verb === 'read') return { decision: 'auto', rule: 'idempotent-read', reason: 'Read is idempotent and permission-enforced by Aha!; audited to RAG.' };

  // CONFIRM — regulated client tier hardens all writes
  if (a.clientTier === 'regulated') return { decision: 'confirm', rule: 'regulated-tier', reason: 'Regulated client — every write requires confirmation.' };

  // CONFIRM — bulk / high blast radius
  if (a.verb === 'bulk' || a.scope === 'batch' || (a.batchSize ?? 1) > 1)
    return { decision: 'confirm', rule: 'high-blast-radius', reason: 'Bulk/batch write affects multiple records.' };

  if (a.verb === 'create') {
    if (a.resource === 'goal' || a.publishedState === 'published')
      return { decision: 'confirm', rule: 'business-commitment', reason: 'Goal or published create = stakeholder-visible business commitment.' };
    return { decision: 'auto', rule: 'reversible-draft-create', reason: 'Draft, non-goal create — reversible via edit/delete.' };
  }

  if (a.verb === 'update') {
    const touchesSensitive = (a.fieldsMutated ?? []).some(f => SENSITIVE_FIELDS.has(f));
    if (a.stakeholderVisible || touchesSensitive)
      return { decision: 'confirm', rule: 'stakeholder-visible', reason: 'Stakeholder-visible record or status/release-date change.' };
    return { decision: 'auto', rule: 'low-blast-update', reason: 'Low-blast update on a non-visible record, non-sensitive fields.' };
  }

  return { decision: 'confirm', rule: 'default-deny', reason: 'Unclassified action — default to confirmation.' };
}

/**
 * Resolve whether a write may proceed: combine the auto-mode classification with an explicit
 * confirm flag. AUTO → proceed; CONFIRM → proceed only if confirm:true; BLOCK → never.
 */
export function gateAhaWrite(a: AhaAction, confirm: boolean | undefined): { proceed: boolean; classification: AhaClassification } {
  const classification = classifyAhaAction(a);
  const proceed = classification.decision === 'auto' || (classification.decision === 'confirm' && confirm === true);
  return { proceed, classification };
}
