import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db';
(async () => {
    const BRIEF = `OBSERVATION LOUNGE — Design real-time crew execution status reporting.

CONTEXT:
Crew executes tasks but outcomes are NOT streamed back to chat. Users don't see live progress on what crew members are doing, which tasks succeeded/failed, or why. Goal: each officer reports attempt + result as they execute, visible in real time, then stored to RAG for future calibration.

DESIGN QUESTIONS FOR CREW CONSENSUS:

1. REAL-TIME FEEDBACK CHANNEL — How should officers report progress?
   - Option A: Each crew member SSE stream to chat client (parallel per-officer feedback, complex multiplexing)
   - Option B: Centralized progress queue (Riker aggregates all officer status → single stream to client, simpler but bottleneck)
   - Option C: Hybrid (officers report to Riker, Riker batches + streams consolidated view, balance)
   → Which minimizes latency + cost? Best user experience? Recommend ONE.

2. OUTCOME MEMORY STRUCTURE — What should crew remember about each execution?
   - Essential fields: crew_id, attempt_id, task_description, status (success|blocked|retry), duration_seconds, timestamp, files_touched, confidence_level
   - Optional: complexity_estimate, complexity_actual, error_message, recovery_attempts, dependencies
   - Example: "Geordi attempted UI header cleanup (3 files) on 2026-07-12. Status: success. Duration: 45s. Confidence: high. Files: cost/page.tsx, learnings/page.tsx, observations/page.tsx."
   → Propose the MINIMAL schema (5-7 fields) that enables crew calibration + user visibility. Define RAG tag format.

3. CHAT DISPLAY FORMAT — How should user see this in real time?
   - Current: Single response at end
   - Proposed: Live status cards (one per crew member) showing officer name, current task, status, progress bar, last update, error if failed
   - Updates in-stream (WebSocket-style) or polling?
   → Design the response schema: what does ONE status update message contain? How does the chat service receive + render it?

4. INTEGRATION POINTS — Where does this live in codebase?
   - VSCode chat engine (chatEngine.ts)?
   - Unified chat response architecture (existing doc: unified-chat-response-architecture.md)?
   - New \`/api/crew/status-stream\` endpoint?
   - Modify runMissionPipeline to emit status updates?
   → Recommend the LEAST-INVASIVE integration point. What's the single entry point?

5. FAILURE HANDLING + RETRY — How to balance autonomy vs user control?
   - Option A: Crew retries automatically (up to N times) with backoff
   - Option B: Pause and await user confirmation to retry
   - Option C: Hybrid (simple failures auto-retry, complex blockers ask user)
   - Should we track failure mode + recovery attempt?
   → Choose ONE default. Define what constitutes "simple" vs "complex" blocker.

DELIVERABLES FOR CREW CONSENSUS:
1. Architecture diagram (text): feedback flow (crew → Riker → chat client → storage)
2. Response schema: what ONE status update message looks like (JSON structure)
3. Data model: crew execution outcome memory fields + RAG tag format
4. Implementation roadmap (3 phases, owners, effort estimates, ready to code)
5. Proof-of-concept spec: one new crew-outcome memory field ready to implement
6. Crew performance metric: track success rate per officer (schema + dashboard concept)

CREW ROLES:
- Picard (synthesis): Design the overall architecture + diagram + finalized feedback flow
- Riker (delivery): Propose chat service integration + response schema + where it lives
- Geordi (engineering): Implementation roadmap (phases, file changes, dependencies)
- Quark (optimization): Cost model for streaming + storage overhead, tier selection
- Data (analytics): Metrics schema for crew performance dashboards
- Scotty (execution): Prioritize first phase to build, concrete next steps
- Worf (security): Any WorfGate credential logging concerns for outcome records?

CONSTRAINTS:
- Minimize cost (frugal tier — use cheapest adequate models)
- Don't block execution (reporting is async, fire-and-forget)
- Respect WorfGate (credential usage per attempt must be logged)
- Store all outcomes automatically (no manual recording)
- Be DECISIVE: choose ONE option per question, explain trade-off briefly

Return consensus document with:
1. Architecture + diagram
2. Response schema (JSON + example)
3. Data model + RAG tag format
4. 3-phase roadmap (owners + effort)
5. Proof-of-concept + next build step
6. Crew success metrics concept`;
    const r = await runMissionPipeline(BRIEF);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
    const md = ['# Observation Lounge — Real-time Crew Status Reporting Architecture', '', `**Date:** ${new Date().toISOString().slice(0, 10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`, '', '## Design Questions & Decisions', '', r.goals, '', '## Crew Contributions', '', ...r.contributions.flatMap(c => [`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`, '', c.text, '']), '## Picard — Architecture + Roadmap (Consensus)', '', r.missionPlan, ''].join('\n');
    mkdirSync('docs/observation-lounge', { recursive: true });
    const p = `docs/observation-lounge/crew-status-reporting-design-${stamp}.md`;
    writeFileSync(p, md);
    console.log('TRANSCRIPT ' + p);
    const obs = await storeObservationMemory({ storyId: 'crew-status-reporting-design', source: 'mcp', transcript: { rounds: [{ title: 'real-time crew status reporting', entries: r.contributions.map(c => ({ speakerId: c.crewId, position: 'support', statement: c.text, evidence: [c.model] })) }], consensusSummary: r.missionPlan, unresolvedRisks: [], finalDecision: 'approved', actionItems: ['implement outcome memory logging', 'integrate status streaming to chat', 'build crew performance dashboard'] }, tags: ['crew', 'status-reporting', 'real-time', 'chat', 'feedback', 'outcomes', 'performance-metrics', 'RAG'] });
    console.log('OBS ' + obs.id + ' emb=' + embeddingSource());
    const m = await storeCrewPersonalMemory({ crew_id: 'picard', memory_type: 'mission_outcome', title: 'Real-time crew status reporting architecture design — consensus on feedback flow, response schema, data model, 3-phase roadmap', content: r.missionPlan, tags: ['status-reporting', 'architecture', 'design', 'consensus', 'roadmap'], relates_to_crew: ['riker', 'geordi', 'quark', 'data', 'scotty', 'worf'] });
    console.log('MEM ' + m);
    console.log('COST $' + r.efficiency.totalCostUSD + ' topModel=' + r.topModel);
    process.exit(0);
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
