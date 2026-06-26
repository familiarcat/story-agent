/**
 * Delegation Router — a reusable, deterministic complexity/cost scorer for AI orchestration.
 *
 * Decides whether a given prompt should be handled NATIVELY by the expensive orchestrator model
 * (e.g. Claude Code / Anthropic) or DELEGATED to a cheaper substantive worker (e.g. the OpenRouter
 * crew). It is PURE and dependency-free on purpose: it imports nothing from this monorepo so it can
 * be lifted into any other AI project as a standalone routing algorithm.
 *
 * The whole point of the cost program: keep the orchestrator THIN. Every prompt that can be answered
 * adequately by a cheap model should be — the orchestrator only spends its premium tokens on the
 * prompts that genuinely need them (safety, low-confidence, tightly-coupled native tool use).
 *
 * Output is a structured decision (route + tier + cost estimate + confidence + reason) so callers
 * (a Claude Code hook, a CLI, another agent) can act on it and LOG it for verified-savings audit.
 */

export type Route = 'native' | 'delegate';
/** How the delegated work should run: a crew deliberation, or the agentic tool-calling loop. */
export type DelegateMode = 'deliberate' | 'agent';

export interface TokenRate {
  /** USD per 1M input tokens. */ in: number;
  /** USD per 1M output tokens. */ out: number;
}

export interface DelegationOptions {
  /** Complexity at/above which we delegate (0..1). Default 0.45. */
  threshold?: number;
  /** Premium orchestrator rate (what a native answer costs). Default frontier-class $3/$15. */
  nativeRate?: TokenRate;
  /** Cheap worker rate (what a delegated answer costs). Default tier-3 deepseek $0.25/$0.85. */
  delegateRate?: TokenRate;
  /** Extra keywords that force NATIVE handling (safety / judgement). Merged with defaults. */
  nativeOnlyKeywords?: string[];
}

export interface DelegationDecision {
  route: Route;
  /** Set only when route === 'delegate'. */
  mode: DelegateMode | null;
  /** Suggested capability tier (2..4) for the worker; delegation is frugal-capped at 3. */
  tier: 2 | 3 | 4;
  /** 0..1 complexity score that drove the decision. */
  complexity: number;
  /** 0..1 confidence in this routing decision (distance from the threshold + signal strength). */
  confidence: number;
  estCostNativeUSD: number;
  estCostDelegateUSD: number;
  /** estCostNative - estCostDelegate (USD saved by delegating; negative ⇒ delegation not worth it). */
  savingsUSD: number;
  reason: string;
  signals: {
    estTokens: number;
    reasoning: boolean;
    agentic: boolean;
    trivial: boolean;
    safetyGated: boolean;
  };
}

const DEFAULT_NATIVE_RATE: TokenRate = { in: 3, out: 15 }; // frontier-class (Sonnet/Opus order of magnitude)
const DEFAULT_DELEGATE_RATE: TokenRate = { in: 0.25, out: 0.85 }; // tier-3 deepseek

// Deliberation/design/analysis → crew mission pipeline is the right cheap worker.
const REASONING = ['analy', 'compar', 'why', 'design', 'plan', 'deliberat', 'decide', 'decision',
  'evaluat', 'recommend', 'investigat', 'strateg', 'architect', 'trade-off', 'tradeoff', 'options',
  'approach', 'should we', 'what does the crew', 'review', 'summar', 'explain'];
// Multi-step read/edit/run → the agentic /agent loop is the right cheap worker.
const AGENTIC = ['refactor', 'migrat', 'implement', 'rename', 'across the', 'every file', 'all files',
  'add a', 'build a', 'wire up', 'scaffold', 'generate', 'rewrite', 'convert', 'port '];
// Cheap, tightly-scoped, or conversational → keep native (delegation overhead isn't worth it).
const TRIVIAL = ['quick', 'just ', 'typo', 'one-liner', 'one liner', 'format', 'what is', "what's",
  'tiny', 'small fix', 'rename this', 'thanks', 'continue', 'yes', 'no', 'ok', 'stop'];
// Safety / high-judgement → never silently delegate (Worf + Yar gate).
const NATIVE_ONLY = ['secret', 'credential', 'password', 'token', 'delete production', 'drop table',
  'force push', 'rm -rf', 'production database', 'security review', 'rotate key', 'private key'];

const hit = (text: string, words: string[]) => words.some((w) => text.includes(w));
/** Rough token estimate (≈ 4 chars/token) — good enough for routing cost math. */
const estimateTokens = (s: string) => Math.ceil(s.length / 4);

/**
 * Score a prompt and decide native vs delegate. Deterministic: same input ⇒ same output.
 */
export function scoreDelegation(prompt: string, opts: DelegationOptions = {}): DelegationDecision {
  const threshold = opts.threshold ?? 0.45;
  const nativeRate = opts.nativeRate ?? DEFAULT_NATIVE_RATE;
  const delegateRate = opts.delegateRate ?? DEFAULT_DELEGATE_RATE;
  const nativeOnly = [...NATIVE_ONLY, ...(opts.nativeOnlyKeywords ?? [])];

  const text = prompt.toLowerCase();
  const promptTokens = estimateTokens(prompt);

  const reasoning = hit(text, REASONING);
  const agentic = hit(text, AGENTIC);
  const trivial = hit(text, TRIVIAL) || promptTokens < 12;
  const safetyGated = hit(text, nativeOnly);

  // Complexity 0..1: length (normalized to ~600 tokens), plus signal weights.
  const lengthScore = Math.min(1, promptTokens / 600);
  // A single strong signal (reasoning OR agentic) should be decisive on its own; length nudges.
  let complexity = 0.3 * lengthScore + (reasoning ? 0.5 : 0) + (agentic ? 0.5 : 0);
  if (trivial) complexity *= 0.4; // trivial language strongly pulls toward native
  complexity = Math.max(0, Math.min(1, complexity));

  // Cost estimate. Output size scales with the kind of work; orchestration overhead is the thin
  // native cost we still pay when we delegate (relaying + verifying the worker's result).
  const tokensOut = agentic ? 1800 : reasoning ? 1400 : 700;
  const tokensInNative = promptTokens + 600; // + system/context the orchestrator would load
  const estCostNativeUSD = (tokensInNative / 1e6) * nativeRate.in + (tokensOut / 1e6) * nativeRate.out;
  const orchestrationOverheadUSD = (300 / 1e6) * nativeRate.in + (250 / 1e6) * nativeRate.out;
  const estCostDelegateUSD =
    (tokensInNative / 1e6) * delegateRate.in + (tokensOut / 1e6) * delegateRate.out + orchestrationOverheadUSD;
  const savingsUSD = Number((estCostNativeUSD - estCostDelegateUSD).toFixed(6));

  const tier: 2 | 3 | 4 = safetyGated ? 4 : 3; // delegation is frugal-capped at tier-3
  const mode: DelegateMode | null = agentic ? 'agent' : reasoning ? 'deliberate' : null;

  let route: Route;
  let reason: string;
  if (safetyGated) {
    route = 'native';
    reason = 'safety/high-judgement signal — keep native (no silent delegation).';
  } else if (complexity >= threshold && savingsUSD > 0 && mode) {
    route = 'delegate';
    reason = `complexity ${complexity.toFixed(2)} ≥ ${threshold} (${mode}); est. savings $${savingsUSD.toFixed(4)}.`;
  } else {
    route = 'native';
    reason =
      complexity < threshold
        ? `complexity ${complexity.toFixed(2)} < ${threshold} — too light to be worth delegating.`
        : 'no clear delegate-mode / non-positive savings — keep native.';
  }

  // Confidence: how far we are from the threshold, lifted by an explicit safety gate.
  const margin = Math.abs(complexity - threshold);
  const confidence = Number(Math.min(1, (safetyGated ? 0.9 : 0.5) + margin).toFixed(2));

  return {
    route,
    mode: route === 'delegate' ? mode : null,
    tier,
    complexity: Number(complexity.toFixed(2)),
    confidence,
    estCostNativeUSD: Number(estCostNativeUSD.toFixed(6)),
    estCostDelegateUSD: Number(estCostDelegateUSD.toFixed(6)),
    savingsUSD,
    reason,
    signals: { estTokens: promptTokens, reasoning, agentic, trivial, safetyGated },
  };
}
