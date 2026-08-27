/**
 * Team Assembly by Domain — organizes crew into parallel deliberation groups
 *
 * Replaces sequential full-crew calls with domain-grouped parallel teams:
 *   Architecture: Data, Worf
 *   Implementation: Riker, O'Brien, Geordi
 *   Quality: Yar, Crusher
 *   Stakeholder: Troi, Uhura
 *   Finance: Quark (solo)
 *   Command: Picard (solo, orchestration)
 *
 * Teams deliberate independently, then Picard synthesizes.
 * Expected cost reduction: 50-70% (from $0.0017 → $0.0007-0.0009)
 * Expected latency reduction: 3-4× (from 60-90s → 15-25s)
 */

export type DomainTeamName = 'architecture' | 'implementation' | 'quality' | 'stakeholder' | 'finance' | 'command';

export interface DomainTeam {
  name: DomainTeamName;
  label: string;
  members: string[]; // crew IDs
  expectedReflectionRounds: 0 | 1 | 2; // solo roles = 0, teams = 1-2
}

export interface DomainTeamAssembly {
  teams: DomainTeam[];
  totalMembers: number;
  estimatedCost: number;
  estimatedLatency: number; // seconds
  notes: string[];
}

/**
 * Assemble crews into domain-grouped teams.
 * Each team deliberates independently, then Picard orchestrates synthesis.
 */
export function assembleTeamsByDomain(): DomainTeamAssembly {
  const teams: DomainTeam[] = [
    {
      name: 'architecture',
      label: 'Architecture & Security',
      members: ['data', 'worf'],
      expectedReflectionRounds: 1,
    },
    {
      name: 'implementation',
      label: 'Implementation & Deployment',
      members: ['riker', 'o_brien', 'geordi'],
      expectedReflectionRounds: 1,
    },
    {
      name: 'quality',
      label: 'Quality & Health',
      members: ['yar', 'crusher'],
      expectedReflectionRounds: 1,
    },
    {
      name: 'stakeholder',
      label: 'Stakeholder & Communication',
      members: ['troi', 'uhura'],
      expectedReflectionRounds: 1,
    },
    {
      name: 'finance',
      label: 'Finance',
      members: ['quark'],
      expectedReflectionRounds: 0, // solo, deterministic
    },
    {
      name: 'command',
      label: 'Command & Orchestration',
      members: ['picard'],
      expectedReflectionRounds: 0, // solo, orchestration
    },
  ];

  // Calculate cost & latency
  // Opening positions: all teams in parallel (~10s)
  // Reflection round 1: 4 teams in parallel (2 + 3 + 2 + 2) (~10s)
  // Picard synthesis (~3s)
  // Total: ~23s (vs. sequential 60-90s)
  const estimatedLatency = 23;

  // Cost: ~$0.0007 base + reflection rounds
  // (vs. ~$0.0017 for full crew with reflection)
  const costPerOpening = 0.0003; // all teams opening
  const costPerReflection = 0.0002; // 4 teams reflection (not 11)
  const costPicard = 0.0002; // synthesis
  const estimatedCost = costPerOpening + costPerReflection + costPicard; // ~$0.0007

  return {
    teams,
    totalMembers: teams.reduce((sum, t) => sum + t.members.length, 0), // 11
    estimatedCost,
    estimatedLatency,
    notes: [
      'All 6 teams present (but Quark + Picard are solo, no reflection)',
      'Teams deliberate in parallel (4 teams actually need reflection)',
      'Picard reads all 6 team positions during synthesis (full context retained)',
      'Cost reduction vs baseline: 59% ($0.0017 → $0.0007)',
      'Latency reduction vs baseline: 3-4× (60-90s → 23s)',
    ],
  };
}

/**
 * Optionally filter teams based on task keywords.
 * Phase 2 optimization: skip irrelevant teams to reduce cost further.
 * For now, always assemble full set (full quality assured).
 */
export function assembleTeamsByDomainFiltered(missionBrief: string): DomainTeamAssembly {
  // Phase 2: this will use domain-keyword-extractor.ts
  // For now, always return full team
  return assembleTeamsByDomain();
}

/**
 * Execute opening positions in parallel by team
 * (replaces sequential Promise.all(all_11))
 */
export async function callTeamOpeningPositions(
  teams: DomainTeam[],
  systemPromptFn: (crewId: string, domain: string) => string,
  userPrompt: string,
  callFn: (model: string, system: string, user: string) => Promise<{ text: string; model: string; cost: number }>,
): Promise<Array<{ crewId: string; text: string; model: string; cost: number }>> {
  // Execute each team's members in parallel
  const teamResults = await Promise.all(
    teams.map(team =>
      Promise.all(
        team.members.map(async crewId => {
          // Stub: in real code, look up crew model from Quark
          const model = 'deepseek/deepseek-chat'; // Quark selects model per crew
          const result = await callFn(
            model,
            systemPromptFn(crewId, team.label),
            userPrompt,
          );
          return { crewId, text: result.text, model: result.model, cost: result.cost };
        }),
      ),
    ),
  );

  return teamResults.flat();
}

/**
 * Execute reflection rounds per team (not full crew)
 * (replaces sequential full-crew reflection)
 */
export async function callTeamReflectionRounds(
  teams: DomainTeam[],
  teamContributions: Array<{ crewId: string; text: string; model: string; cost: number }>,
  systemPromptFn: (crewId: string, domain: string, round: number) => string,
  userPromptFn: (crewId: string, teamDigest: string, previousPosition: string) => string,
  callFn: (model: string, system: string, user: string) => Promise<{ text: string; model: string; cost: number }>,
  reflectionRoundCount: number,
): Promise<
  Array<Array<{ crewId: string; text: string; model: string; cost: number }>>
> {
  const reflections: Array<Array<{ crewId: string; text: string; model: string; cost: number }>> = [];

  for (let round = 1; round <= reflectionRoundCount; round++) {
    // Execute each team's reflection in parallel
    const roundResults = await Promise.all(
      teams
        .filter(t => t.expectedReflectionRounds > 0) // skip solo roles
        .map(team =>
          Promise.all(
            team.members.map(async crewId => {
              // Build digest of OTHER team members' positions (not full crew)
              const teamDigest = team.members
                .filter(m => m !== crewId)
                .map(m => {
                  const pos = teamContributions.find(c => c.crewId === m);
                  return pos ? `${m}: ${pos.text.substring(0, 100)}...` : '';
                })
                .join('\n');

              // Get crew's previous position
              const previousPos = teamContributions.find(c => c.crewId === crewId);
              const previousText = previousPos ? previousPos.text : '(none)';

              // Stub: in real code, look up crew model from Quark
              const model = 'deepseek/deepseek-chat';
              const result = await callFn(
                model,
                systemPromptFn(crewId, '', round),
                userPromptFn(crewId, teamDigest, previousText),
              );
              return { crewId, text: result.text, model: result.model, cost: result.cost };
            }),
          ),
        ),
    );

    reflections.push(roundResults.flat());

    // Update contributions with new positions
    for (const contribution of roundResults.flat()) {
      const existing = teamContributions.find(c => c.crewId === contribution.crewId);
      if (existing) {
        existing.text = contribution.text;
      }
    }
  }

  return reflections;
}
