import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/src/lib/crew-mission-pipeline.js';
import { getRelevantObservationMemories, storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/src/db.js';

(async () => {
  const mems = await getRelevantObservationMemories({
    queryText: 'story agent vs claude code primary code assistant cost efficiency openrouter dogfood agent-core loop multi-file reliability escalation parity',
    clientId: null, limit: 7,
  });
  const recall = mems.length ? mems.map((m, i) => `#${i + 1} [${m.missionReference ?? m.storyId}] ${m.transcript?.consensusSummary?.slice(0, 260) ?? ''}`).join('\n') : '(none)';
  console.log('=== RECALLED ' + mems.length + ' (emb=' + embeddingSource() + ') ===\n' + recall.slice(0, 1000));

  const BRIEF = `OBSERVATION LOUNGE — full-crew deliberation. The Captain has asked: "When can we use STORY AGENT as our primary CODE ASSISTANT instead of Claude Code, for a significant advance in FUNCTIONALITY and COST EFFICIENCY? Share our findings and motivations." Each officer speaks from their post; Picard synthesizes the shared finding + motivation + the honest go-criteria.

PRIOR CREW MEMORY (recall — speak from what we've actually built/learned):
${recall}

GROUND TRUTH (what Story Agent already is):
- Agent-core loop over OpenRouter (Quark-selected model per task, mostly deepseek ~\$0.001-0.02/turn), WorfGate green/yellow/red governor, NDJSON live feedback, self-healing stall detection, auto-escalation, cost ledger, RAG recall/store. Surfaces: CLI, /agent SSE, VS Code chat participant (Ask/Plan/Agent), selection-first UI.
- We DOGFOODED it this very session: the crew proposed + drove a Fargate deploy-validation change through CICD, surfaced + fixed a real health-check bug, optimized deploy health (Crusher owns it now), all on OpenRouter. Claude Code acted as ORCHESTRATOR/verifier.
- KNOWN GAP: the loop drifts on complex MULTI-FILE edits (dup/missing imports) and needs orchestrator cleanup; it auto-escalates the hardest tasks. Single-file + focused tasks are reliable.
- Cost reality: OpenRouter crew turns are 10-100x cheaper than an Anthropic-frontier session; Anthropic is a POOL MEMBER, used only for tier-4.

EACH OFFICER — speak to YOUR post (terse, honest, decisive):
- PICARD (command): the strategic case + the single go-criterion to flip Story Agent to PRIMARY.
- DATA (architecture): what functionality parity remains (multi-file reliability, context, tool breadth) and how close we are.
- RIKER (execution): the day-to-day developer workflow — what already works as primary vs what still needs Claude Code.
- GEORDI (infra): is the agent-core loop + /agent + extension robust enough to be the daily driver? what's brittle?
- QUARK (finance): quantify the cost-efficiency motivation — OpenRouter crew vs Anthropic-direct; the ROI of switching.
- WORF (security): does running primary on OpenRouter + WorfGate keep us safe + sovereign?
- TROI (UX): is the developer experience good enough to trust it as the main interface? what frustrates?
- CRUSHER (health, now deploy-health owner): operational readiness — can it sustain real work without stalling?
- O'BRIEN (devops): can it ship to production by itself (we just proved a deploy)? what's missing for hands-off.
- YAR (quality): what must be true (tests, verification) before we trust it unsupervised on multi-file work.
- UHURA (comms): how we communicate this advance + motivation to stakeholders.

PICARD CLOSES with: the SHARED FINDING (when Story Agent becomes primary), the MOTIVATION (functionality + cost), the honest GAP, and the GO-CRITERIA — a crisp, shareable verdict. "Make it so."`;

  const r = await runMissionPipeline(BRIEF);
  console.log('\n===== OBSERVATION LOUNGE — Story Agent as primary code assistant =====');
  for (const c of r.contributions) { console.log(`\n[${c.crewId.toUpperCase()} | ${c.model}]`); console.log(c.text.replace(/\n{2,}/g, '\n').trim().slice(0, 520)); }
  console.log('\n[PICARD — SYNTHESIS]\n' + r.missionPlan.slice(0, 2000) + '\n=============================');

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const md = ['# Observation Lounge — Story Agent as our primary code assistant (vs Claude Code)', '', `**Date:** ${new Date().toISOString().slice(0, 10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD} | **Tokens:** ${r.efficiency.totalTokens}`, '', '> Captain’s question: when can Story Agent be our PRIMARY code assistant instead of Claude Code — for a significant advance in functionality and cost efficiency? Share findings + motivations.', '', '## Goals', '', r.goals, '', '## Crew contributions', '', ...r.contributions.flatMap(c => [`### ${c.crewId} — \`${c.model}\` ($${c.costUSD})`, '', c.text, '']), '## Picard — synthesis', '', r.missionPlan, ''].join('\n');
  mkdirSync('docs/observation-lounge', { recursive: true });
  const p = `docs/observation-lounge/story-agent-as-primary-${stamp}.md`; writeFileSync(p, md); console.log('TRANSCRIPT ' + p);

  const obs = await storeObservationMemory({
    storyId: 'story-agent-as-primary-assistant', source: 'mcp',
    transcript: { rounds: [{ title: 'Story Agent as primary code assistant — full-crew lounge', entries: r.contributions.map(c => ({ speakerId: c.crewId, position: 'support', statement: c.text, evidence: [c.model] })) }], consensusSummary: r.missionPlan, unresolvedRisks: ['multi-file edit reliability is the main parity gap', 'go-criterion to flip to primary', 'Claude Code stays orchestrator until criterion met'], finalDecision: 'approved', actionItems: ['define + measure the go-criterion (multi-file reliability)', 'expand reliable-task surface', 'keep dogfooding to close the gap'] },
    tags: ['story-agent', 'claude-code', 'primary-assistant', 'cost-efficiency', 'dogfood', 'openrouter', 'strategy', 'observation-lounge', 'motivation'],
  });
  console.log('OBS ' + obs.id);
  const mem = await storeCrewPersonalMemory({ crew_id: 'picard', memory_type: 'decision_note', title: 'Story Agent → primary code assistant: the functionality+cost case, the multi-file-reliability go-criterion, Claude Code as orchestrator until met', content: r.missionPlan, tags: ['strategy', 'primary-assistant', 'cost-efficiency', 'dogfood'], relates_to_crew: ['data', 'riker', 'geordi', 'quark', 'worf', 'troi', 'crusher', 'obrien', 'yar', 'uhura'] });
  console.log('MEM picard=' + mem + ' COST $' + r.efficiency.totalCostUSD + ' top=' + r.topModel);
  process.exit(0);
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
