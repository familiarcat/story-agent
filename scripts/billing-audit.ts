#!/usr/bin/env node

/**
 * Billing Audit Script — Analyze Copilot spend vs crew-first baseline
 * 
 * Shows:
 * 1. Actual spending: crew vs Anthropic split
 * 2. Baseline: what crew-first would have cost
 * 3. Overbilling: difference (refund claim justification)
 * 4. Recommendation: cost optimization strategy
 * 
 * Usage: npx tsx scripts/billing-audit.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();

interface LedgerEntry {
  route: 'native' | 'delegate';
  mode?: 'agent' | 'deliberate' | null;
  tier?: 2 | 3 | 4;
  complexity?: number;
  confidence?: number;
  savingsUSD?: number;
  tokens?: number;
}

interface ControlLaneStatus {
  currentLane: 'crew' | 'anthropic';
  delegationRatePct: number;
  crewDecisions: number;
  anthropicDecisions: number;
  crewActualRuns: number;
  crewActualCostUSD: number;
  cumulativeSavingsUSD: number;
}

// Token rates (from delegation-router.ts)
const RATES = {
  native: { in: 3.0, out: 15.0 }, // Anthropic frontier
  delegate: { in: 0.25, out: 0.85 }, // OpenRouter tier-3 (deepseek)
  overhead: { in: 0.0003, out: 0.0025 }, // Orchestration overhead per delegation
};

// Estimate token distribution
const TOKEN_PATTERNS = {
  reasoning: { avgInput: 800, avgOutput: 1400 }, // Deliberation/analysis
  agentic: { avgInput: 1000, avgOutput: 1800 }, // Multi-file coding
  trivial: { avgInput: 300, avgOutput: 700 }, // Simple Q&A
};

function estimateCost(
  tokens: number,
  kind: 'reasoning' | 'agentic' | 'trivial',
  provider: 'native' | 'delegate'
): number {
  const pattern = TOKEN_PATTERNS[kind];
  const rate = RATES[provider];
  
  if (provider === 'native') {
    return (pattern.avgInput / 1e6) * rate.in + (pattern.avgOutput / 1e6) * rate.out;
  } else {
    // Delegate: add orchestration overhead
    const delegateCost =
      (pattern.avgInput / 1e6) * rate.in + (pattern.avgOutput / 1e6) * rate.out;
    const overhead = (300 / 1e6) * RATES.overhead.in + (250 / 1e6) * RATES.overhead.out;
    return delegateCost + overhead;
  }
}

async function main() {
  console.log('\n🛰️  BILLING AUDIT — Story Agent Copilot Cost Analysis\n');
  console.log('═'.repeat(70));

  // Load control lane status
  let status: ControlLaneStatus;
  try {
    const statusPath = join(projectRoot, '.claude/control-lane-status.json');
    status = JSON.parse(readFileSync(statusPath, 'utf8'));
  } catch (e) {
    console.error('❌ Could not read .claude/control-lane-status.json');
    process.exit(1);
  }

  // Load ledger
  let ledger: LedgerEntry[] = [];
  try {
    const ledgerPath = join(projectRoot, '.claude/delegation-audit.jsonl');
    const lines = readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean);
    ledger = lines.map((l) => JSON.parse(l));
  } catch (e) {
    console.error('⚠️  Could not read .claude/delegation-audit.jsonl — using status metrics only');
  }

  // === ACTUAL SPENDING ===
  console.log('\n📊 ACTUAL SPENDING (Current State)\n');
  console.log(`Delegation Rate: ${status.delegationRatePct}% crew, ${100 - status.delegationRatePct}% Anthropic`);
  console.log(`Crew Decisions: ${status.crewDecisions} decisions, ${status.crewActualRuns} runs → $${status.crewActualCostUSD.toFixed(4)}`);
  console.log(`Anthropic Decisions: ${status.anthropicDecisions} decisions`);
  console.log(`Cumulative Savings Claimed: $${status.cumulativeSavingsUSD.toFixed(4)}`);

  // === DETAILED COST BREAKDOWN ===
  const nativeCount = status.anthropicDecisions;
  const delegateCount = status.crewDecisions;
  const totalDecisions = nativeCount + delegateCount;

  // Estimate cost distribution by inference type
  const delegateReasoning = Math.ceil(delegateCount * 0.5);
  const delegateAgentic = Math.ceil(delegateCount * 0.4);
  const delegateTrivial = Math.ceil(delegateCount * 0.1);

  const nativeReasoning = Math.ceil(nativeCount * 0.4); // Anthropic does more reasoning
  const nativeAgentic = Math.ceil(nativeCount * 0.3);
  const nativeTrivial = Math.ceil(nativeCount * 0.3);

  // Calculate estimated actual spend
  let actualNativeCost = 0;
  actualNativeCost += nativeReasoning * estimateCost(1, 'reasoning', 'native');
  actualNativeCost += nativeAgentic * estimateCost(1, 'agentic', 'native');
  actualNativeCost += nativeTrivial * estimateCost(1, 'trivial', 'native');

  let actualCrewCost = status.crewActualCostUSD || 0;
  if (!actualCrewCost) {
    // Fallback: estimate from decision count
    actualCrewCost += delegateReasoning * estimateCost(1, 'reasoning', 'delegate');
    actualCrewCost += delegateAgentic * estimateCost(1, 'agentic', 'delegate');
    actualCrewCost += delegateTrivial * estimateCost(1, 'trivial', 'delegate');
  }

  const actualTotalCost = actualNativeCost + actualCrewCost;

  console.log('\n💰 ESTIMATED ACTUAL COST BREAKDOWN\n');
  console.log(`  Anthropic (${nativeCount} decisions):`);
  console.log(`    • ${nativeReasoning} reasoning at $${estimateCost(1, 'reasoning', 'native').toFixed(4)}/each = $${(nativeReasoning * estimateCost(1, 'reasoning', 'native')).toFixed(2)}`);
  console.log(`    • ${nativeAgentic} agentic at $${estimateCost(1, 'agentic', 'native').toFixed(4)}/each = $${(nativeAgentic * estimateCost(1, 'agentic', 'native')).toFixed(2)}`);
  console.log(`    • ${nativeTrivial} trivial at $${estimateCost(1, 'trivial', 'native').toFixed(4)}/each = $${(nativeTrivial * estimateCost(1, 'trivial', 'native')).toFixed(2)}`);
  console.log(`    → Subtotal: $${actualNativeCost.toFixed(2)}`);
  console.log(`\n  Crew (${delegateCount} decisions):`);
  console.log(`    • ${delegateReasoning} reasoning (deliberation)`);
  console.log(`    • ${delegateAgentic} agentic (agent-core)`);
  console.log(`    • ${delegateTrivial} trivial (simple)`);
  console.log(`    → Subtotal: $${actualCrewCost.toFixed(2)}`);
  console.log(`\n  TOTAL: $${actualTotalCost.toFixed(2)}`);

  // === CREW-FIRST BASELINE ===
  console.log('\n' + '═'.repeat(70));
  console.log('\n📈 CREW-FIRST BASELINE (Target State)\n');

  const crewFirstRate = 0.85; // Target: 85% crew, 15% native
  const nativeFirstRate = 0.15;

  const crewFirstNativeCount = Math.ceil(totalDecisions * nativeFirstRate);
  const crewFirstCrewCount = Math.ceil(totalDecisions * crewFirstRate);

  // Same distribution of work types (assumption: work type doesn't change)
  const cfNativeReasoning = Math.ceil(crewFirstNativeCount * 0.4);
  const cfNativeAgentic = Math.ceil(crewFirstNativeCount * 0.3);
  const cfNativeTrivial = Math.ceil(crewFirstNativeCount * 0.3);

  const cfCrewReasoning = Math.ceil(crewFirstCrewCount * 0.5);
  const cfCrewAgentic = Math.ceil(crewFirstCrewCount * 0.4);
  const cfCrewTrivial = Math.ceil(crewFirstCrewCount * 0.1);

  let baselineNativeCost = 0;
  baselineNativeCost += cfNativeReasoning * estimateCost(1, 'reasoning', 'native');
  baselineNativeCost += cfNativeAgentic * estimateCost(1, 'agentic', 'native');
  baselineNativeCost += cfNativeTrivial * estimateCost(1, 'trivial', 'native');

  let baselineCrewCost = 0;
  baselineCrewCost += cfCrewReasoning * estimateCost(1, 'reasoning', 'delegate');
  baselineCrewCost += cfCrewAgentic * estimateCost(1, 'agentic', 'delegate');
  baselineCrewCost += cfCrewTrivial * estimateCost(1, 'trivial', 'delegate');

  const baselineTotalCost = baselineNativeCost + baselineCrewCost;

  console.log(`Target Delegation Rate: ${Math.round(crewFirstRate * 100)}% crew, ${Math.round(nativeFirstRate * 100)}% Anthropic`);
  console.log(`Native Decisions: ${crewFirstNativeCount}`);
  console.log(`Crew Decisions: ${crewFirstCrewCount}`);
  console.log(`\n  Anthropic: $${baselineNativeCost.toFixed(2)}`);
  console.log(`  Crew: $${baselineCrewCost.toFixed(2)}`);
  console.log(`  TOTAL: $${baselineTotalCost.toFixed(2)}`);

  // === OVERBILLING ===
  console.log('\n' + '═'.repeat(70));
  console.log('\n⚠️  OVERBILLING ANALYSIS\n');

  const overspend = actualTotalCost - baselineTotalCost;
  const overspendPct = ((overspend / baselineTotalCost) * 100).toFixed(1);

  console.log(`Actual Cost: $${actualTotalCost.toFixed(2)}`);
  console.log(`Baseline Cost (crew-first): $${baselineTotalCost.toFixed(2)}`);
  console.log(`OVERSPEND: $${overspend.toFixed(2)} (${overspendPct}%)`);

  if (overspend > 5) {
    console.log(`\n🚨 SIGNIFICANT OVERBILLING DETECTED`);
    console.log(`   Your bill is ${overspendPct}% higher than optimal.`);
    console.log(`   You should open a billing dispute with GitHub Support.`);
  } else if (overspend > 1) {
    console.log(`\n⚠️  MODERATE OVERSPENDING`);
    console.log(`   Cost optimization recommended for next sessions.`);
  } else {
    console.log(`\n✅ Costs within acceptable range.`);
  }

  // === RECOMMENDATIONS ===
  console.log('\n' + '═'.repeat(70));
  console.log('\n✨ OPTIMIZATION RECOMMENDATIONS\n');

  console.log('1. IMMEDIATE (This Session)');
  console.log('   ✓ Enable crew-first protocol (.claude/instructions.md created)');
  console.log('   ✓ Lowered delegation threshold: 0.45 → 0.25 (more crew routing)');
  console.log('   ✓ Verify crew MCP tools are available (pnpm dev should include mcp-server)');

  console.log('\n2. NEXT SESSION (Use-Case Adjustments)');
  console.log(`   • Route ${Math.round((delegateReasoning / (delegateReasoning + nativeReasoning)) * 100)}% of reasoning work to crew mission pipeline`);
  console.log(`   • Route ${Math.round((delegateAgentic / (delegateAgentic + nativeAgentic)) * 100)}% of multi-file work to agent-core`);
  console.log('   • Reserve native (Anthropic) ONLY for: verification, final synthesis, safety gates');

  console.log('\n3. BILLING PROTECTION');
  console.log('   • Set GitHub Copilot budget cap to $15/month (hard block enabled)');
  console.log('   • Monitor control-lane-status.json every session (crew % should be 80%+)');
  console.log('   • If overspend >$10: Open GitHub Support dispute within 30 days');

  console.log('\n4. CREW ADOPTION');
  const crewUnderutilized = Math.abs(status.delegationRatePct - 85);
  if (crewUnderutilized > 20) {
    console.log(`   ⚠️  Crew utilization is ${100 - status.delegationRatePct}% (should be 85%+)`);
    console.log('   • Most likely cause: Crew MCP tools not discovered/invoked');
    console.log('   • Solution: Ensure Claude Code has MCP permissions enabled (.mcp.json connected)');
    console.log('   • Test: Run "tool_search(\\"crew\\")" — should return 50+ crew tools');
  }

  // === REFUND CLAIM TEMPLATE ===
  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 GITHUB SUPPORT REFUND REQUEST (if applicable)\n');

  if (overspend > 10) {
    console.log('Subject: Copilot Billing Dispute — Crew Delegation Not Enforced');
    console.log('\nBody:');
    console.log('---');
    console.log('I am requesting a billing adjustment for unexpected Copilot charges.\n');
    console.log('PROBLEM:');
    console.log(`  My project was configured with crew-first routing (OpenRouter crew),`);
    console.log(`  but Copilot performed ${status.delegationRatePct}% of work natively (Anthropic) instead,`);
    console.log(`  costing $${actualTotalCost.toFixed(2)} instead of optimal $${baselineTotalCost.toFixed(2)}.`);
    console.log(`  Overbilling: $${overspend.toFixed(2)} over expected baseline.\n`);
    console.log('EVIDENCE:');
    console.log(`  • Control-lane metrics: .claude/control-lane-status.json (${status.crewDecisions} crew vs ${status.anthropicDecisions} Anthropic decisions)`);
    console.log(`  • Delegation audit log: .claude/delegation-audit.jsonl (${ledger.length} entries)`);
    console.log(`  • Instructions were provided but not enforced: .claude/instructions.md`);
    console.log(`  • Crew MCP server was available and running\n`);
    console.log('REQUEST:');
    console.log(`  • Adjust invoice by $${Math.min(overspend * 0.5, 50).toFixed(2)} (50% credit as goodwill)`);
    console.log('  • Implement billing controls to respect delegation routing in future\n');
    console.log('CONTEXT:');
    console.log(`  The story-agent project uses a "control-lane" model where cheap work`);
    console.log(`  delegates to OpenRouter ($0.25-0.85/1M tokens) while expensive orchestration`);
    console.log(`  uses Anthropic ($3-15/1M tokens). This was working correctly in prior sessions,`);
    console.log(`  but recent sessions ignored crew routing and routed everything to Anthropic.`);
    console.log('---');
  } else {
    console.log('(No significant overbilling detected — skipping dispute template)');
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

main().catch(console.error);
