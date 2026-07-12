/**
 * Team assembly engine — dynamically creates parallel team groups for autonomous execution.
 *
 * Algorithm (greedy + rebalancing):
 * 1. For each subtask (in dependency order):
 *    - Find crew members with required skills (confidence > 70%)
 *    - Pick the cheapest available member
 *    - Assign to team; track utilization
 * 2. Rebalance if any member overloaded:
 *    - Redistribute non-critical work to underutilized members
 * 3. Group assigned members into parallel teams by domain/specialty
 * 4. Return team assignments + execution plan
 *
 * Output: N teams execute autonomously, with async coordination as needed.
 */

import type { ExtractedSubtask, MissionAnalysis } from './mission-analyzer.js';
import type { CrewMemberProfile, CrewInventory } from './crew-skill-registry.js';
import { calculateSkillMatchConfidence, estimateTaskCost } from './crew-skill-registry.js';

export interface TeamAssignment {
  teamId: string;
  label: string;
  members: string[]; // crew IDs
  subtasks: string[]; // assigned subtask IDs
  totalCostUSD: number;
  estimatedMinutes: number;
  confidenceScore: number; // 0..1, how confident we are in success
}

export interface AssemblyResult {
  teams: TeamAssignment[];
  unassignedSubtasks: ExtractedSubtask[];
  totalCostUSD: number;
  totalTeams: number;
  executionOrder: string[]; // team IDs in execution order (respecting dependencies)
  warnings: string[];
}

/**
 * Dynamically assemble teams and assign subtasks.
 * Uses greedy algorithm: match subtasks to cheapest capable crew, then rebalance.
 */
export function assembleTeamsForMission(
  mission: MissionAnalysis,
  inventory: CrewInventory,
  options: {
    costBudget?: number; // max total cost (undefined = unlimited)
    skillThreshold?: number; // min confidence for assignment (default 0.7)
  } = {},
): AssemblyResult {
  const { skillThreshold = 0.7 } = options;
  const warnings: string[] = [];

  // Track member utilization and assignments
  const memberAssignments = new Map<string, { taskIds: string[]; totalCost: number; utilization: number }>();
  const assignedSubtaskIds = new Set<string>();
  const subtaskAssignments = new Map<string, string>(); // subtaskId -> crewId

  // Initialize member tracking
  for (const [crewId, profile] of inventory.profiles) {
    memberAssignments.set(crewId, {
      taskIds: [],
      totalCost: 0,
      utilization: 0,
    });
  }

  let totalCostUSD = 0;

  // Phase 1: Greedy assignment (in critical path order for optimal dependencies)
  for (const subtaskId of mission.criticalPath) {
    const subtask = mission.subtasks.find(s => s.id === subtaskId);
    if (!subtask) continue;

    // Find eligible crew members (skill match confidence > threshold)
    const candidates: Array<{ crewId: string; profile: CrewMemberProfile; confidence: number; cost: number; utilization: number }> = [];

    for (const [crewId, profile] of inventory.profiles) {
      const confidence = calculateSkillMatchConfidence(profile, subtask.skillsRequired);
      if (confidence < skillThreshold) continue; // skip if below threshold

      const cost = estimateTaskCost(profile, subtask.complexity);
      const assignment = memberAssignments.get(crewId);
      const utilization = assignment ? assignment.utilization : 0;

      // Skip if already at max capacity
      if (utilization >= profile.maxParallelTasks) continue;

      candidates.push({ crewId, profile, confidence, cost, utilization });
    }

    if (candidates.length === 0) {
      // No qualified member found
      warnings.push(`No qualified crew for subtask '${subtask.description}' (skills: ${subtask.skillsRequired.join(', ')})`);
      continue;
    }

    // Sort by cost (prefer cheaper), then by utilization (prefer less busy)
    candidates.sort((a, b) => {
      const costDiff = a.cost - b.cost;
      if (Math.abs(costDiff) > 1) return costDiff; // if cost differs by >$1, use cost
      return a.utilization - b.utilization; // else prefer less busy
    });

    const winner = candidates[0];
    const assignment = memberAssignments.get(winner.crewId)!;

    // Assign subtask to winner
    assignment.taskIds.push(subtaskId);
    assignment.totalCost += winner.cost;
    assignment.utilization += 1; // increment task count
    subtaskAssignments.set(subtaskId, winner.crewId);
    assignedSubtaskIds.add(subtaskId);
    totalCostUSD += winner.cost;

    // Check cost budget
    if (options.costBudget && totalCostUSD > options.costBudget) {
      warnings.push(`Cost budget exceeded: $${totalCostUSD.toFixed(2)} > $${options.costBudget}`);
      break;
    }
  }

  // Phase 2: Rebalancing (if any member is overloaded, redistribute non-critical work)
  const rebalance = () => {
    const overloaded = Array.from(memberAssignments.entries()).filter(([_, a]) => a.utilization > 0.7 * (inventory.profiles.get(_)?.maxParallelTasks || 1));
    const underutilized = Array.from(memberAssignments.entries()).filter(([_, a]) => a.utilization < 0.5);

    if (overloaded.length === 0 || underutilized.length === 0) return; // nothing to rebalance

    // Try to move a non-critical task from overloaded → underutilized
    for (const [overloadedId, overloadedAssignment] of overloaded) {
      if (overloadedAssignment.taskIds.length === 0) continue;

      for (const [underutilizedId, underutilizedAssignment] of underutilized) {
        // Find a task we can move (not depended on by others)
        const movableTaskId = overloadedAssignment.taskIds.find(tid => {
          const task = mission.subtasks.find(s => s.id === tid);
          if (!task) return false;
          // Check if any other task depends on this one
          return !mission.subtasks.some(s => s.dependencies.includes(tid) && !overloadedAssignment.taskIds.includes(s.id));
        });

        if (!movableTaskId) continue;

        // Check if underutilized member has skills for the task
        const task = mission.subtasks.find(s => s.id === movableTaskId)!;
        const underutilizedProfile = inventory.profiles.get(underutilizedId)!;
        const confidence = calculateSkillMatchConfidence(underutilizedProfile, task.skillsRequired);

        if (confidence >= skillThreshold) {
          // Move the task
          const cost = estimateTaskCost(underutilizedProfile, task.complexity);
          overloadedAssignment.taskIds = overloadedAssignment.taskIds.filter(id => id !== movableTaskId);
          overloadedAssignment.totalCost -= estimateTaskCost(inventory.profiles.get(overloadedId)!, task.complexity);
          overloadedAssignment.utilization -= 1;

          underutilizedAssignment.taskIds.push(movableTaskId);
          underutilizedAssignment.totalCost += cost;
          underutilizedAssignment.utilization += 1;

          subtaskAssignments.set(movableTaskId, underutilizedId);
          break;
        }
      }
    }
  };

  rebalance();

  // Phase 3: Group assigned members into teams by domain/specialty
  const teams: TeamAssignment[] = [];
  const domainTeams = new Map<string, TeamAssignment>();

  for (const [crewId, assignment] of memberAssignments) {
    if (assignment.taskIds.length === 0) continue;

    const profile = inventory.profiles.get(crewId)!;
    const domain = profile.domain;

    // Find or create team for this domain
    let team = domainTeams.get(domain);
    if (!team) {
      team = {
        teamId: `team-${domain}-${teams.length + 1}`,
        label: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Team`,
        members: [],
        subtasks: [],
        totalCostUSD: 0,
        estimatedMinutes: 0,
        confidenceScore: 0,
      };
      domainTeams.set(domain, team);
      teams.push(team);
    }

    team.members.push(crewId);
    team.subtasks.push(...assignment.taskIds);
    team.totalCostUSD += assignment.totalCost;
  }

  // Calculate team metrics
  for (const team of teams) {
    // Estimate team execution time (max of member durations)
    const teamSubtasks = mission.subtasks.filter(s => team.subtasks.includes(s.id));
    team.estimatedMinutes = Math.max(...teamSubtasks.map(s => s.estimatedMinutes), 0);

    // Calculate confidence (average skill match confidence for all assignments)
    let totalConfidence = 0;
    let confidenceCount = 0;
    for (const crewId of team.members) {
      const memberSubtaskIds = team.subtasks.filter(stid => subtaskAssignments.get(stid) === crewId);
      for (const stid of memberSubtaskIds) {
        const subtask = mission.subtasks.find(s => s.id === stid);
        if (subtask) {
          const profile = inventory.profiles.get(crewId)!;
          const confidence = calculateSkillMatchConfidence(profile, subtask.skillsRequired);
          totalConfidence += confidence;
          confidenceCount++;
        }
      }
    }
    team.confidenceScore = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.5;
  }

  // Determine execution order (teams with independent subtasks can run in parallel)
  const executionOrder = computeExecutionOrder(teams, mission);

  // Collect unassigned subtasks
  const unassignedSubtasks = mission.subtasks.filter(s => !assignedSubtaskIds.has(s.id));

  return {
    teams,
    unassignedSubtasks,
    totalCostUSD,
    totalTeams: teams.length,
    executionOrder,
    warnings,
  };
}

/**
 * Compute team execution order respecting subtask dependencies.
 * Teams with independent subtasks can run in parallel.
 */
function computeExecutionOrder(teams: TeamAssignment[], mission: MissionAnalysis): string[] {
  // Build dependency graph at team level
  const teamDeps = new Map<string, Set<string>>();

  for (const team of teams) {
    const deps = new Set<string>();
    for (const subtaskId of team.subtasks) {
      const subtask = mission.subtasks.find(s => s.id === subtaskId);
      if (!subtask) continue;

      // Find teams that own dependent subtasks
      for (const depId of subtask.dependencies) {
        const depTeam = teams.find(t => t.subtasks.includes(depId));
        if (depTeam && depTeam.teamId !== team.teamId) {
          deps.add(depTeam.teamId);
        }
      }
    }
    teamDeps.set(team.teamId, deps);
  }

  // Topological sort
  const remaining = new Set(teams.map(t => t.teamId));
  const order: string[] = [];

  while (remaining.size > 0) {
    const ready = Array.from(remaining).filter(teamId => {
      const deps = teamDeps.get(teamId) || new Set();
      return Array.from(deps).every(d => !remaining.has(d));
    });

    if (ready.length === 0) break; // cycle or error
    order.push(...ready);
    ready.forEach(id => remaining.delete(id));
  }

  return order;
}
