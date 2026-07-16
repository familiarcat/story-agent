export type CrewMemberId =
  | 'picard'
  | 'data'
  | 'riker'
  | 'geordi'
  | 'obrien'
  | 'worf'
  | 'yar'
  | 'troi'
  | 'crusher'
  | 'uhura'
  | 'quark';

export interface CrewAssignmentDecision {
  primary: CrewMemberId;
  advisors: CrewMemberId[];
  reason: string;
}

const COST_SIGNAL_RE = /\b(cost|budget|pricing|price|token|spend|roi|effort)\b/i;

export function decideCrewAssignment(input: {
  title?: string;
  description?: string;
}): CrewAssignmentDecision {
  const text = `${input.title ?? ''}\n${input.description ?? ''}`;
  if (COST_SIGNAL_RE.test(text)) {
    return {
      primary: 'quark',
      advisors: ['riker'],
      reason: 'Cost-sensitive work detected; Quark leads with Riker as delivery manager.',
    };
  }
  return {
    primary: 'riker',
    advisors: ['quark'],
    reason: 'Default agile delivery lane: Riker owns execution while Quark advises on cost.',
  };
}

function toCrewMemberId(value: string): CrewMemberId | null {
  const v = value.trim().toLowerCase();
  switch (v) {
    case 'picard':
    case 'data':
    case 'riker':
    case 'geordi':
    case 'obrien':
    case 'worf':
    case 'yar':
    case 'troi':
    case 'crusher':
    case 'uhura':
    case 'quark':
      return v;
    default:
      return null;
  }
}

export function crewMemberDisplayName(crewId: CrewMemberId): string {
  const names: Record<CrewMemberId, string> = {
    picard: 'Jean-Luc Picard',
    data: 'Data',
    riker: 'William Riker',
    geordi: 'Geordi La Forge',
    obrien: "Miles O'Brien",
    worf: 'Worf',
    yar: 'Tasha Yar',
    troi: 'Deanna Troi',
    crusher: 'Beverly Crusher',
    uhura: 'Nyota Uhura',
    quark: 'Quark',
  };
  return names[crewId];
}

export function parseCrewAssigneeMap(env: Record<string, string | undefined>): Partial<Record<CrewMemberId, string>> {
  const out: Partial<Record<CrewMemberId, string>> = {};

  const json = env.AHA_CREW_ASSIGNEE_MAP;
  if (json) {
    try {
      const parsed = JSON.parse(json) as Record<string, unknown>;
      for (const [key, value] of Object.entries(parsed)) {
        const crew = toCrewMemberId(key);
        if (!crew) continue;
        if (typeof value === 'string' && value.trim()) out[crew] = value.trim();
      }
    } catch {
      // Ignore invalid mapping and fall back to per-member env vars.
    }
  }

  const members: CrewMemberId[] = ['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark'];
  for (const member of members) {
    const key = `AHA_ASSIGNEE_${member.toUpperCase()}_ID`;
    const value = env[key];
    if (typeof value === 'string' && value.trim()) out[member] = value.trim();
  }

  return out;
}

export function resolvePrimaryAhaAssigneeId(
  decision: CrewAssignmentDecision,
  env: Record<string, string | undefined>,
): string | null {
  const map = parseCrewAssigneeMap(env);
  return map[decision.primary] ?? null;
}

export const AGILE_SPRINT_GUARDRAILS = [
  'Every requirement maps to a clear Definition of Done and measurable acceptance criteria.',
  'Limit sprint WIP and keep owner accountability explicit for each story/task.',
  'Track blockers daily; move workflow status immediately when work state changes.',
  'Capture completion evidence in Aha comments so stakeholders can audit outcomes.',
];

export function buildCrewCompletionComment(input: {
  actor: CrewMemberId | string;
  summary?: string;
  includeChecklist?: boolean;
}): string {
  const actor = String(input.actor || 'crew').toLowerCase();
  const checklist = input.includeChecklist
    ? `\n\nAgile checklist:\n${AGILE_SPRINT_GUARDRAILS.map((item) => `- ${item}`).join('\n')}`
    : '';
  const summary = input.summary?.trim()
    ? input.summary.trim()
    : 'Execution completed autonomously; status and ownership were synchronized by the crew workflow.';
  return [
    `[Autonomous update by ${actor}]`,
    summary,
    checklist,
  ].join('\n').trim();
}
