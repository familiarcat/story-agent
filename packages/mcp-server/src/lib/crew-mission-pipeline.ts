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
import { assembleAndOptimize, degradeTeamForStress, quarkSelectModel, MODEL_POOL, type TeamMember } from './crew-team-assembly.js';
import {
  quarkSelectAvailableModel,
  markModelTemporarilyUnavailable,
  isLikelyModelAvailabilityError,
} from './openrouter-model-availability.js';
import { recordCrewRun, beginAsync, heartbeatAsync, endAsync } from '@story-agent/shared';
import {
  buildDigest,
  buildReflectionSystemPrompt,
  summarizeReflection,
  resolveReflectionRounds,
  type ReflectionSummary,
} from './reflection-rounds.js';
import { buildStructuredPrompt, scoreFramingTips, FRAMING_TIP_REMINDER, type FramingScore } from './prompt-standards.js';

const OR_URL = (process.env.CREW_LLM_APPROVED_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const OR_KEY = process.env.CREW_LLM_APPROVED_KEY || '';
// Cost-minimization: FRUGAL by default keeps both Picard's synthesis bookends and the crew body at
// tier-3 cost profiles. Set CREW_FRUGAL=false for deliberate tier-4 synthesis runs.
const FRUGAL = process.env.CREW_FRUGAL !== 'false';
const TOP_MODEL = quarkSelectModel(FRUGAL ? 3 : 4).id;

function rate(model: string) {
  const m = MODEL_POOL.find(x => x.id === model);
  return m ? { i: m.costIn, o: m.costOut } : { i: 3, o: 15 };
}
const costOf = (model: string, tin: number, tout: number) => (tin / 1e6) * rate(model).i + (tout / 1e6) * rate(model).o;

interface CallResult { text: string; model: string; tokensIn: number; tokensOut: number; costUSD: number; }

async function call(model: string, system: string, user: string, maxTokens = 220): Promise<CallResult> {
  const tier = MODEL_POOL.find((m) => m.id === model)?.tier ?? 3;
  let selectedModel = await quarkSelectAvailableModel(tier, { preferredModelId: model });
  const body: any = {
    model: selectedModel.id, max_tokens: maxTokens,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    usage: { include: true },
  };
  // Hard per-call timeout so one slow/hung provider can't stall the whole pipeline for minutes.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Number(process.env.CREW_CALL_TIMEOUT_MS || 60000));
  let d: any;
  try {
    const resp = await fetch(`${OR_URL}/chat/completions`, {
      method: 'POST', headers: { Authorization: `Bearer ${OR_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: ctrl.signal,
    });
    if (!resp.ok) {
      const errText = await resp.text();
      if (isLikelyModelAvailabilityError(resp.status, errText)) {
        markModelTemporarilyUnavailable(selectedModel.id);
        selectedModel = await quarkSelectAvailableModel(tier, {
          excludeModelIds: [selectedModel.id],
        });
        const retryBody = { ...body, model: selectedModel.id };
        const retry = await fetch(`${OR_URL}/chat/completions`, {
          method: 'POST', headers: { Authorization: `Bearer ${OR_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(retryBody), signal: ctrl.signal,
        });
        d = await retry.json();
      } else {
        d = { error: { message: `openrouter ${resp.status}: ${errText.slice(0, 180)}` } };
      }
    } else {
      d = await resp.json();
    }
  } catch (e: any) {
    d = { error: { message: e?.name === 'AbortError' ? 'call timed out' : (e?.message || 'call failed') } };
  } finally {
    clearTimeout(timer);
  }
  const tin = d.usage?.prompt_tokens ?? 0, tout = d.usage?.completion_tokens ?? 0;
  const usedModel = d.model || selectedModel.id;
  return { text: (d.choices?.[0]?.message?.content || d.error?.message || '').trim(), model: usedModel, tokensIn: tin, tokensOut: tout, costUSD: costOf(usedModel, tin, tout) };
}

export interface MissionAlternative {
  label: 'conservative' | 'balanced' | 'aggressive';
  missionPlan: string;
  riskLevel: 'low' | 'medium' | 'high';
  costDelta: number; // relative to baseline (0 = same, negative = cheaper, positive = more expensive)
  reasoning: string;
}

export interface MissionPipelineResult {
  goals: string;
  team: TeamMember[];
  contributions: Array<{ crewId: string; model: string; text: string; costUSD: number }>;
  efficiency: { perMember: Record<string, number>; perProvider: Record<string, number>; totalCostUSD: number; totalTokens: number };
  missionPlan: string; // the default (balanced) plan for backward compatibility
  topModel: string;
  // Rule of Three: alternatives + variance detection
  alternatives?: MissionAlternative[];
  variance?: { exists: boolean; summary: string };
  /** Opening (blind) positions, before any reflection. `contributions` holds the FINAL positions. */
  openingPositions?: Array<{ crewId: string; model: string; text: string; costUSD: number }>;
  /** Each reflection round's contributions, in order. */
  reflections?: Array<Array<{ crewId: string; model: string; text: string; costUSD: number }>>;
  /** Did anyone actually move? Carries the anti-theater warning. */
  reflection?: ReflectionSummary;
  /** Interview-deck framing tips (scenario/tradeoff/eval/security≠prompt), scored per opening
   *  position — advisory coaching signal, keyed by crewId. See prompt-standards.ts. */
  framingScores?: Record<string, FramingScore>;
}

export async function runMissionPipeline(
  nlInput: string,
  clientId?: string | null,
  complexity?: number,
  reflectionRounds?: number,
  /** Decision 3 (2026-08-10): when the caller has evidence this task type is under stress (e.g. a
   *  prior run on it stalled or blew its budget), trim the crew and escalate survivors' model tier
   *  instead of running the same full-size team into the same wall again. */
  opts?: { stress?: boolean },
): Promise<MissionPipelineResult> {
  if (!OR_KEY) throw new Error('CREW_LLM_APPROVED_KEY not set');
  const ledger: CallResult[] = [];

  // Async status: register this mission as in-flight so `pnpm status` and the prompt hook can show
  // it live (and derive a timeout if it silently hangs). Best-effort — never blocks the mission.
  const asyncDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const asyncId = beginAsync(asyncDir,
    { kind: 'mission', label: 'run_crew_mission_pipeline', timeoutMs: 180_000, ...(clientId ? { clientId } : {}) },
    Date.now());

  try {
    // 1. PICARD intake (top-tier) — distill goals, retain intent. Structured per Prompt Eng Q2
    // (Role→Context→Task→Constraints→Output Format) so the instruction removes ambiguity instead
    // of relying on prose the model has to parse apart itself.
    const complexityLabel = !complexity ? 'unspecified' : complexity < 0.33 ? 'low' : complexity < 0.66 ? 'moderate' : 'high';
    const intakeSystem = buildStructuredPrompt({
      role: 'You are Captain Picard, distilling an operator request into the crew\'s working brief.',
      task: 'Read the request and distill it into GOALS and CONCEPTS.',
      constraints: [
        'Retain the user\'s intended outcome — do not narrow or reinterpret scope.',
        `Task complexity is ${complexityLabel}${complexity ? ` (score: ${complexity.toFixed(2)} on 0-1 scale)` : ''} — adjust team scope accordingly.`,
        'Keep it tight — this is a working brief, not a report.',
      ],
      outputFormat: 'Output exactly:\nGOALS: <2-4 crisp goals, retaining the user\'s intended outcome>\nCONCEPTS: <key concepts/constraints>',
    });
    const intake = await call(TOP_MODEL, intakeSystem, nlInput, 240);
    ledger.push(intake);
    const goals = intake.text;
    heartbeatAsync(asyncDir, asyncId, { progress: 20 }, Date.now());

    // 2 + 3. RIKER assembles + QUARK optimizes models (deterministic engine). FRUGAL caps officer
    // deliberation at tier-3 (deepseek) — no frontier escalation, the prior run's cost+latency driver.
    let plan = assembleAndOptimize(goals + '\n' + nlInput, FRUGAL ? 3 : 4);
    if (opts?.stress) {
      const degraded = degradeTeamForStress(plan.team, goals + '\n' + nlInput);
      plan = { ...plan, team: degraded.team };
      ledger.push({ text: degraded.note, model: 'system', tokensIn: 0, tokensOut: 0, costUSD: 0 });
    }

    // 4. CREW deliberates — round 1 is the BLIND opening position (each officer independent), then
    // N reflection rounds where each officer reads the others and must declare REVISED / HELD /
    // CONCEDED. Blind-only deliberation cannot catch a confabulation that another officer already
    // contradicted, which is why rounds exist. See reflection-rounds.ts for the anti-theater rule.
    const contributionSystem = (crewId: string, domain: string) => buildStructuredPrompt({
      role: `You are ${crewId} (${domain}) of the Story Agent crew, in the Observation Lounge.`,
      task: 'Contribute YOUR domain\'s part toward the goals: a concrete position + one concern/resolution.',
      constraints: ['2-3 sentences.', FRAMING_TIP_REMINDER],
    });
    let contributions = await Promise.all(plan.team.map(async (m) => {
      const r = await call(m.model, contributionSystem(m.crewId, m.domain), `GOALS:\n${goals}`, 160);
      ledger.push(r);
      return { crewId: m.crewId, model: r.model, text: r.text, costUSD: r.costUSD };
    }));

    // Score the opening positions against the deck's four framing badges (advisory only — see
    // prompt-standards.ts; nothing here blocks or reruns a contribution, it's a coaching signal
    // carried through to the efficiency report and RAG so recurring gaps become visible over time).
    const framingScores: Record<string, FramingScore> = {};
    for (const c of contributions) framingScores[c.crewId] = scoreFramingTips(c.text);

    const openingPositions = contributions;
    const reflectionRoundCount = resolveReflectionRounds(reflectionRounds);
    const reflections: Array<Array<{ crewId: string; model: string; text: string; costUSD: number }>> = [];

    for (let round = 2; round <= reflectionRoundCount + 1; round++) {
      const previous = contributions;
      const thisRound = await Promise.all(plan.team.map(async (m) => {
        const digest = buildDigest(previous, m.crewId);
        // Nothing to react to (solo team) → skip rather than have them argue with themselves.
        if (!digest) return { crewId: m.crewId, model: m.model, text: previous.find(p => p.crewId === m.crewId)?.text ?? '', costUSD: 0 };
        const r = await call(m.model,
          `${buildReflectionSystemPrompt(m.crewId, m.domain, round - 1, reflectionRoundCount)}\n${FRAMING_TIP_REMINDER}`,
          `GOALS:\n${goals}\n\nYOUR PREVIOUS POSITION:\n${previous.find(p => p.crewId === m.crewId)?.text ?? '(none)'}\n\nOTHER OFFICERS:\n${digest}`, 180);
        ledger.push(r);
        return { crewId: m.crewId, model: r.model, text: r.text, costUSD: r.costUSD };
      }));
      reflections.push(thisRound);
      contributions = thisRound;
      heartbeatAsync(asyncDir, asyncId, { progress: 40 + round * 8 }, Date.now());
    }

    const reflection = summarizeReflection(reflections);
    heartbeatAsync(asyncDir, asyncId, { progress: 65 }, Date.now());

    // 5. QUARK efficiency report — isolate cost across the crew.
    const perMember: Record<string, number> = {};
    const perProvider: Record<string, number> = {};
    // Cost must span EVERY round, not just the final one — reflection multiplies officer calls, and
    // reporting only the last round would understate the true spend by ~the number of rounds.
    const allRounds = [openingPositions, ...reflections];
    for (const m of plan.team) {
      const c = allRounds.reduce((sum, round) => sum + (round.find(x => x.crewId === m.crewId)?.costUSD ?? 0), 0);
      perMember[m.crewId] = Number(c.toFixed(5));
      perProvider[m.provider] = Number(((perProvider[m.provider] ?? 0) + c).toFixed(5));
    }
    const totalTokens = ledger.reduce((s, r) => s + r.tokensIn + r.tokensOut, 0);

    // 6. PICARD mission plan (top-tier) — synthesize THREE alternative plans (Rule of Three).
    // This enables user choice when the crew diverges on approach.
    const alternativesPrompt = `You are Captain Picard. The crew has deliberated this task. Generate THREE alternative mission plans:

CONSERVATIVE: Low-risk, minimal scope. Fast to execute, reduces downstream issues.
BALANCED: Standard scope with moderate risk. Recommended default.
AGGRESSIVE: Comprehensive, maximizes value but higher complexity/risk.

For each plan, provide:
1. A numbered list of steps (each tagged with the owning crew member)
2. A one-line reasoning
3. Risk level (low/medium/high)

When a step searches or counts files, make it RECURSIVE unless explicitly scoped.

GROUNDING (do not skip): only reference systems, files, databases, or tools that were actually named
in GOALS or FINAL CREW POSITIONS above. Do not invent a specific file path, database name, or system
(e.g. a fictional "Roster.txt" or "HRIS-7") to make a step sound concrete — if a step's real
implementation is unknown to you, describe it at the level you actually know (e.g. "consult the crew
registry") rather than fabricating a plausible-sounding specific. An abstract but honest step beats a
concrete but invented one.

Output ONLY the structure below — begin your reply with "===== CONSERVATIVE =====", no preamble,
no summary before it, no markdown fences around the whole thing (Prompt Eng Q4: a downstream
parser reads this by marker, not by asking a model to describe its own output). Format:

===== CONSERVATIVE =====
[steps]
Reasoning: [one line]
Risk: low

===== BALANCED =====
[steps]
Reasoning: [one line]
Risk: medium

===== AGGRESSIVE =====
[steps]
Reasoning: [one line]
Risk: high

===== VARIANCE ASSESSMENT =====
Flag any disagreement between the three approaches (e.g., "teams diverged on whether to migrate vs patch"). If no variance, say "Consensus across all three approaches."`;

    const alternativesResp = await call(TOP_MODEL, alternativesPrompt,
      `GOALS:\n${goals}\n\nFINAL CREW POSITIONS (after ${reflection.rounds} reflection round(s)):\n` + contributions.map(c => `${c.crewId}: ${c.text}`).join('\n')
      + `\n\nREFLECTION OUTCOME: ${reflection.note}`
      + (reflection.theaterWarning
          ? '\n\nIMPORTANT: no officer changed position, so their agreement is NOT corroboration. Do not present this plan as crew consensus — state that it is unvalidated by disagreement.'
          : `\n\nOfficers who moved: ${reflection.positionsChanged.join(', ')}. Weight the positions that survived challenge over those that were merely repeated.`), 900);
    ledger.push(alternativesResp);
    heartbeatAsync(asyncDir, asyncId, { progress: 85 }, Date.now());

    // Parse the three alternatives from Picard's response.
    function extractAlternatives(text: string): { alternatives: MissionAlternative[]; variance: { exists: boolean; summary: string } } {
      const conservative = text.match(/===== CONSERVATIVE =====\n([\s\S]*?)===== BALANCED =====/)?.[1]?.trim() || '';
      const balanced = text.match(/===== BALANCED =====\n([\s\S]*?)===== AGGRESSIVE =====/)?.[1]?.trim() || '';
      const aggressive = text.match(/===== AGGRESSIVE =====\n([\s\S]*?)===== VARIANCE/)?.[1]?.trim() || '';
      const varianceText = text.match(/===== VARIANCE ASSESSMENT =====\n([\s\S]*?)$/)?.[1]?.trim() || '';

      const varianceExists = !varianceText.toLowerCase().includes('consensus') && varianceText.length > 10;
      return {
        alternatives: [
          { label: 'conservative', missionPlan: conservative, riskLevel: 'low', costDelta: -0.15, reasoning: 'Low-risk, minimal scope' },
          { label: 'balanced', missionPlan: balanced, riskLevel: 'medium', costDelta: 0, reasoning: 'Recommended standard approach' },
          { label: 'aggressive', missionPlan: aggressive, riskLevel: 'high', costDelta: 0.25, reasoning: 'Comprehensive, maximum value' },
        ],
        variance: { exists: varianceExists, summary: varianceText },
      };
    }

    const { alternatives, variance } = extractAlternatives(alternativesResp.text);

    // For backward compatibility, use the balanced plan as the default.
    const balancedPlan = alternatives.find(a => a.label === 'balanced')?.missionPlan || alternativesResp.text;

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
      missionPlan: balancedPlan, topModel: TOP_MODEL,
      alternatives, variance,
      openingPositions, reflections, reflection, framingScores,
    };
  } catch (err) {
    endAsync(asyncDir, asyncId, 'failed', Date.now());
    throw err;
  }
}
