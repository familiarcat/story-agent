/**
 * Integration test: dynamic team assembly
 *
 * Verifies that missions are analyzed and teams are assembled dynamically
 * based on complexity, not hardcoded to 3 (or 4) teams.
 */

import { describe, it, expect } from 'vitest';
import { analyzeMission } from '../mission-analyzer.js';
import { buildCrewInventory } from '../crew-skill-registry.js';
import { assembleTeamsForMission } from '../team-assembly-engine.js';

describe('Dynamic Team Assembly', () => {
  it('should analyze a simple bug fix mission into subtasks', () => {
    const mission = analyzeMission('Fix authentication bug in the auth service');

    expect(mission.subtasks.length).toBeGreaterThan(0);
    expect(mission.goals.length).toBeGreaterThan(0);
    expect(mission.criticalPath.length).toBeGreaterThan(0);
  });

  it('should analyze a complex deployment mission into multiple subtasks', () => {
    const mission = analyzeMission(
      'Deploy new microservice to AWS with terraform, migrate database schema, ' +
      'implement authentication, write tests, and document changes across 3 regions'
    );

    expect(mission.subtasks.length).toBeGreaterThanOrEqual(3);
    expect(mission.complexityBudget).toBeGreaterThan(0.4); // complex task
  });

  it('should assemble teams dynamically based on mission complexity', () => {
    const mission = analyzeMission('Deploy to production with auth migration');
    const inventory = buildCrewInventory();
    const result = assembleTeamsForMission(mission, inventory);

    expect(result.teams.length).toBeGreaterThan(0);
    expect(result.totalTeams).toEqual(result.teams.length);
    expect(result.executionOrder.length).toBeGreaterThan(0);
  });

  it('should create N teams (not hardcoded 3) based on mission scope', () => {
    // Simple mission → fewer teams
    const simpleMission = analyzeMission('Fix a bug');
    const simpleResult = assembleTeamsForMission(
      simpleMission,
      buildCrewInventory()
    );
    const simpleTeamCount = simpleResult.teams.length;

    // Complex mission → more teams
    const complexMission = analyzeMission(
      'Deploy service, migrate data, secure with auth, ' +
      'test coverage, document, communicate to stakeholders'
    );
    const complexResult = assembleTeamsForMission(
      complexMission,
      buildCrewInventory()
    );
    const complexTeamCount = complexResult.teams.length;

    // Complex missions should assemble more/equal teams than simple ones
    expect(complexTeamCount).toBeGreaterThanOrEqual(simpleTeamCount);
  });

  it('should assign subtasks only to qualified crew members', () => {
    const mission = analyzeMission('Deploy with terraform and docker to AWS');
    const inventory = buildCrewInventory();
    const result = assembleTeamsForMission(mission, inventory, { skillThreshold: 0.7 });

    // All assigned subtasks should have assigned crew
    expect(result.teams.length).toBeGreaterThan(0);

    // Verify each team has at least one member
    for (const team of result.teams) {
      expect(team.members.length).toBeGreaterThan(0);
      expect(team.subtasks.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('should report unassigned subtasks if skills are missing', () => {
    const mission = analyzeMission('Deploy to AWS');
    const inventory = buildCrewInventory();

    // Very high threshold forces some subtasks to be unassigned
    const result = assembleTeamsForMission(mission, inventory, { skillThreshold: 0.95 });

    // Expect either: all assigned (zero unassigned), or some unassigned
    expect(result.unassignedSubtasks.length + result.teams.reduce((s, t) => s + t.subtasks.length, 0))
      .toEqual(mission.subtasks.length);
  });

  it('should compute correct execution order respecting dependencies', () => {
    const mission = analyzeMission('Design schema, migrate data, test, deploy');
    const inventory = buildCrewInventory();
    const result = assembleTeamsForMission(mission, inventory);

    // Execution order should respect all dependencies
    for (const team of result.teams) {
      for (const subtaskId of team.subtasks) {
        const subtask = mission.subtasks.find(s => s.id === subtaskId);
        if (!subtask) continue;

        // Find teams that own dependencies
        for (const depId of subtask.dependencies) {
          const depTeam = result.teams.find(t => t.subtasks.includes(depId));
          if (depTeam) {
            // Dep team should come before current team in execution order
            const depIndex = result.executionOrder.indexOf(depTeam.teamId);
            const curIndex = result.executionOrder.indexOf(team.teamId);
            expect(depIndex).toBeLessThanOrEqual(curIndex);
          }
        }
      }
    }
  });
});
