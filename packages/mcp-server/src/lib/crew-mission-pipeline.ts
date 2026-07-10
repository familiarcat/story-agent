/**
 * Crew mission pipeline — the full cognitive flow:
 *
 *   1. PICARD intake (top-tier LLM)  — distills natural language into derived + intended GOALS.
 *   2. RIKER assembles               — picks the optimal crew for those goals (skills/tools).
 *   3. QUARK per-member optimization  — each member runs on the cheapest adequate OpenRouter model.
 *   4. CREW executes (lounge style)   — each member contributes a position/concern on their model.
 *   5. QUARK efficiency report        — isolates token/cost across the whole crew.
 *   6. PICARD mission plan (top-tier) — synthesizes a concrete plan the crew then autonomously executes.
 *
 * Anthropic is used only where Quark's tiering selects it (top-tier intake/plan, frontier members);
 * everything else runs on cheaper providers. Reuses assembleAndOptimize (Riker+Quark).
 */
import { assembleAndOptimize, quarkSelectModel, MODEL_POOL, type TeamMember } from './crew-team-assembly.js';
import { recordCrewRun, beginAsync, heartbeatAsync, endAsync } from '@story-agent/shared';

const OR_URL = (process.env.CREW_LLM_APPROVED_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const OR_KEY = process.env.CREW_LLM_APPROVED_KEY || '';
// Cost-minimization (Claude Code informed the crew to lower costs): FRUGAL by default caps the REST
// of the crew's per-officer tier (see assembleAndOptimize call below). Picard is the captain and
// always gets the highest available tier for his intake/synthesis bookends, FRUGAL or not.
const FRUGAL = process.env.CREW_FRUGAL !== 'false';
const TOP_MODEL = quarkSelectModel(4).id;

function rate(model: string) {
  const m = MODEL_POOL.find(x => x.id === model);
  return m ? { i: m.costIn, o: m.costOut } : { i: 3, o: 15 };
}
const costOf = (model: string, tin: number, tout: number) => (tin / 1e6) * rate(model).i + (tout / 1e6) * rate(model).o;

interface CallResult { text: string; model: string; tokensIn: number; tokensOut: number; costUSD: number; }

async function call(model: string, system: string, user: string, maxTokens = 220): Promise<CallResult> {
  // Anthropic-first provider routing only for anthropic slugs (avoids stale Bedrock); others route normally.
  const body: any = {
    model, max_tokens: maxTokens,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    usage: { include: true },
  };
  if (model.startsWith('anthropic/')) body.provider = { order: ['Anthropic'], allow_fallbacks: true };
  // Hard per-call timeout so one slow/hung provider can't stall the whole pipeline for minutes.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Number(process.env.CREW_CALL_TIMEOUT_MS || 60000));
  let d: any;
  try {
    const resp = await fetch(`${OR_URL}/chat/completions`, {
      method: 'POST', headers: { Authorization: `Bearer ${OR_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: ctrl.signal,
    });
    d = await resp.json();
  } catch (e: any) {
    d = { error: { message: e?.name === 'AbortError' ? 'call timed out' : (e?.message || 'call failed') } };
  } finally {
    clearTimeout(timer);
  }
  const tin = d.usage?.prompt_tokens ?? 0, tout = d.usage?.completion_tokens ?? 0;
  return { text: (d.choices?.[0]?.message?.content || d.error?.message || '').trim(), model: d.model || model, tokensIn: tin, tokensOut: tout, costUSD: costOf(model, tin, tout) };
}

export interface MissionPipelineResult {
  goals: string;
  team: TeamMember[];
  contributions: Array<{ crewId: string; model: string; text: string; costUSD: number }>;
  efficiency: { perMember: Record<string, number>; perProvider: Record<string, number>; totalCostUSD: number; totalTokens: number };
  missionPlan: string;
  topModel: string;
}

export async function runMissionPipeline(nlInput: string, clientId?: string | null): Promise<MissionPipelineResult> {
  if (!OR_KEY) throw new Error('CREW_LLM_APPROVED_KEY not set');
  const ledger: CallResult[] = [];

  // Async status: register this mission as in-flight so `pnpm status` and the prompt hook can show
  // it live (and derive a timeout if it silently hangs). Best-effort — never blocks the mission.
  const asyncDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const asyncId = beginAsync(asyncDir,
    { kind: 'mission', label: 'run_crew_mission_pipeline', timeoutMs: 180_000, ...(clientId ? { clientId } : {}) },
    Date.now());

  try {
    // 1. PICARD intake (top-tier) — distill goals, retain intent.
    const intake = await call(TOP_MODEL,
      'You are Captain Picard. Read the request and distill it into the crew\'s working brief. Output exactly:\nGOALS: <2-4 crisp goals, retaining the user\'s intended outcome>\nCONCEPTS: <key concepts/constraints>\nKeep it tight.',
      nlInput, 240);
    ledger.push(intake);
    const goals = intake.text;
    heartbeatAsync(asyncDir, asyncId, { progress: 20 }, Date.now());

    // 2 + 3. RIKER assembles + QUARK optimizes models (deterministic engine). FRUGAL caps officer
    // deliberation at tier-3 (deepseek) — no frontier escalation, the prior run's cost+latency driver.
    const plan = assembleAndOptimize(goals + '\n' + nlInput, FRUGAL ? 3 : 4);

    // 4. CREW executes — each member contributes on their Quark-assigned model (lounge style).
    const contributions = await Promise.all(plan.team.map(async (m) => {
      const r = await call(m.model,
        `You are ${m.crewId} (${m.domain}) of the Story Agent crew, in the Observation Lounge. Contribute YOUR domain's part toward the goals: a concrete position + one concern/resolution. 2-3 sentences.`,
        `GOALS:\n${goals}`, 160);
      ledger.push(r);
      return { crewId: m.crewId, model: r.model, text: r.text, costUSD: r.costUSD };
    }));
    heartbeatAsync(asyncDir, asyncId, { progress: 65 }, Date.now());

    // 5. QUARK efficiency report — isolate cost across the crew.
    const perMember: Record<string, number> = {};
    const perProvider: Record<string, number> = {};
    for (const m of plan.team) {
      const c = contributions.find(x => x.crewId === m.crewId)?.costUSD ?? 0;
      perMember[m.crewId] = Number(c.toFixed(5));
      perProvider[m.provider] = Number(((perProvider[m.provider] ?? 0) + c).toFixed(5));
    }
    const totalTokens = ledger.reduce((s, r) => s + r.tokensIn + r.tokensOut, 0);

    // 6. PICARD mission plan (top-tier) — synthesize a concrete plan to autonomously execute.
    const planResp = await call(TOP_MODEL,
      'You are Captain Picard on the highest-tier model. Synthesize the crew\'s contributions into a concrete MISSION PLAN: an ordered list of steps the crew will autonomously execute, each tagged with the owning crew member. When a step searches or counts files, make it RECURSIVE and complete (e.g. `find <dir> -name` or `rg`; do NOT use `-maxdepth 1` or other shallow limits) unless the task explicitly scopes it. End with "Make it so."',
      `GOALS:\n${goals}\n\nCREW CONTRIBUTIONS:\n${contributions.map(c => `${c.crewId}: ${c.text}`).join('\n')}`, 360);
    ledger.push(planResp);
    heartbeatAsync(asyncDir, asyncId, { progress: 90 }, Date.now());

    const finalTotalUSD = Number(ledger.reduce((s, r) => s + r.costUSD, 0).toFixed(5));

    // Control-lane ledger: record this CONFIRMED crew activation with its ACTUAL cost, so the
    // control-lane reporter shows real crew spend (not just the hook's delegation intent). Best-effort.
    try {
      recordCrewRun(asyncDir, {
        costUSD: finalTotalUSD, members: plan.team.length, label: 'run_crew_mission_pipeline', ...(clientId ? { clientId } : {}),
      });
    } catch { /* never block a mission on telemetry */ }

    endAsync(asyncDir, asyncId, 'done', Date.now());
    return {
      goals, team: plan.team, contributions,
      efficiency: { perMember, perProvider, totalCostUSD: finalTotalUSD, totalTokens },
      missionPlan: planResp.text, topModel: TOP_MODEL,
    };
  } catch (err) {
    endAsync(asyncDir, asyncId, 'failed', Date.now());
    throw err;
  }
}
