import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { getRelevantObservationMemories, storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';

(async () => {
  const mems = await getRelevantObservationMemories({
    queryText: 'multi-file edit reliability snapshot rollback atomic verify typecheck agent-core loop drift dup imports primary code assistant',
    clientId: null, limit: 6,
  });
  const recall = mems.length ? mems.map((m, i) => `#${i + 1} [${m.missionReference ?? m.storyId}] ${m.transcript?.consensusSummary?.slice(0, 260) ?? ''}`).join('\n') : '(none)';
  console.log('=== RECALLED ' + mems.length + ' (emb=' + embeddingSource() + ') ===\n' + recall.slice(0, 900));

  const BRIEF = `Observation Lounge — DATA + GEORDI LEAD: SPEC the MULTI-FILE EDIT RELIABILITY LAYER for agent-core — the SINGLE go-criterion the crew named to make Story Agent our primary code assistant. Decisive + FRUGAL: one concrete first artifact we build now.

PRIOR MEMORY (build on):
${recall}

THE PROBLEM (crew lounge verdict, OBS story-agent-as-primary): the agent-core loop drifts on COMPLEX MULTI-FILE edits (dup/missing imports, broken builds) and needs orchestrator cleanup. Single-file + focused tasks are reliable. Close THIS gap.

GROUND TRUTH (agent-core internals):
- packages/mcp-server/src/agent-core/loop.ts runs the tool-calling loop (Quark model, WorfGate governor, iterations, cost ledger, self-healing stall detection, auto-escalation, emits AgentEvent).
- tools.ts has the mutating tools: write_file, edit_file, apply_patch (+ read_file, list_dir, search_code, run_shell, git_status, git_diff). WorfGate (worfgate-local.ts) already gates writes green/yellow/red and clamps paths into the workspace.
- The loop does NOT currently verify that its OWN multi-file changes still build before finishing — that's the gap.

CONVERGE ON (terse, decisive):
1. DATA (architecture, LEAD) — EDIT-SESSION SNAPSHOTS + ROLLBACK: define a differential snapshot mechanism — when the loop's FIRST mutating tool touches a file, capture that file's ORIGINAL content (in-memory map path→content, only changed files = differential). Expose rollback to restore all touched files to their snapshot. Where it lives (loop.ts wraps the tool dispatch; tools.ts records touched paths). Keep it in-memory + cheap; no new deps.
2. GEORDI (infra) — POST-EDIT VERIFICATION GATE: after the loop's edits (at loop end OR on demand), run the project's check (tsc/build via run_shell) over the touched packages; if it FAILS, feed the errors back into the loop as a tool result so the model SELF-CORRECTS (bounded retries), and ROLL BACK to the snapshot if it still fails after N tries. Define the exact flow + where it hooks in the loop iteration.
3. WORF — safety: snapshots/rollback are local + within the WorfGate-clamped workspace; rollback never touches files outside the touched set; no secrets in snapshots.
4. QUARK — cheapest: reuse run_shell for verification (no new infra); scope the build/typecheck to ONLY the touched package(s) to keep it fast; what to DEFER (e.g. full multi-package builds).
5. RIKER → PICARD — the SINGLE first artifact + acceptance check (e.g. "agent-core snapshots touched files, runs a scoped typecheck after edits, feeds errors back for self-correction, and auto-rolls-back if still broken — so a multi-file task never finishes in a broken-build state"). "Make it so."`;

  const r = await runMissionPipeline(BRIEF);
  console.log('\n===== MULTI-FILE RELIABILITY — FEEDBACK =====');
  for (const c of r.contributions) { console.log(`\n[${c.crewId.toUpperCase()} | ${c.model}]`); console.log(c.text.replace(/\n{2,}/g, '\n').trim().slice(0, 460)); }
  console.log('\n[PICARD | PLAN]\n' + r.missionPlan.slice(0, 1700));

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const md = ['# Observation Lounge — Multi-file edit reliability layer (agent-core)', '', `**Date:** ${new Date().toISOString().slice(0, 10)} | **Top:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`, '', '## Contributions', '', ...r.contributions.flatMap(c => [`### ${c.crewId} — \`${c.model}\``, '', c.text, '']), '## Picard — plan', '', r.missionPlan, ''].join('\n');
  mkdirSync('docs/observation-lounge', { recursive: true });
  const p = `docs/observation-lounge/multifile-reliability-${stamp}.md`; writeFileSync(p, md); console.log('TRANSCRIPT ' + p);

  const obs = await storeObservationMemory({
    storyId: 'multifile-reliability-spec', source: 'mcp',
    transcript: { rounds: [{ title: 'multi-file edit reliability layer for agent-core', entries: r.contributions.map(c => ({ speakerId: c.crewId, position: 'support', statement: c.text, evidence: [c.model] })) }], consensusSummary: r.missionPlan, unresolvedRisks: ['differential snapshot of touched files only', 'scoped post-edit typecheck (touched packages)', 'feed errors back for self-correction, rollback if still broken', 'reuse run_shell, no new deps'], finalDecision: 'approved', actionItems: ['edit-session snapshot map (path->original) in loop/tools', 'post-edit scoped verify gate', 'self-correct from verify errors (bounded)', 'auto-rollback if still broken'] },
    tags: ['agent-core', 'multi-file', 'reliability', 'snapshot', 'rollback', 'verify', 'primary-assistant', 'openrouter'],
  });
  console.log('OBS ' + obs.id);
  const memD = await storeCrewPersonalMemory({ crew_id: 'data', memory_type: 'decision_note', title: 'Multi-file reliability: edit-session differential snapshots (path->original) + scoped post-edit verify gate + self-correct/rollback in agent-core loop', content: r.missionPlan, tags: ['agent-core', 'multi-file', 'snapshot', 'verify', 'rollback'], relates_to_crew: ['geordi', 'worf', 'quark', 'riker', 'picard'] });
  console.log('MEM data=' + memD + ' COST $' + r.efficiency.totalCostUSD + ' top=' + r.topModel);
  process.exit(0);
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
