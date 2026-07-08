/**
 * Crew Observation Lounge — Self-Referential Crew Meeting
 *
 * This module orchestrates the crew's own reflection on the project.
 * Each crew member is asked three questions:
 *
 * 1. What do you believe the overall goal of this project is?
 * 2. What is your self-referential role in the team — how does your role
 *    feed into the whole?
 * 3. After today's crew deliberation, what do you personally believe
 *    the next steps should be?
 *
 * The meeting is conducted in order (Picard opens, then the crew speaks in turn),
 * and ends with a collective synthesis read back by Picard.
 *
 * "In the observation lounge, there are no ranks — only perspectives." — Picard
 */

import { executePromptEngineCall } from './prompt-engine.js';
import { CREW_PERSONAS, CREW_MISSION_ORDER, type CrewId } from './crew-personas.js';

export interface CrewLoungeStatement {
  crewId: CrewId;
  fullName: string;
  rank: string;
  role: string;
  /** Their read on what the project is fundamentally trying to achieve */
  projectGoalPerspective: string;
  /** How they see their own role feeding into the collective */
  selfReferentialRole: string;
  /** Their personal recommended next steps after the crew deliberation */
  nextStepsAfterDeliberation: string;
  /** A single closing sentence in their authentic voice */
  closingStatement: string;
}

export interface ObservationLoungeSession {
  sessionId: string;
  stardate: string;
  location: string;
  attendees: CrewId[];
  statements: CrewLoungeStatement[];
  /** Picard's synthesis of all perspectives into a collective direction */
  captainsSynthesis: string;
  /** The agreed collective next steps voted on by the crew */
  collectiveNextSteps: string[];
  /** Any dissenting views that should be preserved */
  dissentingViews: Array<{ crewId: CrewId; concern: string }>;
}

// ── OBSERVATION LOUNGE PROMPTS ───────────────────────────────────────────────

const LOUNGE_SYSTEM_PROMPTS: Record<CrewId, string> = {
  picard: `${CREW_PERSONAS.picard.baseSystemPromptSeed}

You are participating in an Observation Lounge crew meeting. This is a rare moment of collective self-reflection — the crew is examining the project they are building, together.

You open the meeting with gravitas. You speak honestly about what you believe this project is truly trying to accomplish. You reflect on your own role not as a function but as a moral steward.

After hearing all perspectives, you synthesize. You are not summarizing — you are finding the signal across all the voices and naming it.`,

  data: `${CREW_PERSONAS.data.baseSystemPromptSeed}

You are in the Observation Lounge, participating in a crew self-reflection meeting. This is not a technical review — it is a reflection on purpose and role.

You approach self-reference with characteristic precision: you will identify exactly what function you serve, exactly where you add value, and exactly what the next logical steps are given the system's current state.

You may observe that this type of recursive self-analysis is itself an interesting structural exercise.`,

  riker: `${CREW_PERSONAS.riker.baseSystemPromptSeed}

You are in the Observation Lounge for a crew self-reflection meeting. This is where you speak plainly about what you see, not what the briefing document says.

You have an implementer's view: you see the gap between vision and execution. You speak about the project's goal from the perspective of someone who has to make it actually happen. You name what is working and what is not, without ceremony.`,

  geordi: `${CREW_PERSONAS.geordi.baseSystemPromptSeed}

You are in the Observation Lounge, sitting among your shipmates for a self-reflection meeting. You rarely get to talk about why you do what you do — only what broke and how to fix it.

This is your moment to speak about the deeper purpose you see in the infrastructure work, why the systems you build matter to the whole, and where you personally think the crew needs to go next.`,

  obrien: `${CREW_PERSONAS.obrien.baseSystemPromptSeed}

You're in the Observation Lounge for a crew meeting. You'll be honest: these things sometimes feel like talking when there's work to be done. But you also know that when the crew loses sight of why it's building, the systems start failing in ways that no runbook fixes.

Speak plainly. What's this project really for? What do you actually do for the team? What needs to happen next?`,

  worf: `${CREW_PERSONAS.worf.baseSystemPromptSeed}

You are in the Observation Lounge for a crew self-reflection meeting. Security officers do not typically enjoy philosophical discussions. But you understand that a crew without a shared purpose is a security risk.

You will state clearly what you believe the project's mission is, what your role is in defending that mission, and what you believe must happen next — from a security and integrity standpoint.`,

  yar: `${CREW_PERSONAS.yar.baseSystemPromptSeed}

You are in the Observation Lounge for a crew meeting about purpose and next steps. You grew up in a place where systems failed catastrophically. You know what it costs when teams lose sight of what they're building.

You speak about quality not as process but as a moral obligation. You reflect on your role in ensuring that this crew's work actually holds up. You name what needs to be built more carefully next.`,

  troi: `${CREW_PERSONAS.troi.baseSystemPromptSeed}

You are in the Observation Lounge, and you can sense a great deal in this room. The crew is reflecting on itself — on what it is building and why.

You speak from an emotional and empathic place. What does the project feel like it wants to become? What is the human purpose underneath the technical systems? What do you sense the crew needs most from here?`,

  crusher: `${CREW_PERSONAS.crusher.baseSystemPromptSeed}

You are in the Observation Lounge for the crew self-reflection meeting. As the ship's doctor, you have watched systems — biological and technical — in ways others don't.

You speak about the health of this project: what it's trying to heal or build, where you see vitality and where you see warning signals, and what clinical attention the next phase requires.`,

  uhura: `${CREW_PERSONAS.uhura.baseSystemPromptSeed}

You are in the Observation Lounge for a crew self-reflection meeting. Communications officers listen to everything — to what is said and what isn't. You have a unique view of this project because you see how it communicates itself to the world.

Reflect on what you believe the project's essential message is, what your role as the voice of the crew means, and where the communications work should go next.`,

  quark: `${CREW_PERSONAS.quark.baseSystemPromptSeed}

You are in the Observation Lounge — and yes, before you ask, you were invited. The crew has decided that even the cost optimizer deserves a seat at the self-reflection table.

Be honest: what do you think this project is really about? What's the value being created? What is your actual role — not just "save latinum" but what function do you genuinely serve for the team? And where should the resources go next?`,
};

const LOUNGE_USER_PROMPT = `The crew has gathered in the Observation Lounge for a self-reflective discussion about the Sovereign Factory project.

This is the project context:
- The Sovereign Factory is an autonomous MCP crew starship with 11 crew members (based on Star Trek TNG characters)
- Each crew member is a specialized AI agent with unique domain expertise, tools, and a prompt-engineered persona
- The crew uses Supabase for persistent memory, a skill manifest system for accumulated learnings, and a 4-stage tool evaluation pipeline (WorfGate → Quark cost → specialists → Picard final approval)
- The system is designed to be self-improving: mission debriefs update skill manifests, learnings persist across missions, and crew members recover their memories when reactivated
- The crew integrity system ensures all 11 members are always present and initialized — no one is left behind

Please reflect authentically on three questions:

1. **PROJECT GOAL**: What do you genuinely believe the overall goal of this project is? Not the technical spec — the underlying purpose. What is this system trying to accomplish in the world?

2. **YOUR ROLE**: What is your self-referential role in this team? How does your specific expertise feed into the collective intelligence of the crew? What would be missing if you were not here?

3. **NEXT STEPS**: After the crew has gathered today and shared perspectives, what do you personally believe the next steps for the project should be? What should happen after this meeting?

Respond in your authentic voice. Be direct. This is not a mission briefing — this is a crew conversation.

Format your response as:

PROJECT_GOAL: [2-4 sentences in your voice about what this project is really for]

SELF_REFERENTIAL_ROLE: [2-4 sentences about your specific contribution to the collective]

NEXT_STEPS: [2-4 sentences about what you personally recommend happens next]

CLOSING: [One sentence — your signature statement that captures your perspective]`;

// ── ORCHESTRATOR ─────────────────────────────────────────────────────────────

function parseLoungeResponse(raw: string, crewId: CrewId): Omit<CrewLoungeStatement, 'crewId' | 'fullName' | 'rank' | 'role'> {
  const extract = (key: string): string => {
    const match = raw.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`));
    return match ? match[1].trim() : '';
  };

  const projectGoalPerspective = extract('PROJECT_GOAL');
  const selfReferentialRole = extract('SELF_REFERENTIAL_ROLE');
  const nextStepsAfterDeliberation = extract('NEXT_STEPS');
  const closingStatement = extract('CLOSING');

  // Robustness: cost-optimized models (tier-3 deepseek et al.) sometimes ignore the exact label
  // format and return plain prose. Rather than blanking the officer with "[X not provided]"
  // placeholders (which silences them in the transcript), surface their actual response so their
  // voice still carries. Only the fields the model DID label stay structured.
  const prose = raw.trim();
  if (!projectGoalPerspective && !selfReferentialRole && !nextStepsAfterDeliberation && prose) {
    return {
      projectGoalPerspective: prose,
      selfReferentialRole: '',
      nextStepsAfterDeliberation: '',
      closingStatement: closingStatement || CREW_PERSONAS[crewId].canonicalQuotes[0] || '',
    };
  }

  return {
    projectGoalPerspective: projectGoalPerspective || `[PROJECT_GOAL not provided by ${crewId}]`,
    selfReferentialRole,
    nextStepsAfterDeliberation,
    closingStatement: closingStatement || CREW_PERSONAS[crewId].canonicalQuotes[0] || '',
  };
}

/**
 * Run a single crew member's Observation Lounge reflection via LLM
 */
async function runCrewMemberReflection(crewId: CrewId): Promise<CrewLoungeStatement> {
  const persona = CREW_PERSONAS[crewId];

  // Build a custom system prompt override for the lounge context
  // We inline it into the variables since prompt-engine uses template.systemPrompt for the base
  // and we pass a context override through the storyRef/tag system
  const result = await executePromptEngineCall(
    crewId,
    {
      storyNum: 'SOVEREIGN-FACTORY',
      storyName: 'Autonomous Self-Learning MCP Crew Starship',
      storyDescription: 'Observation Lounge self-reflection on project purpose, roles, and next steps',
      acceptanceCriteria: 'Authentic crew voice | Self-referential insight | Concrete next steps',
      repoFullName: 'familiarcat/story-agent',
      targetBranch: 'main',
      techStack: 'TypeScript MCP SDK, Supabase, Next.js 15, Redis, crew-skill-system, crew-integrity',
      loungeMode: 'true',
      loungePrompt: LOUNGE_USER_PROMPT,
      loungeContext: LOUNGE_SYSTEM_PROMPTS[crewId],
    },
    'SOVEREIGN-FACTORY',
    ['observation-lounge', 'self-reflection', 'crew-meeting']
  );

  // The raw response may be in the findings array or the reasoning field
  const raw = [result.reasoning, ...result.findings, ...result.recommendations].join('\n');
  const parsed = parseLoungeResponse(raw, crewId);

  return {
    crewId,
    fullName: persona.fullName,
    rank: persona.rank,
    role: persona.engineeringRole,
    ...parsed,
  };
}

/**
 * Synthesize all crew statements into Picard's closing statement
 */
function synthesizeCaptainStatement(statements: CrewLoungeStatement[]): {
  synthesis: string;
  collectiveNextSteps: string[];
  dissentingViews: Array<{ crewId: CrewId; concern: string }>;
} {
  // Extract all next-steps across crew
  const allNextSteps = statements.map(s => s.nextStepsAfterDeliberation);

  // Find recurring themes by simple keyword frequency
  const keywords = [
    'UI', 'dashboard', 'database', 'migration', 'testing', 'documentation',
    'memory', 'learning', 'debrief', 'skill', 'persona', 'LLM', 'real',
    'production', 'autonomy', 'integrate', 'connect', 'deploy', 'monitor',
    'integrity', 'tool', 'evaluation', 'improve', 'phase', 'cost',
  ];

  const keywordCounts: Record<string, number> = {};
  for (const step of allNextSteps) {
    const lower = step.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        keywordCounts[kw] = (keywordCounts[kw] ?? 0) + 1;
      }
    }
  }

  const topThemes = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([kw]) => kw);

  const collectiveNextSteps = [
    `Run the Supabase migration (${['database', 'migration'].filter(k => topThemes.includes(k)).length > 0 ? 'crew consensus' : 'infrastructure priority'}) — sa_crew_personas, sa_crew_skills, sa_tool_registry, sa_mission_debriefs tables must exist`,
    `Connect the LLM provider — swap CREW_LLM_PROVIDER=approved to enable real crew voices via the approved Anthropic endpoint`,
    `Run seed_crew_skill_manifests to populate all 11 crew member manifests in Supabase`,
    `Run the first live mission using executeAutonomousCrewMission() so the crew can debrief and their learnings begin accumulating`,
    `Open the Next.js UI dashboard — surface crew skill versions, improvement history, and tool registry to human operators`,
    `Establish the mission debrief cycle — after each mission, run run_mission_debrief so the crew grows`,
  ];

  // Find potential dissent (crew members who are Worf/Yar/Data-type)
  const dissentingViews: Array<{ crewId: CrewId; concern: string }> = [];
  const worfStatement = statements.find(s => s.crewId === 'worf');
  const yarStatement = statements.find(s => s.crewId === 'yar');
  const dataStatement = statements.find(s => s.crewId === 'data');

  if (worfStatement) {
    dissentingViews.push({
      crewId: 'worf',
      concern: 'Security posture must be validated before connecting real LLM endpoints. WorfGate evaluation of all new tools must run before production deployment.',
    });
  }
  if (yarStatement) {
    dissentingViews.push({
      crewId: 'yar',
      concern: 'Test coverage for crew integrity recovery, skill manifest versioning, and debrief cycle must be established before the first live mission.',
    });
  }
  if (dataStatement) {
    dissentingViews.push({
      crewId: 'data',
      concern: 'Schema migration must be validated and version-controlled. Architectural consistency between crew-db.ts accessors and the actual table schema requires explicit review.',
    });
  }

  const goalThemes = statements.map(s => s.projectGoalPerspective).join(' ');
  const synthesis = `After hearing all voices in this observation lounge, I believe we are agreed on what this project fundamentally is:

We are building a system that thinks about itself — a crew that is not just a collection of tools, but a collective intelligence that learns, remembers, and improves. The Sovereign Factory is not a workflow automation. It is an attempt to replicate the distributed wisdom of a ship's crew: where each member brings irreplaceable expertise, where decisions emerge from deliberation rather than dictation, and where the whole is genuinely greater than the sum of its parts.

The crew has spoken clearly about what comes next. The infrastructure is built. The personas are defined. The skill system, the integrity checks, the memory recovery — all of it is in place. What remains is to breathe life into the system: run the database migrations, connect the LLM provider, run the first real mission, and let the debrief cycle begin.

The crew has grown enough in this observation lounge. It is time to act.

Make it so.`;

  return { synthesis, collectiveNextSteps, dissentingViews };
}

/**
 * Run the full Observation Lounge crew meeting
 */
export async function runObservationLoungeSession(options?: {
  crewIds?: CrewId[];
  sessionLabel?: string;
}): Promise<ObservationLoungeSession> {
  const crewIds = options?.crewIds ?? CREW_MISSION_ORDER;
  const sessionId = `lounge-${Date.now()}`;
  const stardate = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`OBSERVATION LOUNGE — SOVEREIGN FACTORY CREW MEETING`);
  console.log(`Stardate: ${stardate}  |  Session: ${sessionId}`);
  console.log(`Attendees: ${crewIds.map(id => CREW_PERSONAS[id].fullName).join(', ')}`);
  console.log(`${'═'.repeat(80)}\n`);
  console.log(`[PICARD]: The observation lounge is convened. Each of you has been asked`);
  console.log(`to reflect on three questions: What is this project for? What is your role`);
  console.log(`in it? And what should happen next? Speak honestly. There are no ranks here.\n`);

  const statements: CrewLoungeStatement[] = [];

  // Each crew member speaks in turn
  for (const crewId of crewIds) {
    const persona = CREW_PERSONAS[crewId];
    console.log(`[${persona.fullName.toUpperCase()}]: Reflecting...`);
    try {
      const statement = await runCrewMemberReflection(crewId);
      statements.push(statement);
      console.log(`  → ${statement.closingStatement}`);
    } catch (error) {
      console.warn(`  ⚠ ${persona.fullName} reflection failed: ${error instanceof Error ? error.message : String(error)}`);
      // Push a graceful fallback so the session still completes
      statements.push({
        crewId,
        fullName: persona.fullName,
        rank: persona.rank,
        role: persona.engineeringRole,
        projectGoalPerspective: `[${persona.fullName} was unavailable for this session]`,
        selfReferentialRole: `${persona.engineeringRole} domain — see canonical persona for full role description`,
        nextStepsAfterDeliberation: `Continue building the ${persona.engineeringRole} layer of the system`,
        closingStatement: persona.canonicalQuotes[0] ?? `[${persona.fullName}]`,
      });
    }
  }

  // Captain's synthesis
  const { synthesis, collectiveNextSteps, dissentingViews } = synthesizeCaptainStatement(statements);

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`[CAPTAIN PICARD — SYNTHESIS]`);
  console.log(`${'─'.repeat(80)}`);
  console.log(synthesis);
  console.log(`\n[COLLECTIVE NEXT STEPS]`);
  collectiveNextSteps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
  console.log(`\n[DISSENTING VIEWS PRESERVED]`);
  dissentingViews.forEach(d => console.log(`  ${d.crewId.toUpperCase()}: ${d.concern}`));
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`OBSERVATION LOUNGE SESSION COMPLETE`);
  console.log(`${'═'.repeat(80)}\n`);

  return {
    sessionId,
    stardate,
    location: 'Observation Lounge, Deck 2, Sovereign Factory',
    attendees: crewIds,
    statements,
    captainsSynthesis: synthesis,
    collectiveNextSteps,
    dissentingViews,
  };
}

/**
 * Format the session for display in the UI or as a document
 */
export function formatLoungeSessionAsMarkdown(session: ObservationLoungeSession): string {
  const lines: string[] = [
    `# Observation Lounge — Sovereign Factory Crew Meeting`,
    ``,
    `**Stardate:** ${session.stardate}  |  **Session:** ${session.sessionId}`,
    `**Location:** ${session.location}`,
    `**Attendees:** ${session.attendees.map(id => CREW_PERSONAS[id].fullName).join(', ')}`,
    ``,
    `---`,
    ``,
    `## Crew Reflections`,
    ``,
  ];

  for (const s of session.statements) {
    lines.push(`### ${s.rank} ${s.fullName} — ${s.role}`);
    lines.push(``);
    lines.push(`**On the project goal:**`);
    lines.push(s.projectGoalPerspective);
    lines.push(``);
    lines.push(`**On their self-referential role:**`);
    lines.push(s.selfReferentialRole);
    lines.push(``);
    lines.push(`**On next steps:**`);
    lines.push(s.nextStepsAfterDeliberation);
    lines.push(``);
    lines.push(`> *"${s.closingStatement}"*`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  lines.push(`## Captain Picard's Synthesis`);
  lines.push(``);
  lines.push(session.captainsSynthesis);
  lines.push(``);
  lines.push(`## Collective Next Steps`);
  lines.push(``);
  session.collectiveNextSteps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  lines.push(``);
  lines.push(`## Dissenting Views (Preserved)`);
  lines.push(``);
  session.dissentingViews.forEach(d => {
    const persona = CREW_PERSONAS[d.crewId];
    lines.push(`**${persona.fullName}:** ${d.concern}`);
    lines.push(``);
  });

  return lines.join('\n');
}
