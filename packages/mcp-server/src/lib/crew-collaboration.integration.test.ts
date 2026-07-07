import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { executeAutonomousCrewMission } from './crew-coordinator.js';
import { IS_LOCAL_TEST } from '../../test/setup.js';
import type { AgileStory } from '@story-agent/shared';

const skipIfNotTesting = IS_LOCAL_TEST ? describe : describe.skip;

skipIfNotTesting('Crew Collaboration Integration', () => {
  const baseEnv = {
    CREW_LLM_PROVIDER: process.env.CREW_LLM_PROVIDER,
    CREW_LLM_APPROVED_URL: process.env.CREW_LLM_APPROVED_URL,
    CREW_LLM_APPROVED_KEY: process.env.CREW_LLM_APPROVED_KEY,
  };

  const story: AgileStory = {
    id: 'story-local-1',
    referenceNum: 'STORY-999',
    name: 'Validate full crew collaboration fallback',
    description: 'Ensure all 11 crew agents can collaborate even when provider is blocked.',
    acceptanceCriteria: 'All agents should return findings and a debate should be produced.',
    url: 'https://example.test/STORY-999',
    workflowStatus: 'In Progress',
  };

  beforeEach(() => {
    process.env.CREW_LLM_PROVIDER = 'approved';
    // Deliberately unreachable to simulate provider/network block conditions.
    process.env.CREW_LLM_APPROVED_URL = 'http://127.0.0.1:1/v1';
    process.env.CREW_LLM_APPROVED_KEY = 'test-approved-key';
  });

  it('executes complete crew collaboration with demo fallback when provider fails', async () => {
    const { plan, debate } = await executeAutonomousCrewMission({
      story,
      repoFullName: 'familiarcat/story-agent',
      targetBranch: 'main',
      executionMode: 'guided',
      techStack: 'TypeScript, Next.js, MCP',
      testPolicy: 'changed-files plus smoke',
      reviewers: 'crew',
      sharedMemories: [],
      acceptanceCriteria: story.acceptanceCriteria,
    });

    expect(plan.crew.length).toBe(11);
    expect(plan.findings.length).toBe(11);
    expect(plan.assignments.length).toBe(11);
    expect(plan.recommendedExecutionOrder[0]).toBe('picard');

    expect(debate.rounds.length).toBeGreaterThanOrEqual(3);
    expect(debate.consensusSummary.length).toBeGreaterThan(0);
    expect(['approved', 'revise', 'reject']).toContain(debate.finalDecision);
  });

  afterAll(() => {
    process.env.CREW_LLM_PROVIDER = baseEnv.CREW_LLM_PROVIDER;
    process.env.CREW_LLM_APPROVED_URL = baseEnv.CREW_LLM_APPROVED_URL;
    process.env.CREW_LLM_APPROVED_KEY = baseEnv.CREW_LLM_APPROVED_KEY;
  });
});
