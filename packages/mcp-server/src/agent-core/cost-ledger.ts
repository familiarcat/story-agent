/**
 * Cost Observatory ledger — an in-memory record of every LLM turn (chat + agent) with the model
 * Quark selected, provider, and USD cost. Powers the /cost endpoint so the savings from cost-optimized
 * routing (OpenRouter pool vs an Anthropic-frontier baseline) are visible. Resets on restart.
 */

export interface CostEntry {
  timestamp: string;
  surface: 'chat' | 'agent';
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  costUSD: number;
}

const LEDGER: CostEntry[] = [];
const MAX = 2000;

// Anthropic frontier baseline (USD per 1M tokens) — what the same tokens would cost if every turn
// used a top model instead of Quark's cheapest-adequate pick. Used only to estimate savings.
const BASELINE_IN = 3.0;   // claude-sonnet-4.6 input
const BASELINE_OUT = 15.0; // claude-sonnet-4.6 output

export function recordCost(e: CostEntry): void {
  LEDGER.push(e);
  if (LEDGER.length > MAX) LEDGER.splice(0, LEDGER.length - MAX);
}

export function costSummary() {
  const perProvider: Record<string, { costUSD: number; turns: number }> = {};
  const perModel: Record<string, { costUSD: number; turns: number }> = {};
  let totalUSD = 0, tokensIn = 0, tokensOut = 0, baselineUSD = 0;

  for (const e of LEDGER) {
    totalUSD += e.costUSD; tokensIn += e.tokensIn; tokensOut += e.tokensOut;
    baselineUSD += (e.tokensIn / 1e6) * BASELINE_IN + (e.tokensOut / 1e6) * BASELINE_OUT;
    (perProvider[e.provider] ??= { costUSD: 0, turns: 0 });
    perProvider[e.provider].costUSD += e.costUSD; perProvider[e.provider].turns += 1;
    (perModel[e.model] ??= { costUSD: 0, turns: 0 });
    perModel[e.model].costUSD += e.costUSD; perModel[e.model].turns += 1;
  }
  const round = (n: number) => Number(n.toFixed(6));
  for (const k of Object.keys(perProvider)) perProvider[k].costUSD = round(perProvider[k].costUSD);
  for (const k of Object.keys(perModel)) perModel[k].costUSD = round(perModel[k].costUSD);

  return {
    turns: LEDGER.length,
    totalUSD: round(totalUSD),
    tokensIn, tokensOut,
    perProvider, perModel,
    baseline: {
      model: 'anthropic/claude-sonnet-4.6',
      wouldCostUSD: round(baselineUSD),
      savedUSD: round(baselineUSD - totalUSD),
      savedPct: baselineUSD > 0 ? Number(((1 - totalUSD / baselineUSD) * 100).toFixed(1)) : 0,
    },
    recent: LEDGER.slice(-15).reverse(),
  };
}
