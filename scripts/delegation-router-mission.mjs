import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/dist/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory, storeCrewPersonalMemory, embeddingSource } from '../packages/shared/dist/src/db.js';
(async () => {
  const BRIEF = `Observation Lounge — BUILD Wave 1 of the cost program: the DELEGATION ROUTER. Design a REUSABLE, generalizable algorithm + the first concrete artifact to ship now. Treat this as a high-level AI routing algorithm that could later apply to OTHER AI projects, not a one-off.

CONTEXT (ground truth):
- Claude Code (Anthropic) is the THIN ORCHESTRATOR. The OpenRouter/Quark crew is the cheap substantive worker. We cannot change Claude Code's own model, but we CAN make it delegate the heavy work automatically.
- We already have: quarkSelectModel(tier) + assembleAndOptimize(issue,maxTier) [deterministic complexity→cost model selection]; the /agent SSE loop + story-agent CLI [agentic tool-calling on a Quark-selected model]; runMissionPipeline [deliberation]; the deployed crew server (ALB: /chat,/agent,/cost,/aha/*). FRUGAL deliberation now runs ~$0.003 in ~30s.
- Claude Code supports a UserPromptSubmit hook (a shell command per prompt that can inject context). That is the natural automatic-delegation seam.

CONVERGE ON (terse, decisive, FRUGAL):
1. Data + Quark — THE ALGORITHM: a pure, deterministic COMPLEXITY/COST SCORER that takes a prompt (+light signals: length, tool-chain need, file-edit need, domain keywords) and returns a routing decision {route: 'native'|'delegate', tier, estCostNative, estCostDelegate, confidence, reason}. Define the exact signals + thresholds. It MUST be reusable as a standalone function (other AI projects can import it). Where it lives (packages/shared so any surface can use it).
2. Geordi — THE FIRST ARTIFACT: the smallest shippable thing that proves automatic delegation. Recommend ONE: (a) a Claude Code UserPromptSubmit hook script that scores the prompt and, when 'delegate', calls the crew and injects the result as context; or (b) a thin CLI. Give the concrete file path + how it wires in (settings.json hook), and the native fallback.
3. Quark — COST MODEL: for the scorer's estCostNative vs estCostDelegate, the formula + where the per-tier rates come from (MODEL_POOL). The break-even that flips route→delegate. Verified-savings logging.
4. Worf — SECURITY: the hook sees EVERY prompt. Credential brokering, no prompt leakage, audit, client isolation. The governance floor.
5. Yar — QUALITY GATE: when must it stay native (safety, tool-use chains, low confidence)? The rubric so cheap routing never silently degrades quality.
6. Riker — SEQUENCE: ordered first 3 steps. Picard ends with the SINGLE artifact to build first + its acceptance check. "Make it so."`;

  const r = await runMissionPipeline(BRIEF);
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'');
  const md = ['# Observation Lounge — Delegation Router (Wave 1 build)','',`**Date:** ${new Date().toISOString().slice(0,10)} | **Top model:** ${r.topModel} | **Cost:** $${r.efficiency.totalCostUSD}`,'','## Goals','',r.goals,'','## Contributions','',...r.contributions.flatMap(c=>[`### ${c.crewId} — \\`${c.model}\\` ($${c.costUSD})`,'',c.text,'']),'## Picard — plan','',r.missionPlan,''].join('\n');
  mkdirSync('docs/observation-lounge',{recursive:true});
  const p=`docs/observation-lounge/delegation-router-${stamp}.md`; writeFileSync(p,md);
  console.log('TRANSCRIPT '+p);
  const obs = await storeObservationMemory({
    storyId:'delegation-router',
    source:'mcp',
    transcript:{
      rounds:[
        { title:'delegation router', entries:r.contributions.map(c=>({ speakerId:c.crewId, position:'support', statement:c.text, evidence:[`model:${c.model}`, `cost:$${c.costUSD.toFixed(6)}`] })) }
      ],
      consensusSummary:r.missionPlan,
      unresolvedRisks:['hook sees every prompt (Worf)','quality regression on cheap routing (Yar)'],
      finalDecision:'approved',
      actionItems:['Ship the complexity/cost scorer + first delegation artifact']
    },
    tags:['cost','delegation','router','algorithm','claude-code','openrouter']
  });
  console.log('OBS '+obs.id+' emb='+embeddingSource());
  const m = await storeCrewPersonalMemory({
    crew_id:'data',
    memory_type:'decision_note',
    title:'Delegation Router — reusable complexity/cost scorer + first automatic-delegation artifact',
    content:r.missionPlan,
    tags:['cost','delegation','router','algorithm'],
    relates_to_crew:['quark','geordi','worf','yar','riker','picard']
  });
  console.log('MEM '+m);
  console.log('COST $'+r.efficiency.totalCostUSD+' topModel='+r.topModel);
  process.exit(0);
})().catch(e=>{ console.error('ERR', e?.message || e); process.exit(1); });
