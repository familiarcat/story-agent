/**
 * PM Contract Schema Validation Tests
 * 
 * Tests the universal PM data model (Sprint, Story, Task) schemas
 * against valid, invalid, and adversarial test fixtures.
 */

import { describe, it, expect } from 'vitest';
import {
  PmSchemaValidator,
  SprintSchema,
  StorySchema,
  TaskSchema,
  Schemas,
} from '@story-agent/shared/pm-contracts';
import {
  VALID_FIXTURES,
  ADVERSARIAL_FIXTURES,
  EDGE_CASE_FIXTURES,
} from '../fixtures/pm-contracts/test-fixtures';

describe('PM Contract Schemas', () => {
  describe('Sprint Schema Validation', () => {
    it('should accept valid sprint with all required fields', () => {
      const result = PmSchemaValidator.validateSprint(VALID_FIXTURES.sprint.valid_basic);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid sprint with optional fields', () => {
      const result = PmSchemaValidator.validateSprint(VALID_FIXTURES.sprint.valid_with_metadata);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject sprint with missing tenant_id', () => {
      const result = PmSchemaValidator.validateSprint(ADVERSARIAL_FIXTURES.sprint.invalid_no_tenant_id);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject sprint with invalid UUID', () => {
      const result = PmSchemaValidator.validateSprint(ADVERSARIAL_FIXTURES.sprint.invalid_bad_uuid);
      expect(result.valid).toBe(false);
    });

    it('should reject sprint with invalid RFC3339 timestamp', () => {
      const result = PmSchemaValidator.validateSprint(ADVERSARIAL_FIXTURES.sprint.invalid_bad_rfc3339);
      expect(result.valid).toBe(false);
    });

    it('should reject sprint with end_date before start_date', () => {
      const result = PmSchemaValidator.validateSprint(ADVERSARIAL_FIXTURES.sprint.invalid_end_before_start);
      expect(result.valid).toBe(false);
    });

    it('should reject sprint with invalid state', () => {
      const result = PmSchemaValidator.validateSprint(ADVERSARIAL_FIXTURES.sprint.invalid_bad_state);
      expect(result.valid).toBe(false);
    });

    it('should reject sprint with negative capacity', () => {
      const result = PmSchemaValidator.validateSprint(ADVERSARIAL_FIXTURES.sprint.invalid_negative_capacity);
      expect(result.valid).toBe(false);
    });

    it('should accept sprint with zero capacity (edge case)', () => {
      const result = PmSchemaValidator.validateSprint(EDGE_CASE_FIXTURES.sprint_with_zero_capacity);
      expect(result.valid).toBe(true);
    });
  });

  describe('Story Schema Validation', () => {
    it('should accept valid story with required fields only', () => {
      const result = PmSchemaValidator.validateStory(VALID_FIXTURES.story.valid_basic);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid story with dependencies', () => {
      const result = PmSchemaValidator.validateStory(VALID_FIXTURES.story.valid_blocked);
      expect(result.valid).toBe(true);
    });

    it('should reject story with missing title', () => {
      const result = PmSchemaValidator.validateStory(ADVERSARIAL_FIXTURES.story.invalid_missing_title);
      expect(result.valid).toBe(false);
    });

    it('should reject story with negative story points', () => {
      const result = PmSchemaValidator.validateStory(ADVERSARIAL_FIXTURES.story.invalid_negative_points);
      expect(result.valid).toBe(false);
    });

    it('should reject story with invalid priority', () => {
      const result = PmSchemaValidator.validateStory(ADVERSARIAL_FIXTURES.story.invalid_bad_priority);
      expect(result.valid).toBe(false);
    });

    it('should accept story with max-length title (edge case)', () => {
      const result = PmSchemaValidator.validateStory(EDGE_CASE_FIXTURES.story_with_max_length_title);
      expect(result.valid).toBe(true);
    });

    it('should accept story with empty blocked_by array', () => {
      const result = PmSchemaValidator.validateStory(EDGE_CASE_FIXTURES.story_with_empty_blocked_by);
      expect(result.valid).toBe(true);
    });
  });

  describe('Task Schema Validation', () => {
    it('should accept valid task with required fields', () => {
      const result = PmSchemaValidator.validateTask(VALID_FIXTURES.task.valid_basic);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid task with dependencies', () => {
      const result = PmSchemaValidator.validateTask(VALID_FIXTURES.task.valid_with_dependencies);
      expect(result.valid).toBe(true);
    });

    it('should reject task with missing story_id', () => {
      const result = PmSchemaValidator.validateTask(ADVERSARIAL_FIXTURES.task.invalid_missing_story_id);
      expect(result.valid).toBe(false);
    });

    it('should reject task with negative estimated_hours', () => {
      const result = PmSchemaValidator.validateTask(ADVERSARIAL_FIXTURES.task.invalid_negative_hours);
      expect(result.valid).toBe(false);
    });

    it('should accept task with floating point hours (edge case)', () => {
      const result = PmSchemaValidator.validateTask(EDGE_CASE_FIXTURES.task_with_high_precision_hours);
      expect(result.valid).toBe(true);
    });
  });

  describe('RFC3339 Timestamp Validation', () => {
    it('should accept valid UTC timestamp', () => {
      const valid = PmSchemaValidator.validateRFC3339('2026-08-25T09:30:00Z');
      expect(valid).toBe(true);
    });

    it('should accept valid timestamp with timezone offset', () => {
      const valid = PmSchemaValidator.validateRFC3339('2026-08-25T09:30:00-07:00');
      expect(valid).toBe(true);
    });

    it('should accept valid timestamp with positive timezone offset', () => {
      const valid = PmSchemaValidator.validateRFC3339('2026-08-25T09:30:00+05:30');
      expect(valid).toBe(true);
    });

    it('should reject non-RFC3339 format', () => {
      const valid = PmSchemaValidator.validateRFC3339('2026-08-25 09:30:00');
      expect(valid).toBe(false);
    });

    it('should reject malformed timestamp', () => {
      const valid = PmSchemaValidator.validateRFC3339('not-a-timestamp');
      expect(valid).toBe(false);
    });
  });

  describe('Cyclical Dependency Detection', () => {
    it('should detect self-blocking (direct cycle)', () => {
      const taskId = 'task-1';
      const blockedBy = ['task-1'];
      const allTasks = new Map([['task-1', []]]);

      const hasCycle = PmSchemaValidator.hasCyclicalDependency(taskId, blockedBy, allTasks);
      expect(hasCycle).toBe(true);
    });

    it('should detect indirect cycle (A blocked by B, B blocked by A)', () => {
      const taskA = 'task-a';
      const taskB = 'task-b';
      const allTasks = new Map([
        [taskA, [taskB]],
        [taskB, [taskA]],
      ]);

      const hasCycle = PmSchemaValidator.hasCyclicalDependency(taskA, [taskB], allTasks);
      expect(hasCycle).toBe(true);
    });

    it('should detect transitive cycle (A → B → C → A)', () => {
      const taskA = 'task-a';
      const taskB = 'task-b';
      const taskC = 'task-c';
      const allTasks = new Map([
        [taskA, [taskB]],
        [taskB, [taskC]],
        [taskC, [taskA]],
      ]);

      const hasCycle = PmSchemaValidator.hasCyclicalDependency(taskA, [taskB], allTasks);
      expect(hasCycle).toBe(true);
    });

    it('should accept valid dependency chain (no cycle)', () => {
      const taskA = 'task-a';
      const taskB = 'task-b';
      const taskC = 'task-c';
      const allTasks = new Map([
        [taskA, []],
        [taskB, [taskA]],
        [taskC, [taskB]],
      ]);

      const hasCycle = PmSchemaValidator.hasCyclicalDependency(taskA, [taskB], allTasks);
      expect(hasCycle).toBe(false);
    });

    it('should handle empty dependencies', () => {
      const taskId = 'task-1';
      const blockedBy: string[] = [];
      const allTasks = new Map<string, string[]>();

      const hasCycle = PmSchemaValidator.hasCyclicalDependency(taskId, blockedBy, allTasks);
      expect(hasCycle).toBe(false);
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple valid sprints', () => {
      const sprints = [
        VALID_FIXTURES.sprint.valid_basic,
        VALID_FIXTURES.sprint.valid_with_metadata,
      ];

      const results = sprints.map((s) => PmSchemaValidator.validateSprint(s));
      expect(results).toEqual([
        { valid: true, errors: [] },
        { valid: true, errors: [] },
      ]);
    });

    it('should identify all invalid entities in batch', () => {
      const stories = [
        VALID_FIXTURES.story.valid_basic,
        ADVERSARIAL_FIXTURES.story.invalid_missing_title,
        VALID_FIXTURES.story.valid_blocked,
        ADVERSARIAL_FIXTURES.story.invalid_negative_points,
      ];

      const results = stories.map((s) => PmSchemaValidator.validateStory(s));
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[2].valid).toBe(true);
      expect(results[3].valid).toBe(false);
    });
  });
});
