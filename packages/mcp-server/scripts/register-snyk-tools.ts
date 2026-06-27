import 'dotenv/config';
import { submitToolForEvaluation, type ToolCategory, type CostProfile } from '../src/lib/crew-tool-registry.js';

/**
 * Formal registration of the list-faithful, WorfGate-eligible Snyk UI/UX MCP picks into the crew tool
 * registry (sa_tool_registry) via the full crew evaluation pipeline (Worf security -> Quark cost ->
 * specialists -> Picard). Runs on OpenRouter. Lives inside packages/mcp-server so tsx resolves the
 * @story-agent/shared/* subpath via this package's tsconfig.
 */
const PICKS = [
  { name: 'playwright-mcp', description: 'Structured browser automation for AI agents (Playwright MCP — Snyk UI/UX list).', category: 'testing' as ToolCategory, capabilities: ['browser automation', 'e2e testing', 'cross-browser', 'a11y checks'], sourceReference: 'github:microsoft/playwright-mcp', costProfile: 'self-hosted' as CostProfile, metadata: { source: 'snyk-ui-ux', owningRole: 'yar', autoExecute: false, requiresHumanGate: true } },
  { name: 'storybook-mcp', description: 'LLM access to Storybook component info + docs (Storybook MCP — Snyk UI/UX list).', category: 'documentation' as ToolCategory, capabilities: ['component docs', 'design system', 'ui inventory'], sourceReference: 'github:storybook-mcp', costProfile: 'self-hosted' as CostProfile, metadata: { source: 'snyk-ui-ux', owningRole: 'uhura', autoExecute: false, requiresHumanGate: true } },
];

(async () => {
  for (const p of PICKS) {
    console.log(`\n=== submit_tool_for_evaluation: ${p.name} (${p.category}) ===`);
    const r = await submitToolForEvaluation(p);
    console.log(`decision=${r.finalDecision} approved=${r.approved} worfVeto=${r.worfVetoed} approvals=${r.crewApprovalCount} rejects=${r.crewRejectCount} quality=${r.tool.qualityScore.toFixed(2)} clearance=${r.tool.securityClearance} status=${r.tool.status}`);
    console.log(`rationale: ${(r.decisionRationale || '').slice(0, 220)}`);
    for (const [crew, vote] of Object.entries(r.tool.crewVotes)) console.log(`  ${crew}: ${vote}`);
  }
  console.log('\n--- done: persisted to sa_tool_registry ---');
  process.exit(0);
})().catch((e) => { console.error('ERR', e?.message || e); process.exit(1); });
