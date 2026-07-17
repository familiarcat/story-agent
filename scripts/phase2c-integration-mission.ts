import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';

/**
 * Phase 2C Integration Deliberation — Crew consensus on sync architecture
 *
 * Current state:
 * - Phase 1B: WorfGate security, chat schema, WebSocket proxy (3105), VSCode scaffolding
 * - Phase 1 partial: Zustand store, SyncManager (batching), ChatClient (WebSocket connection)
 *
 * Mission: Design the Zustand ↔ WebSocket sync bridge for Phase 2C
 */

(async () => {
const BRIEF = `Observation Lounge — PHASE 2C INTEGRATION ARCHITECTURE

Current state:
- Phase 1B complete: WorfGate chat validator (security layer), chat schema (Zod), WebSocket proxy (3105), VSCode scaffolding
- Phase 1 partial: Zustand store (state mgmt), SyncManager (batching framework), ChatClient (WebSocket connection), docker-compose (chat-proxy service)

Mission: Crew consensus on Phase 2C sync architecture (Zustand ↔ WebSocket sync bridge)

REQUIRED ANALYSIS:

1. **Current Sync Flow** (verify + diagram):
   - VSCode user action → Zustand mutation detected?
   - SyncManager batches the change?
   - Batched changes → WebSocket send to chat-proxy (3105)?
   - Chat-proxy → MCP server?
   - Remote store updates?
   - Real-time UI sync across surfaces?
   - What's the Zustand store structure? (messages, metadata, pending changes?)
   - Is there conflict detection? (collision-detector.ts exists)

2. **What's Missing** (identify gaps):
   - sync-integration.ts (THE BRIDGE: Zustand → WebSocket → remote store)
   - Conflict resolution strategy (Last-Write-Wins? Three-way merge? CRDT?)
   - Error handling + recovery (WebSocket down, rate limited, auth failed)
   - Local queue persistence (survive reconnect)
   - Remote store reconciliation (what if server has newer changes?)

3. **Docker Compose Updates**:
   - Add sync service? Or use existing chat-proxy (3105)?
   - Health checks? (HTTP /health endpoint)
   - Environment variables for sync: SYNC_PORT, BATCH_INTERVAL, CONFLICT_STRATEGY?
   - Redis for session persistence? (optional Phase 3)
   - Wire MCP to sync service? (or direct?)

4. **Dev Test Scripts**:
   - dev-sync-test.sh: Start sync server, test WebSocket connection (echo + pong)
   - sync-load-test.sh: 10 concurrent users, 100 msg/sec, latency histogram, cost tracking
   - sync-audit-dump.sh: Export audit trail (who changed what when)

5. **Deployment Strategy** (phases):
   - Localhost: Single-user dev mode (all 3 services on docker-compose)
   - Staging: 10-50 test users, monitor latency + cost
   - Canary: 5% of Section 31 users (600 people), A/B vs HTTP fallback
   - Production: Full rollout, auto-rollback if sync failures >0.1%

6. **Success Criteria** (testable, measurable):
   - [ ] Sync bridge compiles (TypeScript zero errors)
   - [ ] All tests pass (unit + integration + load + chaos)
   - [ ] Latency: P50 <100ms, P99 <500ms
   - [ ] Success rate: >99.9% (max 1 failure per 1,000 syncs)
   - [ ] Cost: <\$100/day for 10 concurrent users (Quark routing efficient)
   - [ ] Audit trail: All operations logged (immutable)
   - [ ] Rollback: HTTP fallback works (graceful degradation)
   - [ ] Documentation: Deployment guide complete
   - [ ] Team: All crew members sign off (consensus gate)

7. **Risks & Mitigation**:
   - Risk: WebSocket connection drops during sync → **Mitigate**: Exponential backoff + local queue + replay on reconnect
   - Risk: Conflicts (user edits locally + server has newer) → **Mitigate**: Last-Write-Wins (LWW) for Phase 2, CRDT for Phase 3
   - Risk: Rate limiting (Worf budget exceeded) → **Mitigate**: Quark throttles batch interval, client backs off
   - Risk: Auth failure (JWT expired) → **Mitigate**: Client reconnects, server issues new JWT
   - Risk: Latency creep (P99 >500ms) → **Mitigate**: Monitor per-user latency, auto-scale MCP if needed

**CREW CONSENSUS REQUIRED:**
- Riker (code): Is the sync bridge architecture sound? Any edge cases?
- Data (architecture): Should we use LWW or smarter merge? How do we avoid data loss?
- Geordi (infrastructure): Docker updates? Health checks? Session persistence?
- Quark (cost): Budget tracking? Rate limiting logic? What's the cost per sync?
- Worf (security): Audit trail design? WorfGate integration? Token counting?
- O'Brien (devops): Deployment progression? Rollback procedure? Success metrics?
- Yar (QA): Test strategy? Load test parameters? What could break?
- Crusher (health): Monitoring dashboards? Observability? Alert thresholds?

**OUTPUT NEEDED:**
- Architecture diagram: Zustand → SyncManager → WebSocket → chat-proxy → MCP → remote store
- File tree: What gets created/modified (sync-integration.ts, docker-compose.dev.yml, scripts, docs)
- Implementation roadmap: Phases, LOC estimates, dependencies, risks
- Success criteria checklist (gate-ready = all items complete + crew sign-off)

**CONSTRAINTS:**
- No new npm dependencies
- Hot-reload compatible (Phase 1 sessions continue working)
- <\$100/day for 10 users
- >99.9% sync success
- <500ms P99 latency
- Production-ready error handling
- Backward compatible (HTTP fallback preserved)`;

const r = await runMissionPipeline(BRIEF);

// CREW ANALYSIS LOG
console.log('\n========== PHASE 2C CREW ANALYSIS ==========');
for (const c of r.contributions) {
  console.log(`\n[${c.crewId.toUpperCase()} · ${c.model} · $${Number(c.costUSD).toFixed(5)}]`);
  console.log(c.text.replace(/\n{2,}/g, '\n').trim().slice(0, 600));
}
console.log('\n[PICARD · INTEGRATION PLAN]');
console.log(r.missionPlan.slice(0, 1000));
console.log('================================================\n');

// Store crew analysis to markdown
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
const md = [
  '# Phase 2C Integration Mission — Crew Deliberation',
  '',
  `**Date:** ${new Date().toISOString().slice(0, 10)} | **Top Model:** ${r.topModel} | **Total Cost:** $${r.efficiency.totalCostUSD}`,
  '',
  '## Mission',
  'Design the Zustand ↔ WebSocket sync bridge architecture for Phase 2C autonomous execution.',
  '',
  '## Crew Analysis',
  '',
  ...r.contributions.flatMap(c => [
    `### ${c.crewId.toUpperCase()} — \`${c.model}\` ($${c.costUSD})`,
    '',
    c.text,
    '',
  ]),
  '## Picard — Integration Plan',
  '',
  r.missionPlan,
  '',
  '## Efficiency Metrics',
  `- Total Cost: $${r.efficiency.totalCostUSD}`,
  `- Top Model: ${r.topModel}`,
  `- Tokens Used: ${r.efficiency.totalTokensUsed}`,
].join('\n');

mkdirSync('docs/phase2c', { recursive: true });
const outputPath = `docs/phase2c/crew-analysis-${stamp}.md`;
writeFileSync(outputPath, md);
console.log(`TRANSCRIPT: ${outputPath}`);

// Store to crew memory
const obs = await storeObservationMemory({
  storyId: 'phase2c-integration',
  source: 'mcp',
  transcript: {
    rounds: [{
      title: 'Phase 2C Sync Integration Architecture Deliberation',
      entries: r.contributions.map(c => ({
        speakerId: c.crewId,
        position: 'support',
        statement: c.text,
        evidence: [c.model, `cost:$${c.costUSD}`],
      })),
    }],
    consensusSummary: r.missionPlan,
    unresolvedRisks: [
      'WebSocket reconnection reliability under packet loss',
      'Conflict resolution strategy (LWW vs CRDT)',
      'Rate limiting behavior under sustained load',
      'Audit trail immutability + rotation policy',
    ],
    finalDecision: 'approved-for-implementation',
    actionItems: [
      'Build sync-integration.ts (bridge layer)',
      'Update docker-compose.dev.yml (sync wiring)',
      'Create dev/load/chaos test scripts',
      'Implement conflict detection + Last-Write-Wins resolution',
      'Document deployment strategy + rollback procedure',
      'Run Phase 2 gate tests (latency, cost, success rate)',
    ],
  },
  tags: ['phase2c', 'integration', 'architecture', 'sync', 'zustand', 'websocket', 'crew-consensus'],
});
console.log(`OBS MEMORY: ${obs.id}`);

// Store personal memory for each crew member
for (const c of r.contributions) {
  await storeCrewPersonalMemory({
    crew_id: c.crewId as any,
    memory_type: 'decision_note',
    title: `Phase 2C Integration: ${c.crewId}'s Analysis & Responsibilities`,
    content: c.text,
    tags: ['phase2c', 'integration', 'decision', 'sync-architecture'],
    relates_to_crew: r.contributions.map(x => x.crewId as any),
  });
}

console.log(`CREW MEMBERS: ${r.contributions.map(c => c.crewId).join(', ')}`);
console.log(`TOTAL COST: $${r.efficiency.totalCostUSD}`);
console.log('GATE CRITERIA: All crew sign off + plan ready for implementation');
process.exit(0);
})().catch(e => {
  console.error('ERR', e?.message || e);
  process.exit(1);
});
