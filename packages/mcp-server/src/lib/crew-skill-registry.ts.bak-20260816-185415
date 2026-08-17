/**
 * Crew skill registry — maintains crew member inventory with skills, costs, and availability.
 *
 * Used by Riker to match subtasks to crew members based on:
 * - Skill coverage (does member have required skills?)
 * - Cost per task type (inference/execution/review cost profiles)
 * - Availability (current task load vs max parallel capacity)
 * - Confidence (success rate on similar task types)
 */

export interface CrewMemberProfile {
  crewId: string;
  domain: string; // primary domain
  skills: Array<{ name: string; proficiency: 0 | 1 | 2 | 3 }>; // 0=none, 3=expert
  costPerTask: number; // USD per task (rough average)
  maxParallelTasks: number; // concurrent tasks before overload
  taskSuccessRates: Record<string, number>; // domain -> success % (0..1)
  lastUpdated: string; // ISO timestamp of last update
}

export interface CrewInventory {
  profiles: Map<string, CrewMemberProfile>;
  lastSync: string;
}

/**
 * Build crew inventory from domain definitions (Riker's crew roster).
 * Skills are inferred from domain + keywords.
 */
export function buildCrewInventory(): CrewInventory {
  const profiles = new Map<string, CrewMemberProfile>();

  // Define crew members with their skill sets (from crew-personas.ts + domain knowledge)
  const crewDefinitions: Array<{
    crewId: string;
    domain: string;
    skills: Array<{ name: string; proficiency: 0 | 1 | 2 | 3 }>;
    costPerTask: number;
    maxParallelTasks: number;
    taskSuccessRates: Record<string, number>;
  }> = [
    {
      crewId: 'picard',
      domain: 'command',
      skills: [
        { name: 'decision', proficiency: 3 },
        { name: 'strategy', proficiency: 3 },
        { name: 'arbitration', proficiency: 3 },
      ],
      costPerTask: 150,
      maxParallelTasks: 2,
      taskSuccessRates: { decision: 0.95, strategy: 0.92, arbitration: 0.98 },
    },
    {
      crewId: 'data',
      domain: 'architecture',
      skills: [
        { name: 'architecture', proficiency: 3 },
        { name: 'schema', proficiency: 3 },
        { name: 'design', proficiency: 3 },
        { name: 'refactor', proficiency: 2 },
      ],
      costPerTask: 120,
      maxParallelTasks: 3,
      taskSuccessRates: { architecture: 0.94, design: 0.91, refactor: 0.88 },
    },
    {
      crewId: 'worf',
      domain: 'security',
      skills: [
        { name: 'security', proficiency: 3 },
        { name: 'auth', proficiency: 3 },
        { name: 'permission', proficiency: 3 },
        { name: 'rls', proficiency: 2 },
      ],
      costPerTask: 130,
      maxParallelTasks: 2,
      taskSuccessRates: { security: 0.97, auth: 0.95, permission: 0.93 },
    },
    {
      crewId: 'riker',
      domain: 'implementation',
      skills: [
        { name: 'implement', proficiency: 3 },
        { name: 'build', proficiency: 3 },
        { name: 'feature', proficiency: 3 },
        { name: 'refactor', proficiency: 2 },
      ],
      costPerTask: 110,
      maxParallelTasks: 4,
      taskSuccessRates: { implement: 0.90, build: 0.92, feature: 0.89 },
    },
    {
      crewId: 'geordi',
      domain: 'infrastructure',
      skills: [
        { name: 'deploy', proficiency: 3 },
        { name: 'terraform', proficiency: 3 },
        { name: 'docker', proficiency: 2 },
        { name: 'aws', proficiency: 3 },
      ],
      costPerTask: 100,
      maxParallelTasks: 3,
      taskSuccessRates: { deploy: 0.88, terraform: 0.86, docker: 0.85 },
    },
    {
      crewId: 'obrien',
      domain: 'devops',
      skills: [
        { name: 'ci', proficiency: 3 },
        { name: 'cd', proficiency: 3 },
        { name: 'release', proficiency: 2 },
        { name: 'rollout', proficiency: 2 },
      ],
      costPerTask: 95,
      maxParallelTasks: 3,
      taskSuccessRates: { ci: 0.91, cd: 0.89, release: 0.84 },
    },
    {
      crewId: 'yar',
      domain: 'quality',
      skills: [
        { name: 'test', proficiency: 3 },
        { name: 'coverage', proficiency: 2 },
        { name: 'qa', proficiency: 2 },
        { name: 'verify', proficiency: 3 },
      ],
      costPerTask: 90,
      maxParallelTasks: 4,
      taskSuccessRates: { test: 0.92, coverage: 0.87, verify: 0.89 },
    },
    {
      crewId: 'troi',
      domain: 'stakeholder',
      skills: [
        { name: 'stakeholder', proficiency: 3 },
        { name: 'ux', proficiency: 2 },
        { name: 'user', proficiency: 3 },
        { name: 'feedback', proficiency: 3 },
      ],
      costPerTask: 85,
      maxParallelTasks: 3,
      taskSuccessRates: { stakeholder: 0.88, ux: 0.82, user: 0.85 },
    },
    {
      crewId: 'crusher',
      domain: 'health',
      skills: [
        { name: 'monitor', proficiency: 3 },
        { name: 'incident', proficiency: 3 },
        { name: 'reliability', proficiency: 2 },
        { name: 'alert', proficiency: 2 },
      ],
      costPerTask: 105,
      maxParallelTasks: 2,
      taskSuccessRates: { monitor: 0.90, incident: 0.93, reliability: 0.86 },
    },
    {
      crewId: 'uhura',
      domain: 'communications',
      skills: [
        { name: 'doc', proficiency: 3 },
        { name: 'communicat', proficiency: 3 },
        { name: 'report', proficiency: 2 },
        { name: 'notify', proficiency: 2 },
      ],
      costPerTask: 75,
      maxParallelTasks: 4,
      taskSuccessRates: { doc: 0.91, communicat: 0.89, report: 0.85 },
    },
    {
      crewId: 'quark',
      domain: 'finance',
      skills: [
        { name: 'cost', proficiency: 3 },
        { name: 'optimize', proficiency: 2 },
        { name: 'budget', proficiency: 2 },
        { name: 'roi', proficiency: 3 },
      ],
      costPerTask: 80,
      maxParallelTasks: 3,
      taskSuccessRates: { cost: 0.89, optimize: 0.84, roi: 0.87 },
    },
  ];

  for (const def of crewDefinitions) {
    profiles.set(def.crewId, {
      crewId: def.crewId,
      domain: def.domain,
      skills: def.skills,
      costPerTask: def.costPerTask,
      maxParallelTasks: def.maxParallelTasks,
      taskSuccessRates: def.taskSuccessRates,
      lastUpdated: new Date().toISOString(),
    });
  }

  return {
    profiles,
    lastSync: new Date().toISOString(),
  };
}

/**
 * Calculate skill match confidence (0..1) between a crew member and required skills.
 * Higher proficiency = higher confidence; missing skills = penalty.
 */
export function calculateSkillMatchConfidence(
  profile: CrewMemberProfile,
  requiredSkills: string[],
): number {
  if (requiredSkills.length === 0) return 0.5; // neutral baseline

  let totalProficiency = 0;
  let covered = 0;

  for (const required of requiredSkills) {
    const skill = profile.skills.find(s => s.name === required);
    if (skill) {
      covered++;
      totalProficiency += skill.proficiency;
    }
  }

  // Coverage penalty: if we don't have all required skills, drop by 20% per missing skill
  const coverage = covered / requiredSkills.length;
  const proficiencyAvg = covered > 0 ? totalProficiency / covered : 0;
  const proficiencyNormalized = proficiencyAvg / 3; // normalize 0..3 to 0..1

  // Combine: 60% weight on proficiency + 40% weight on coverage
  const confidence = 0.6 * proficiencyNormalized + 0.4 * coverage;
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Estimate cost for assigning a task to a crew member.
 * Adjusts based on task complexity and member specialization.
 */
export function estimateTaskCost(profile: CrewMemberProfile, taskComplexity: number): number {
  // Complexity scaling: 0.3→0.5 = min; 1.0 = max (~2x base cost)
  const complexityMultiplier = 0.5 + 1.5 * taskComplexity;
  return profile.costPerTask * complexityMultiplier;
}
