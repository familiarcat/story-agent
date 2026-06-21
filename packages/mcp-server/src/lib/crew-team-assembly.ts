/**
 * Dynamic team assembly + model optimization — the PRIMARY LLM selection path.
 *
 * Anthropic is one provider in the pool, NOT the default. For any issue:
 *   1. RIKER assembles the team — which crew members (by skill/tool/domain) are needed, and the
 *      capability tier each requires.
 *   2. QUARK optimizes cost — assigns each member the CHEAPEST model in the pool that meets their
 *      required capability tier (cheaper non-Anthropic models win for low/standard tiers).
 *
 * Result: most work runs on inexpensive models; Anthropic (haiku/sonnet) is reserved for the
 * advanced/frontier tiers where capability actually warrants it.
 */

export type Provider = 'Meta' | 'DeepSeek' | 'OpenAI' | 'Anthropic';

export interface PoolModel {
  id: string;        // OpenRouter slug (all verified reachable on the crew key)
  provider: Provider;
  tier: 1 | 2 | 3 | 4; // 1 basic · 2 standard · 3 advanced · 4 frontier
  costIn: number;    // USD / 1M input tokens (approx)
  costOut: number;   // USD / 1M output tokens (approx)
}

// Verified-available models, cost-ranked. Quark picks from here — Anthropic is not privileged.
export const MODEL_POOL: PoolModel[] = [
  { id: 'meta-llama/llama-3.3-70b-instruct', provider: 'Meta', tier: 2, costIn: 0.12, costOut: 0.30 },
  { id: 'openai/gpt-4o-mini', provider: 'OpenAI', tier: 2, costIn: 0.15, costOut: 0.60 },
  { id: 'deepseek/deepseek-chat', provider: 'DeepSeek', tier: 3, costIn: 0.25, costOut: 0.85 },
  { id: 'anthropic/claude-haiku-4.5', provider: 'Anthropic', tier: 3, costIn: 1.0, costOut: 5.0 },
  { id: 'anthropic/claude-sonnet-4.6', provider: 'Anthropic', tier: 4, costIn: 3.0, costOut: 15.0 },
];

const blended = (m: PoolModel) => m.costIn + m.costOut; // simple cost proxy for ranking

/** QUARK: cheapest model in the pool meeting (>=) the required capability tier. */
export function quarkSelectModel(capabilityTier: number): PoolModel {
  const eligible = MODEL_POOL.filter(m => m.tier >= capabilityTier).sort((a, b) => blended(a) - blended(b));
  return eligible[0] ?? MODEL_POOL.slice().sort((a, b) => b.tier - a.tier)[0];
}

// ── RIKER: team assembly by skill/tool/domain ────────────────────────────────

interface CrewDomainSpec { crewId: string; domain: string; baseTier: 1 | 2 | 3 | 4; keywords: string[]; }

// Base capability per domain (criticality of the role's judgment), + keywords that pull a member in.
const CREW: CrewDomainSpec[] = [
  { crewId: 'picard', domain: 'command', baseTier: 3, keywords: ['decision', 'strategy', 'arbitrate', 'approve', 'priorit', 'roadmap'] },
  { crewId: 'data', domain: 'architecture', baseTier: 4, keywords: ['architect', 'schema', 'design', 'data model', 'structure', 'refactor', 'migration', 'consistency'] },
  { crewId: 'worf', domain: 'security', baseTier: 4, keywords: ['security', 'auth', 'permission', 'privilege', 'rls', 'secret', 'vuln', 'access', 'token'] },
  { crewId: 'riker', domain: 'implementation', baseTier: 3, keywords: ['implement', 'build', 'feature', 'code', 'develop', 'execute'] },
  { crewId: 'geordi', domain: 'infrastructure', baseTier: 3, keywords: ['infra', 'deploy', 'fargate', 'terraform', 'docker', 'aws', 'pipeline', 'container'] },
  { crewId: 'obrien', domain: 'devops', baseTier: 2, keywords: ['ops', 'ci', 'cd', 'release', 'rollout', 'sync', 'runbook'] },
  { crewId: 'yar', domain: 'quality', baseTier: 3, keywords: ['test', 'quality', 'acceptance', 'verify', 'coverage', 'qa'] },
  { crewId: 'troi', domain: 'stakeholder', baseTier: 2, keywords: ['stakeholder', 'ux', 'user', 'experience', 'human', 'client need'] },
  { crewId: 'crusher', domain: 'health', baseTier: 2, keywords: ['health', 'monitor', 'stale', 'incident', 'reliab'] },
  { crewId: 'uhura', domain: 'communications', baseTier: 2, keywords: ['summar', 'report', 'communicat', 'notify', 'doc'] },
  { crewId: 'quark', domain: 'finance', baseTier: 2, keywords: ['cost', 'budget', 'value', 'roi', 'optimi', 'spend'] },
];

const COMPLEX = ['architect', 'security', 'refactor', 'migration', 'privilege', 'multi-client', 'design', 'concurrency', 'critical'];

/** Base capability tier for a crew member's domain (judgment criticality of the role). */
export function crewBaseTier(crewId: string): 1 | 2 | 3 | 4 {
  return CREW.find(c => c.crewId === crewId)?.baseTier ?? 2;
}

export interface TeamMember { crewId: string; domain: string; capabilityTier: number; model: string; provider: Provider; reason: string; }
export interface TeamPlan { issue: string; complex: boolean; team: TeamMember[]; estCostNote: string; providerMix: Record<string, number>; }

/**
 * RIKER assembles a team for the issue (skill/tool match), then QUARK optimizes the model per member.
 * Picard is always included to arbitrate; specialists join when the issue touches their domain.
 */
export function assembleAndOptimize(issue: string): TeamPlan {
  const text = issue.toLowerCase();
  const complex = COMPLEX.some(k => text.includes(k)) || issue.length > 400;

  // Riker: select members whose domain keywords match, always include picard.
  const selected = CREW.filter(c => c.crewId === 'picard' || c.keywords.some(k => text.includes(k)));
  // Fallback: if only picard matched, add the implementation + architecture core.
  if (selected.length <= 1) selected.push(...CREW.filter(c => ['data', 'riker'].includes(c.crewId)));

  const providerMix: Record<string, number> = {};
  const team: TeamMember[] = selected.map(c => {
    const capabilityTier = Math.min(4, c.baseTier + (complex ? 1 : 0));
    const m = quarkSelectModel(capabilityTier);
    providerMix[m.provider] = (providerMix[m.provider] ?? 0) + 1;
    return {
      crewId: c.crewId, domain: c.domain, capabilityTier,
      model: m.id, provider: m.provider,
      reason: `tier ${capabilityTier} need → cheapest eligible (${m.provider}, ~$${(m.costIn + m.costOut).toFixed(2)}/Mtok)`,
    };
  });

  return {
    issue, complex, team,
    providerMix,
    estCostNote: `Quark cost-optimized ${team.length} members across ${Object.keys(providerMix).length} providers; Anthropic used for ${providerMix['Anthropic'] ?? 0}/${team.length} (advanced/frontier only).`,
  };
}
