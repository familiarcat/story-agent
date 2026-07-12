/**
 * Tests for Autonomous Executor (WORKSTREAM 1)
 */

import { describe, expect, it } from 'vitest';
import { executeAutonomousTask, type AutonomousTaskInput } from '../autonomous-executor.js';

describe('Autonomous Executor', () => {
  describe('executeAutonomousTask', () => {
    it('should execute autonomous bug fixes successfully', async () => {
      const result = await executeAutonomousTask({
        taskId: 'test-1',
        crewId: 'riker',
        brief: 'Fix typo in login component',
        taskType: 'bug_fix',
        executor: async () => ({
          success: true,
          output: 'Fixed typo',
          filesChanged: ['auth.tsx'],
          durationMs: 1000,
        }),
      });

      expect(result.executed).toBe(true);
      expect(result.classification.isAutonomous).toBe(true);
      expect(result.outcome?.success).toBe(true);
    });

    it('should escalate non-autonomous tasks', async () => {
      const result = await executeAutonomousTask({
        taskId: 'test-2',
        crewId: 'data',
        brief: 'Implement new payment processing system',
        taskType: 'new_feature',
        executor: async () => ({
          success: true,
          output: 'Done',
          durationMs: 5000,
        }),
      });

      expect(result.executed).toBe(false);
      expect(result.classification.isAutonomous).toBe(false);
      expect(result.escalation).toBeDefined();
    });

    it('should escalate on devil\'s advocate challenge', async () => {
      const result = await executeAutonomousTask({
        taskId: 'test-3',
        crewId: 'worf',
        brief: 'Fix authentication bug',
        taskType: 'bug_fix',
        devilsAdvocateChallenge: 'This could expose a security vulnerability if not done carefully',
        executor: async () => ({
          success: true,
          output: 'Fixed',
          durationMs: 2000,
        }),
      });

      expect(result.executed).toBe(false);
      expect(result.escalation?.reason).toContain('Devil\'s advocate');
    });

    it('should escalate on post-flight scope mismatch', async () => {
      const result = await executeAutonomousTask({
        taskId: 'test-4',
        crewId: 'geordi',
        brief: 'Add a comment to the config file',
        taskType: 'documentation',
        executor: async () => ({
          success: true,
          output: 'Modified files',
          filesChanged: Array.from({ length: 50 }, (_, i) => `file${i}.ts`),
          durationMs: 3000,
        }),
      });

      expect(result.executed).toBe(false);
      expect(result.escalation?.reason).toContain('Scope mismatch');
    });

    it('should handle executor errors gracefully', async () => {
      const result = await executeAutonomousTask({
        taskId: 'test-5',
        crewId: 'data',
        brief: 'Fix small bug',
        taskType: 'bug_fix',
        executor: async () => {
          throw new Error('Unexpected error');
        },
      });

      expect(result.executed).toBe(false);
      expect(result.escalation?.severity).toBe('critical');
    });

    it('should record execution outcomes with confidence levels', async () => {
      const result = await executeAutonomousTask({
        taskId: 'test-6',
        crewId: 'troi',
        brief: 'Update documentation',
        taskType: 'documentation',
        executor: async () => ({
          success: true,
          output: 'Documentation updated',
          filesChanged: ['README.md'],
          durationMs: 500,
        }),
      });

      expect(result.outcome?.durationSeconds).toBeCloseTo(0.5, 1);
      expect(result.outcome?.filesChanged).toEqual(['README.md']);
    });
  });
});
