/**
 * Innovation Lounge — the crew's creative jam, then a real debate.
 *
 * Unlike the self-reflection Observation Lounge (crew-lounge.ts, fixed three-questions +
 * hardcoded synthesis), this is generative + deliberative:
 *
 *   1. PITCH    — each of the 11 crew members, in their canonical persona, invents an ORIGINAL
 *                 project/product they personally want to lead. Their creativity, their voice.
 *   2. DEBATE   — every member reads the full slate and reacts: which pitch they'd champion, the
 *                 challenge they raise (in-persona — Worf on security, Yar on quality, Quark on
 *                 cost), and how their own idea could combine with another.
 *   3. RESOLVE  — Picard reads ALL pitches + reactions and synthesizes a real portfolio decision
 *                 (pursue now / next / park), preserving dissent. This synthesis is LLM-driven,
 *                 not hardcoded — it actually reasons over what the crew produced.
 *
 * Each pitch + the session synthesis are stored to cloud RAG so the crew compounds: a later run
 * (or a human) can recall "what has the crew already dreamed up?" Frugal by default — every member
 * runs on their Quark-selected cheapest-adequate OpenRouter model.
 *
 * "There are no ranks in the observation lounge — only ideas." — adapted from Picard
 */
import { quarkSelectModel, crewBaseTier, MODEL_POOL } from './crew-team-assembly.js';
import { CREW_PERSONAS, CREW_MISSION_ORDER, getPersona, type CrewId } from './crew-personas.js';

/**
 * RAG persistence is dependency-injected so the engine has NO @story-agent/shared import: the MCP
 * tool injects the package functions, the tsx dev runner injects the source functions — each from the
 * path its runtime resolves. Both signatures are intentionally loose (the engine only needs them to
 * accept a record and return an id-bearing object or void).
 */
export interface LoungeDeps {
  storeCrewPersonalMemory?: (m: any) => Promise<unknown>;
  storeObservationMemory?: (m: any) => Promise<{ id?: string } | undefined | unknown>;
}

const OR_URL = (process.env.CREW_LLM_APPROVED_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const OR_KEY = process.env.CREW_LLM_APPROVED_KEY || '';
const CALL_TIMEOUT_MS = Math.max(4000, Number(process.env.CREW_CALL_TIMEOUT_MS || 7000));
const INNOVATION_CONCURRENCY = Math.max(1, Number(process.env.INNOVATION_LOUNGE_CONCURRENCY || 11));
const PERSIST_TIMEOUT_MS = Math.max(1000, Number(process.env.INNOVATION_LOUNGE_PERSIST_TIMEOUT_MS || 8000));

function rate(model: string) {
  const m = MODEL_POOL.find((x) => x.id === model);
  return m ? { i: m.costIn, o: m.costOut } : { i: 3, o: 15 };
}
const costOf = (model: string, tin: number, tout: number) => (tin / 1e6) * rate(model).i + (tout / 1e6) * rate(model).o;

interface CallResult { text: string; model: string; tokensIn: number; tokensOut: number; costUSD: number; }

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;

  async function runOne() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runOne());
  await Promise.all(workers);
  return out;
}

async function settleWithTimeout(promises: Array<Promise<unknown>>, timeoutMs: number) {
  if (!promises.length) return;
  await Promise.race([
    Promise.allSettled(promises),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | undefined> {
  return await Promise.race([
    promise,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), timeoutMs)),
  ]);
}

/** Direct OpenRouter completion (mirrors crew-mission-pipeline's call: provider routing + timeout + cost). */
async function call(model: string, system: string, user: string, maxTokens = 550): Promise<CallResult> {
  const body: any = {
    model, max_tokens: maxTokens, temperature: 0.85,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    usage: { include: true },
  };
  if (model.startsWith('anthropic/')) body.provider = { order: ['Anthropic'], allow_fallbacks: true };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS);
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

/**
 * Extract a `SECTION: ...` value from a labelled response. Tolerant of markdown the models add —
 * `**LABEL:**`, leading bullets/quotes — and stops at the next label or EOF. (Strips `**` first so
 * a bolded next-label still terminates the capture.)
 */
function section(raw: string, key: string): string {
  const clean = raw.replace(/\*\*/g, '').replace(/\r/g, '');
  const m = clean.match(new RegExp(`(?:^|\\n)[>*#\\s]*${key}\\s*:\\s*([\\s\\S]*?)(?=\\n[>*#\\s]*[A-Z_]{3,}\\s*:|$)`));
  return m ? m[1].trim() : '';
}

// ── TYPES ────────────────────────────────────────────────────────────────────

export interface ProjectPitch {
  crewId: CrewId;
  fullName: string;
  rank: string;
  role: string;
  model: string;
  projectName: string;
  elevatorPitch: string;
  whyMe: string;
  whatItBuilds: string;
  firstMilestone: string;
  closing: string;
  costUSD: number;
}

export interface LoungeReaction {
  crewId: CrewId;
  fullName: string;
  model: string;
  endorses: string;
  endorseWhy: string;
  challenge: string;
  synergy: string;
  costUSD: number;
}

export interface InnovationLoungeResult {
  sessionId: string;
  stardate: string;
  theme: string;
  mode: 'full' | 'forum';
  incomplete?: boolean;
  timeoutMs?: number;
  elapsedMs?: number;
  pitches: ProjectPitch[];
  reactions: LoungeReaction[];
  synthesis: string;
  collectiveNextSteps: string[];
  portfolio: { pursueNow: string[]; pursueNext: string[]; park: string[] };
  dissent: Array<{ crewId: string; concern: string }>;
  efficiency: { perMember: Record<string, number>; totalCostUSD: number; totalTokens: number };
  observationMemoryId?: string;
}

// ── PROMPTS ──────────────────────────────────────────────────────────────────

function pitchSystem(crewId: CrewId): string {
  return `${CREW_PERSONAS[crewId].baseSystemPromptSeed}

You are in the Innovation Lounge — not a mission briefing, but a creative jam. The crew has been invited to dream. You are not analyzing someone else's ticket; you are inventing something of your own. Speak in your authentic voice, with the creativity and conviction your character is known for.`;
}

function pitchUser(theme: string): string {
  return `The crew has gathered in the Innovation Lounge to each pitch an ORIGINAL project, product, or capability they personally want to lead — born from who they are.

Theme / arena: ${theme}

This is YOUR idea. Let your character drive it — your history, your obsessions, your strengths, even your flaws. It can extend the Story Agent platform, serve a client of the firm, or be a bold new venture. Be specific and inventive. Avoid generic "build a dashboard" answers — make it unmistakably yours.

Respond EXACTLY in this format:

PROJECT_NAME: [a memorable name]
ELEVATOR_PITCH: [2-3 sentences — what it is and why it matters]
WHY_ME: [1-2 sentences — why YOUR character is the one to lead this]
WHAT_IT_BUILDS: [2-4 sentences — the concrete thing that gets built / the shape of it]
FIRST_MILESTONE: [1-2 sentences — the first shippable step]
CLOSING: [one signature sentence in your voice]`;
}

function reactionSystem(crewId: CrewId): string {
  return `${CREW_PERSONAS[crewId].baseSystemPromptSeed}

You are in the Innovation Lounge debate. Your crewmates have each pitched a project. You react honestly and in-character: champion the one you believe in, raise the hard question only you would think to ask, and look for how ideas combine. This is collegial but real — you do not rubber-stamp.`;
}

function reactionUser(slate: string, ownName: string): string {
  return `Here is the full slate of project pitches from the crew:

${slate}

React to the slate (NOT your own pitch "${ownName}"). Be specific — name the project(s) you mean.

Respond EXACTLY in this format:

ENDORSE: [the project name you would champion]
ENDORSE_WHY: [1-2 sentences — why it deserves resources]
CHALLENGE: [1-2 sentences — the biggest risk or hard question you raise, from YOUR domain]
SYNERGY: [1-2 sentences — how two of these pitches could combine into something stronger]`;
}

function synthesisUser(slate: string, debate: string, theme: string): string {
  return `You are Captain Picard, closing the Innovation Lounge. The crew has pitched ${CREW_MISSION_ORDER.length} projects (arena: ${theme}) and debated them. Do not summarize politely — REASON over what they produced and make a real portfolio decision.

THE PITCHES:
${slate}

THE DEBATE (endorsements, challenges, synergies):
${debate}

Synthesize. Identify how the ideas cluster and interrelate, then decide what the firm pursues. Be decisive and frugal — most ideas should wait.

Respond EXACTLY in this format:

SYNTHESIS: [3-5 sentences — the through-line across the slate; what the crew is collectively reaching for]
CLUSTERS: [the natural groupings of ideas, and which reinforce each other]
PURSUE_NOW: [1-2 project names to greenlight immediately, each with a one-line reason; semicolon-separated]
PURSUE_NEXT: [project names to queue for the next cycle; semicolon-separated]
PARK: [project names to defer, with a one-line reason each; semicolon-separated]
DISSENT: [genuine unresolved concerns worth preserving, attributed to a crew member where clear; semicolon-separated]
COLLECTIVE_NEXT_STEPS: [3-6 concrete next actions for the crew; semicolon-separated]
DECISION: [one closing line — "Make it so."-style]`;
}

// ── PARSERS ──────────────────────────────────────────────────────────────────

/** Strip wrapping markdown emphasis / quotes / bullets the models like to add around short strings. */
function cleanName(s: string): string {
  return s.replace(/^[\s>*"'#.\-]+/, '').replace(/[\s*"']+$/, '').trim();
}

function splitList(s: string): string[] {
  return s.split(/;|\n[-*]\s|\n\d+\.\s/).map((x) => cleanName(x)).filter((x) => x.length > 2);
}

// ── ENGINE ───────────────────────────────────────────────────────────────────

export async function runInnovationLounge(options?: {
  theme?: string;
  crewIds?: CrewId[];
  mode?: 'full' | 'forum';
  timeoutMs?: number;
  store?: boolean;
  deps?: LoungeDeps;
}): Promise<InnovationLoungeResult> {
  if (!OR_KEY) throw new Error('CREW_LLM_APPROVED_KEY not set — Innovation Lounge needs the crew LLM key');
  const theme = options?.theme ?? 'the future of the Story Agent platform and the consultancy firm it serves';
  const mode = options?.mode ?? 'full';
  const timeoutMs = Math.max(10000, options?.timeoutMs ?? Number(process.env.INNOVATION_LOUNGE_TIMEOUT_MS || (mode === 'full' ? 60000 : 25000)));
  const startedAtMs = Date.now();
  const crewIds = options?.crewIds ?? CREW_MISSION_ORDER;
  const debateCrewIds: CrewId[] = mode === 'forum' ? ['picard', 'worf', 'data', 'quark'] : crewIds;
  const deps = options?.deps ?? {};
  // Only persist when a store fn was injected (the engine has no db import of its own).
  const store = (options?.store ?? true) && !!deps.storeCrewPersonalMemory;
  const sessionId = `innovation-${Date.now()}`;
  const stardate = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  const perMember: Record<string, number> = {};
  let totalTokens = 0;

  // 1. PITCH ROUND — each member invents their own project.
  const memoryWrites: Array<Promise<unknown>> = [];
  const pitches = await mapWithConcurrency(crewIds, INNOVATION_CONCURRENCY, async (crewId) => {
    const p = getPersona(crewId);
    const model = quarkSelectModel(crewBaseTier(crewId)).id;
    const r = await call(model, pitchSystem(crewId), pitchUser(theme), 340);
    perMember[crewId] = (perMember[crewId] ?? 0) + r.costUSD;
    totalTokens += r.tokensIn + r.tokensOut;
    const pitch: ProjectPitch = {
      crewId, fullName: p.fullName, rank: p.rank, role: p.engineeringRole, model: r.model,
      projectName: cleanName(section(r.text, 'PROJECT_NAME')) || `[${p.fullName}'s project]`,
      elevatorPitch: section(r.text, 'ELEVATOR_PITCH') || 'Pitch unavailable (model timeout/failure).',
      whyMe: section(r.text, 'WHY_ME'),
      whatItBuilds: section(r.text, 'WHAT_IT_BUILDS'),
      firstMilestone: section(r.text, 'FIRST_MILESTONE'),
      closing: section(r.text, 'CLOSING'),
      costUSD: r.costUSD,
    };

    if (store && pitch.elevatorPitch) {
      memoryWrites.push(
        deps.storeCrewPersonalMemory!({
          crew_id: crewId,
          memory_type: 'insight',
          title: `Innovation Lounge pitch — "${pitch.projectName}" by ${p.fullName}`,
          content: [
            `PROJECT: ${pitch.projectName}`,
            `PITCH: ${pitch.elevatorPitch}`,
            `WHY ME: ${pitch.whyMe}`,
            `WHAT IT BUILDS: ${pitch.whatItBuilds}`,
            `FIRST MILESTONE: ${pitch.firstMilestone}`,
            `— ${pitch.closing}`,
          ].join('\n'),
          tags: ['innovation-lounge', 'project-pitch', 'ideation', p.engineeringRole, sessionId],
        }).catch(() => undefined),
      );
    }

    return pitch;
  });

  if (Date.now() - startedAtMs > timeoutMs) {
    return {
      sessionId,
      stardate,
      theme,
      mode,
      incomplete: true,
      timeoutMs,
      elapsedMs: Date.now() - startedAtMs,
      pitches,
      reactions: [],
      synthesis: 'Innovation Lounge timed out after pitch round; returning partial forum output.',
      collectiveNextSteps: [],
      portfolio: { pursueNow: [], pursueNext: [], park: [] },
      dissent: [],
      efficiency: { perMember, totalCostUSD: Object.values(perMember).reduce((a, b) => a + b, 0), totalTokens },
    };
  }

  // 2. DEBATE ROUND — everyone reacts to the slate.
  const slate = pitches
    .map((p) => `• "${p.projectName}" (${p.fullName}, ${p.role}): ${p.elevatorPitch}`)
    .join('\n');
  const reactions = await mapWithConcurrency(debateCrewIds, INNOVATION_CONCURRENCY, async (crewId) => {
    const p = getPersona(crewId);
    const model = quarkSelectModel(crewBaseTier(crewId)).id;
    const own = pitches.find((x) => x.crewId === crewId)?.projectName ?? '';
    const r = await call(model, reactionSystem(crewId), reactionUser(slate, own), 220);
    perMember[crewId] = (perMember[crewId] ?? 0) + r.costUSD;
    totalTokens += r.tokensIn + r.tokensOut;
    return {
      crewId, fullName: p.fullName, model: r.model,
      endorses: cleanName(section(r.text, 'ENDORSE')),
      endorseWhy: section(r.text, 'ENDORSE_WHY') || 'No endorsement rationale returned.',
      challenge: section(r.text, 'CHALLENGE'),
      synergy: section(r.text, 'SYNERGY'),
      costUSD: r.costUSD,
    } satisfies LoungeReaction;
  });

  if (Date.now() - startedAtMs > timeoutMs) {
    return {
      sessionId,
      stardate,
      theme,
      mode,
      incomplete: true,
      timeoutMs,
      elapsedMs: Date.now() - startedAtMs,
      pitches,
      reactions,
      synthesis: 'Innovation Lounge timed out after debate round; returning partial forum output.',
      collectiveNextSteps: [],
      portfolio: { pursueNow: [], pursueNext: [], park: [] },
      dissent: [],
      efficiency: { perMember, totalCostUSD: Object.values(perMember).reduce((a, b) => a + b, 0), totalTokens },
    };
  }

  // 3. RESOLVE — Picard reasons over pitches + debate and decides the portfolio.
  const debate = reactions
    .map((x) => `${x.fullName}: endorses "${x.endorses}" (${x.endorseWhy}) | challenge: ${x.challenge} | synergy: ${x.synergy}`)
    .join('\n');
  const picardModel = quarkSelectModel(crewBaseTier('picard')).id;
  const synth = await call(picardModel, pitchSystem('picard'), synthesisUser(slate, debate, theme), 520);
  perMember['picard'] = (perMember['picard'] ?? 0) + synth.costUSD;
  totalTokens += synth.tokensIn + synth.tokensOut;

  const clusters = section(synth.text, 'CLUSTERS');
  const synthesis = [section(synth.text, 'SYNTHESIS'), clusters && `\n**Clusters:**\n${clusters}`]
    .filter(Boolean).join('\n').trim() || synth.text;
  const portfolio = {
    pursueNow: splitList(section(synth.text, 'PURSUE_NOW')),
    pursueNext: splitList(section(synth.text, 'PURSUE_NEXT')),
    park: splitList(section(synth.text, 'PARK')),
  };
  const dissent = splitList(section(synth.text, 'DISSENT')).map((concern) => ({ crewId: 'crew', concern }));
  const collectiveNextSteps = splitList(section(synth.text, 'COLLECTIVE_NEXT_STEPS'));
  const totalCostUSD = Object.values(perMember).reduce((a, b) => a + b, 0);

  const result: InnovationLoungeResult = {
    sessionId, stardate, theme, mode, pitches, reactions,
    timeoutMs,
    elapsedMs: Date.now() - startedAtMs,
    synthesis,
    collectiveNextSteps,
    portfolio, dissent,
    efficiency: { perMember, totalCostUSD, totalTokens },
  };

  // Store the whole session to crew-wide RAG.
  if (store && deps.storeObservationMemory) {
    await settleWithTimeout(memoryWrites, PERSIST_TIMEOUT_MS);
    const obs = (await withTimeout(deps.storeObservationMemory({
      storyId: 'innovation-lounge',
      source: 'mcp',
      transcript: {
        rounds: [
          { title: `Innovation Lounge — ${theme}`, entries: pitches.map((p) => ({ speakerId: p.crewId, position: 'support', statement: `"${p.projectName}" — ${p.elevatorPitch}`, evidence: [p.model, 'project-pitch'] })) },
          { title: 'Debate', entries: reactions.map((x) => ({ speakerId: x.crewId, position: 'support', statement: `endorses "${x.endorses}"; challenge: ${x.challenge}`, evidence: [x.model] })) },
        ],
        consensusSummary: synth.text,
        unresolvedRisks: dissent.map((d) => d.concern),
        finalDecision: 'approved',
        actionItems: collectiveNextSteps.length ? collectiveNextSteps : [...portfolio.pursueNow, ...portfolio.pursueNext],
      },
      tags: ['innovation-lounge', 'ideation', 'crew-wide', 'portfolio', sessionId],
    }).catch(() => undefined), PERSIST_TIMEOUT_MS)) as { id?: string } | undefined;
    if (obs?.id) result.observationMemoryId = obs.id;
  }

  return result;
}

// ── FORMATTING ───────────────────────────────────────────────────────────────

export function formatInnovationLoungeAsMarkdown(r: InnovationLoungeResult): string {
  const lines: string[] = [
    `# Innovation Lounge — Crew Creative Jam`,
    ``,
    `**Stardate:** ${r.stardate}  |  **Session:** ${r.sessionId}`,
    `**Arena:** ${r.theme}`,
    `**Mode:** ${r.mode}`,
    `**Attendees:** ${r.pitches.map((p) => p.fullName).join(', ')}`,
    `**Cost:** $${r.efficiency.totalCostUSD.toFixed(4)} (${r.efficiency.totalTokens} tokens)`,
    ``,
    `> Each crew member invented an original project in their own voice, the crew debated the slate,`,
    `> and Captain Picard resolved a portfolio. Pitches + synthesis stored to cloud RAG`,
    r.observationMemoryId ? `> (observation memory \`${r.observationMemoryId}\`).` : `.`,
    ``,
    `---`,
    ``,
    `## The Pitches`,
    ``,
  ];
  for (const p of r.pitches) {
    lines.push(`### "${p.projectName}" — ${p.rank} ${p.fullName} *(${p.role})*`);
    lines.push(``);
    lines.push(`${p.elevatorPitch}`);
    lines.push(``);
    if (p.whyMe) lines.push(`- **Why me:** ${p.whyMe}`);
    if (p.whatItBuilds) lines.push(`- **What it builds:** ${p.whatItBuilds}`);
    if (p.firstMilestone) lines.push(`- **First milestone:** ${p.firstMilestone}`);
    lines.push(``);
    if (p.closing) lines.push(`> *"${p.closing}"*`);
    lines.push(``);
    lines.push(`<sub>model: ${p.model} · $${p.costUSD.toFixed(4)}</sub>`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }
  lines.push(`## The Debate`);
  lines.push(``);
  for (const x of r.reactions) {
    lines.push(`**${x.fullName}** — champions **"${x.endorses}"**: ${x.endorseWhy}`);
    if (x.challenge) lines.push(`  - ⚔️ *Challenge:* ${x.challenge}`);
    if (x.synergy) lines.push(`  - 🔗 *Synergy:* ${x.synergy}`);
    lines.push(``);
  }
  lines.push(`## Captain Picard's Resolution`);
  lines.push(``);
  lines.push(r.synthesis);
  lines.push(``);
  lines.push(`## Portfolio Decision`);
  lines.push(``);
  lines.push(`**Pursue now:**`);
  r.portfolio.pursueNow.forEach((x) => lines.push(`- ${x}`));
  lines.push(``);
  lines.push(`**Pursue next:**`);
  r.portfolio.pursueNext.forEach((x) => lines.push(`- ${x}`));
  lines.push(``);
  lines.push(`**Parked:**`);
  r.portfolio.park.forEach((x) => lines.push(`- ${x}`));
  lines.push(``);
  if (r.collectiveNextSteps.length) {
    lines.push(`## Collective Next Steps`);
    lines.push(``);
    r.collectiveNextSteps.forEach((x) => lines.push(`- ${x}`));
    lines.push(``);
  }
  if (r.dissent.length) {
    lines.push(`## Dissent (Preserved)`);
    lines.push(``);
    r.dissent.forEach((d) => lines.push(`- ${d.concern}`));
    lines.push(``);
  }
  return lines.join('\n');
}
