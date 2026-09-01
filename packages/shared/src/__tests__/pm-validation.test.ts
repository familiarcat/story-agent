/**
 * PM System Validation Tests
 * Phase 1: Comprehensive schema and state machine validation
 */

import { describe, it, expect } from 'vitest';
import {
  CreateProjectSchema,
  CreateSprintSchema,
  CreateStorySchema,
  CreateTaskSchema,
  isValidStoryTransition,
  isValidTaskTransition,
  isValidSprintTransition,
  detectCyclicalDependency,
  PMValidation,
} from '../pm-validation';

// ============================================================================
// PROJECT VALIDATION TESTS
// ============================================================================

describe('PM: Project Validation', () => {
  it('should validate valid project creation input', () => {
    const input = {
      name: 'Q4 Planning',
      description: 'Q4 2026 planning sprint',
      workflow_type: 'scrum' as const,
      visibility: 'team' as const,
    };

    const result = CreateProjectSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject project with empty name', () => {
    const input = {
      name: '',
      workflow_type: 'scrum' as const,
      visibility: 'team' as const,
    };

    const result = CreateProjectSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept optional description', () => {
    const input = {
      name: 'Project A',
      workflow_type: 'kanban' as const,
      visibility: 'private' as const,
    };

    const result = CreateProjectSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should use default workflow_type (scrum)', () => {
    const input = {
      name: 'Project B',
    };

    const result = CreateProjectSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workflow_type).toBe('scrum');
    }
  });
});

// ============================================================================
// SPRINT VALIDATION TESTS
// ============================================================================

describe('PM: Sprint Validation', () => {
  it('should validate valid sprint creation', () => {
    const input = {
      name: 'Sprint 1',
      description: 'First sprint of Q4',
      start_date: '2026-09-01T00:00:00Z',
      end_date: '2026-09-15T00:00:00Z',
      capacity: 40,
    };

    const result = CreateSprintSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject sprint with end_date before start_date', () => {
    const input = {
      name: 'Sprint 1',
      start_date: '2026-09-15T00:00:00Z',
      end_date: '2026-09-01T00:00:00Z',
    };

    const result = CreateSprintSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept negative capacity check', () => {
    const input = {
      name: 'Sprint 1',
      capacity: -10,
    };

    const result = CreateSprintSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept optional dates', () => {
    const input = {
      name: 'Sprint 1',
    };

    const result = CreateSprintSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// STORY VALIDATION TESTS
// ============================================================================

describe('PM: Story Validation', () => {
  it('should validate valid story creation', () => {
    const input = {
      title: 'Implement PM dashboard',
      description: 'Build the main PM dashboard UI',
      priority: 'high' as const,
      story_points: 8,
      size_category: 'md' as const,
    };

    const result = CreateStorySchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject story with empty title', () => {
    const input = {
      title: '',
      priority: 'medium' as const,
    };

    const result = CreateStorySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should use default priority (medium)', () => {
    const input = {
      title: 'Some story',
      size_category: 'sm' as const,
    };

    const result = CreateStorySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe('medium');
    }
  });

  it('should reject negative story points', () => {
    const input = {
      title: 'Some story',
      priority: 'high' as const,
      story_points: -5,
    };

    const result = CreateStorySchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// TASK VALIDATION TESTS
// ============================================================================

describe('PM: Task Validation', () => {
  it('should validate valid task creation', () => {
    const input = {
      title: 'Implement API endpoint',
      description: 'POST /api/pm/stories',
      effort_hours: 4,
      priority: 'high' as const,
    };

    const result = CreateTaskSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject task with empty title', () => {
    const input = {
      title: '',
      priority: 'medium' as const,
    };

    const result = CreateTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject negative effort', () => {
    const input = {
      title: 'Some task',
      priority: 'low' as const,
      effort_hours: -2,
    };

    const result = CreateTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// STATE MACHINE TESTS
// ============================================================================

describe('PM: Story State Machine', () => {
  it('should allow open → in_progress transition', () => {
    expect(isValidStoryTransition('open', 'in_progress')).toBe(true);
  });

  it('should allow open → blocked transition', () => {
    expect(isValidStoryTransition('open', 'blocked')).toBe(true);
  });

  it('should allow open → archived transition', () => {
    expect(isValidStoryTransition('open', 'archived')).toBe(true);
  });

  it('should reject open → done transition (must go through review)', () => {
    expect(isValidStoryTransition('open', 'done')).toBe(false);
  });

  it('should allow in_progress → review transition', () => {
    expect(isValidStoryTransition('in_progress', 'review')).toBe(true);
  });

  it('should allow review → done transition', () => {
    expect(isValidStoryTransition('review', 'done')).toBe(true);
  });

  it('should allow done → archived transition', () => {
    expect(isValidStoryTransition('done', 'archived')).toBe(true);
  });

  it('should reject done → open transition (no going back)', () => {
    expect(isValidStoryTransition('done', 'open')).toBe(false);
  });

  it('should allow blocked → open transition', () => {
    expect(isValidStoryTransition('blocked', 'open')).toBe(true);
  });

  it('should allow blocked → in_progress transition', () => {
    expect(isValidStoryTransition('blocked', 'in_progress')).toBe(true);
  });

  it('should allow archived state to have no transitions', () => {
    expect(isValidStoryTransition('archived', 'open')).toBe(false);
    expect(isValidStoryTransition('archived', 'in_progress')).toBe(false);
    expect(isValidStoryTransition('archived', 'done')).toBe(false);
  });
});

describe('PM: Task State Machine', () => {
  it('should allow open → in_progress transition', () => {
    expect(isValidTaskTransition('open', 'in_progress')).toBe(true);
  });

  it('should allow open → blocked transition', () => {
    expect(isValidTaskTransition('open', 'blocked')).toBe(true);
  });

  it('should allow in_progress → done transition', () => {
    expect(isValidTaskTransition('in_progress', 'done')).toBe(true);
  });

  it('should allow in_progress → blocked transition', () => {
    expect(isValidTaskTransition('in_progress', 'blocked')).toBe(true);
  });

  it('should allow in_progress → open transition (reopen)', () => {
    expect(isValidTaskTransition('in_progress', 'open')).toBe(true);
  });

  it('should reject done → open transition', () => {
    expect(isValidTaskTransition('done', 'open')).toBe(false);
  });

  it('should allow blocked → open transition', () => {
    expect(isValidTaskTransition('blocked', 'open')).toBe(true);
  });

  it('should allow blocked → in_progress transition', () => {
    expect(isValidTaskTransition('blocked', 'in_progress')).toBe(true);
  });
});

describe('PM: Sprint State Machine', () => {
  it('should allow planning → active transition', () => {
    expect(isValidSprintTransition('planning', 'active')).toBe(true);
  });

  it('should allow active → review transition', () => {
    expect(isValidSprintTransition('active', 'review')).toBe(true);
  });

  it('should allow review → complete transition', () => {
    expect(isValidSprintTransition('review', 'complete')).toBe(true);
  });

  it('should reject planning → complete transition (must go through active/review)', () => {
    expect(isValidSprintTransition('planning', 'complete')).toBe(false);
  });

  it('should reject complete → active transition (final state)', () => {
    expect(isValidSprintTransition('complete', 'active')).toBe(false);
  });
});

// ============================================================================
// CONFLICT DETECTION TESTS
// ============================================================================

describe('PM: Conflict Detection', () => {
  it('should detect simple cyclical dependency', () => {
    const blocks = new Map([
      ['task-a', 'task-b'],
      ['task-b', 'task-a'], // Cycle!
    ]);

    expect(detectCyclicalDependency('task-a', 'task-b', blocks)).toBe(true);
  });

  it('should detect multi-step cyclical dependency', () => {
    const blocks = new Map([
      ['task-a', 'task-b'],
      ['task-b', 'task-c'],
      ['task-c', 'task-a'], // Cycle!
    ]);

    expect(detectCyclicalDependency('task-a', 'task-b', blocks)).toBe(true);
  });

  it('should allow linear dependency chains', () => {
    const blocks = new Map([
      ['task-a', 'task-b'],
      ['task-b', 'task-c'],
      ['task-c', undefined],
    ]);

    expect(detectCyclicalDependency('task-a', 'task-b', blocks)).toBe(false);
  });

  it('should allow no blocking', () => {
    const blocks = new Map<string, string | undefined>();

    expect(detectCyclicalDependency('task-a', undefined, blocks)).toBe(false);
  });

  it('should detect self-dependency', () => {
    const blocks = new Map([
      ['task-a', 'task-a'],
    ]);

    expect(detectCyclicalDependency('task-a', 'task-a', blocks)).toBe(true);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('PM: Validation Integration', () => {
  it('should expose validation helpers via PMValidation export', () => {
    expect(PMValidation.isValidStoryTransition).toBeDefined();
    expect(PMValidation.isValidTaskTransition).toBeDefined();
    expect(PMValidation.isValidSprintTransition).toBeDefined();
    expect(PMValidation.detectCyclicalDependency).toBeDefined();
  });

  it('should expose all schema validators', () => {
    expect(PMValidation.CreateProjectSchema).toBeDefined();
    expect(PMValidation.CreateSprintSchema).toBeDefined();
    expect(PMValidation.CreateStorySchema).toBeDefined();
    expect(PMValidation.CreateTaskSchema).toBeDefined();
  });

  it('should validate a complete workflow', () => {
    // Project
    const projectInput = {
      name: 'Complete PM System',
      description: 'Full workflow test',
      workflow_type: 'scrum' as const,
      visibility: 'team' as const,
    };
    expect(PMValidation.CreateProjectSchema.safeParse(projectInput).success).toBe(true);

    // Sprint
    const sprintInput = {
      name: 'Sprint 1',
      start_date: '2026-09-01T00:00:00Z',
      end_date: '2026-09-15T00:00:00Z',
      capacity: 40,
    };
    expect(PMValidation.CreateSprintSchema.safeParse(sprintInput).success).toBe(true);

    // Story
    const storyInput = {
      title: 'Build PM system',
      description: 'Implement native PM system',
      priority: 'high' as const,
      story_points: 13,
    };
    expect(PMValidation.CreateStorySchema.safeParse(storyInput).success).toBe(true);

    // Task
    const taskInput = {
      title: 'Implement API',
      priority: 'high' as const,
      effort_hours: 8,
    };
    expect(PMValidation.CreateTaskSchema.safeParse(taskInput).success).toBe(true);
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('PM: Edge Cases', () => {
  it('should handle very long strings (but within limits)', () => {
    const longName = 'A'.repeat(255);
    const input = {
      name: longName,
      workflow_type: 'scrum' as const,
      visibility: 'team' as const,
    };

    expect(CreateProjectSchema.safeParse(input).success).toBe(true);
  });

  it('should reject strings that exceed max length', () => {
    const tooLongName = 'A'.repeat(256);
    const input = {
      name: tooLongName,
      workflow_type: 'scrum' as const,
      visibility: 'team' as const,
    };

    expect(CreateProjectSchema.safeParse(input).success).toBe(false);
  });

  it('should handle special characters in titles', () => {
    const input = {
      title: 'Story with $pecial ch@rs & symbols!',
      priority: 'high' as const,
    };

    expect(CreateStorySchema.safeParse(input).success).toBe(true);
  });

  it('should handle very large story points', () => {
    const input = {
      title: 'Epic story',
      priority: 'critical' as const,
      story_points: 999,
    };

    expect(CreateStorySchema.safeParse(input).success).toBe(true);
  });

  it('should handle zero capacity sprint', () => {
    const input = {
      name: 'Sprint 0',
      capacity: 0,
    };

    expect(CreateSprintSchema.safeParse(input).success).toBe(false);
  });
});
