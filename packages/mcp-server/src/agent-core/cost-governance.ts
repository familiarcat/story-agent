/**
 * Cost Governance — Budget enforcement for alpha vs production phases.
 * Distinguishes between DEV mode (simulated, no real billing) and PROD mode (real billing).
 * Prevents runaway spend by checking projected costs before requests and halting if budget exceeded.
 */

export type CostAttributionMode = 'dev' | 'prod';

export interface CostGovernanceConfig {
  mode: CostAttributionMode;
  budgetUSD: number;
  warnPct: number;
  haltPct: number;
  strict: boolean; // If true, halt requests that exceed budget; if false, warn only
}

export interface BudgetStatus {
  phase: string;
  budgetUSD: number;
  currentSpendUSD: number;
  percentSpent: number;
  percentRemaining: number;
  status: 'ok' | 'warning' | 'critical' | 'exceeded';
  lastUpdated: string;
}

let CONFIG: CostGovernanceConfig | null = null;
let SUPABASE_CLIENT: any = null; // Any type to avoid Supabase dep in mcp-server

export function initializeCostGovernance(config: CostGovernanceConfig): void {
  CONFIG = config;
  // Supabase client initialized separately via http-server.ts context
}

export function setCostGovernanceSupabase(client: any): void {
  SUPABASE_CLIENT = client;
}

export function getConfig(): CostGovernanceConfig {
  if (!CONFIG) {
    // Defaults: PROD mode (safe default), no budget enforcement
    return {
      mode: (process.env.COST_ATTRIBUTION_MODE as CostAttributionMode) || 'prod',
      budgetUSD: parseFloat(process.env.COST_BUDGET_USD || '0'),
      warnPct: parseInt(process.env.COST_BUDGET_WARN_PCT || '50', 10),
      haltPct: parseInt(process.env.COST_BUDGET_HALT_PCT || '100', 10),
      strict: process.env.COST_GOVERNANCE_STRICT === 'true',
    };
  }
  return CONFIG;
}

/**
 * Check if a request can proceed based on budget.
 * Returns { allow: boolean, reason?: string }
 */
export async function checkBudget(
  projectedCostUSD: number,
  requestId?: string
): Promise<{ allow: boolean; reason?: string }> {
  const cfg = getConfig();

  // PROD mode: no budget check (pay-as-you-go)
  if (cfg.mode === 'prod' || cfg.budgetUSD === 0) {
    return { allow: true };
  }

  // DEV mode: enforce budget
  try {
    const status = await getBudgetStatus();
    const wouldExceed = status.currentSpendUSD + projectedCostUSD > cfg.budgetUSD;

    if (wouldExceed) {
      if (cfg.strict) {
        // Halt immediately
        await recordEscalation({
          severity: 'critical',
          currentSpend: status.currentSpendUSD,
          projectedAdditional: projectedCostUSD,
          message: `Budget exceeded: current $${status.currentSpendUSD.toFixed(2)} + projected $${projectedCostUSD.toFixed(2)} > limit $${cfg.budgetUSD}`,
          decision: null,
          requestId,
        });
        return {
          allow: false,
          reason: `Budget limit reached ($${cfg.budgetUSD}). Current spend: $${status.currentSpendUSD.toFixed(2)}.`,
        };
      } else {
        // Warn but allow (for now)
        await recordEscalation({
          severity: 'warning',
          currentSpend: status.currentSpendUSD,
          projectedAdditional: projectedCostUSD,
          message: `Projected budget overrun: current $${status.currentSpendUSD.toFixed(2)} + projected $${projectedCostUSD.toFixed(2)} > limit $${cfg.budgetUSD}`,
          decision: null,
          requestId,
        });
        return { allow: true }; // Allow but escalation recorded
      }
    }

    return { allow: true };
  } catch (err) {
    console.error('[cost-governance] checkBudget error:', err);
    // Fail open: allow request if we can't check budget
    return { allow: true };
  }
}

/**
 * Get current budget status (queries Supabase for actual spend).
 */
export async function getBudgetStatus(): Promise<BudgetStatus> {
  const cfg = getConfig();

  if (!SUPABASE_CLIENT) {
    // Fallback: no Supabase, return zero spend
    return {
      phase: 'alpha',
      budgetUSD: cfg.budgetUSD,
      currentSpendUSD: 0,
      percentSpent: 0,
      percentRemaining: 100,
      status: 'ok',
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    // Query DEV-mode costs only (PROD mode costs don't count toward alpha budget)
    const { data, error } = await SUPABASE_CLIENT
      .from('cost_ledger')
      .select('costUSD')
      .eq('cost_mode', 'dev');

    if (error) throw error;

    const currentSpend = (data || []).reduce((sum: number, row: any) => sum + (row.costUSD || 0), 0);
    const percentSpent = cfg.budgetUSD > 0 ? (currentSpend / cfg.budgetUSD) * 100 : 0;
    const percentRemaining = 100 - percentSpent;

    let status: 'ok' | 'warning' | 'critical' | 'exceeded';
    if (percentSpent >= 100) status = 'exceeded';
    else if (percentSpent >= cfg.haltPct) status = 'critical';
    else if (percentSpent >= cfg.warnPct) status = 'warning';
    else status = 'ok';

    return {
      phase: 'alpha',
      budgetUSD: cfg.budgetUSD,
      currentSpendUSD: currentSpend,
      percentSpent: Number(percentSpent.toFixed(1)),
      percentRemaining: Number(percentRemaining.toFixed(1)),
      status,
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[cost-governance] getBudgetStatus error:', err);
    return {
      phase: 'alpha',
      budgetUSD: cfg.budgetUSD,
      currentSpendUSD: 0,
      percentSpent: 0,
      percentRemaining: 100,
      status: 'ok',
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Record a cost escalation event (warning or critical).
 */
export async function recordEscalation(opts: {
  severity: 'warning' | 'critical';
  currentSpend: number;
  projectedAdditional: number;
  message: string;
  decision: string | null;
  requestId?: string;
}): Promise<void> {
  if (!SUPABASE_CLIENT) return;

  try {
    await SUPABASE_CLIENT.from('cost_escalation').insert({
      severity: opts.severity,
      current_spend: opts.currentSpend,
      projected_additional: opts.projectedAdditional,
      message: opts.message,
      decision: opts.decision,
      request_id: opts.requestId || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cost-governance] recordEscalation error:', err);
  }
}
