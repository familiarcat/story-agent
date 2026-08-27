/**
 * PM Contract Test Fixtures
 * 
 * Valid and adversarial test data for validating schema enforcement,
 * state machine correctness, and error handling.
 */

import { type Sprint, type Story, type Task } from './schemas';

/**
 * Valid Fixtures — Correct data that should always pass validation
 */
export const VALID_FIXTURES = {
  sprint: {
    valid_basic: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      tenant_id: 'familiarcat-prod',
      name: 'Sprint 42 — Aug 26-Sept 6',
      state: 'active' as const,
      start_date: '2026-08-26T09:00:00Z',
      end_date: '2026-09-06T17:00:00Z',
      capacity: 50,
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'riker@familiarcat.com',
    } as Sprint,

    valid_with_metadata: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      tenant_id: 'familiarcat-prod',
      name: 'Sprint 43 — Sept 9-20',
      state: 'planning' as const,
      start_date: '2026-09-09T09:00:00Z',
      end_date: '2026-09-20T17:00:00Z',
      capacity: 45,
      goal: 'Complete adapter framework',
      metadata: {
        jira_board_id: 'PROJ-123',
        monday_board_id: 'board-456',
      },
      created_at: '2026-08-20T10:00:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'troi@familiarcat.com',
      custom_fields: {},
      audit_trail: [],
    } as Sprint,
  },

  story: {
    valid_basic: {
      id: '550e8400-e29b-41d4-a716-446655440010',
      tenant_id: 'familiarcat-prod',
      title: 'Implement native PM engine core API',
      description: 'Build REST API for Sprint, Story, Task CRUD operations',
      state: 'in_progress' as const,
      sprint_id: '550e8400-e29b-41d4-a716-446655440000',
      story_points: 21,
      assignee_id: 'riker@familiarcat.com',
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'picard@familiarcat.com',
    } as Story,

    valid_blocked: {
      id: '550e8400-e29b-41d4-a716-446655440011',
      tenant_id: 'familiarcat-prod',
      title: 'Migrate familiarcat from Jira',
      description: 'Move all issues and metadata',
      state: 'blocked' as const,
      sprint_id: '550e8400-e29b-41d4-a716-446655440000',
      story_points: 13,
      assignee_id: 'troi@familiarcat.com',
      blocked_by: ['550e8400-e29b-41d4-a716-446655440010'], // Blocked by core API story
      priority: 'high' as const,
      due_date: '2026-09-30T17:00:00Z',
      created_at: '2026-08-23T14:00:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'picard@familiarcat.com',
      labels: ['migration', 'phase-2'],
      custom_fields: {},
      audit_trail: [],
    } as Story,
  },

  task: {
    valid_basic: {
      id: '550e8400-e29b-41d4-a716-446655440020',
      tenant_id: 'familiarcat-prod',
      title: 'Design Sprint schema',
      description: 'Define required/optional fields, multi-tenant isolation',
      state: 'done' as const,
      story_id: '550e8400-e29b-41d4-a716-446655440010',
      assignee_id: 'data@familiarcat.com',
      created_at: '2026-08-24T10:00:00Z',
      updated_at: '2026-08-25T15:00:00Z',
      created_by: 'riker@familiarcat.com',
    } as Task,

    valid_with_dependencies: {
      id: '550e8400-e29b-41d4-a716-446655440021',
      tenant_id: 'familiarcat-prod',
      title: 'Write unit tests for schema validation',
      description: 'RFC3339, cycles, immutability',
      state: 'in_progress' as const,
      story_id: '550e8400-e29b-41d4-a716-446655440010',
      assignee_id: 'yar@familiarcat.com',
      blocked_by: ['550e8400-e29b-41d4-a716-446655440020'], // Depends on schema design
      priority: 'high' as const,
      estimated_hours: 8,
      created_at: '2026-08-25T09:00:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'riker@familiarcat.com',
      custom_fields: {},
      audit_trail: [],
    } as Task,
  },
};

/**
 * Adversarial Fixtures — Invalid data that should FAIL validation
 * These test error handling and prevent malformed data from entering the system
 */
export const ADVERSARIAL_FIXTURES = {
  sprint: {
    invalid_no_tenant_id: {
      id: '550e8400-e29b-41d4-a716-446655440050',
      // MISSING: tenant_id
      name: 'Bad Sprint',
      state: 'active' as const,
      start_date: '2026-08-26T09:00:00Z',
      end_date: '2026-09-06T17:00:00Z',
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'user@example.com',
    },

    invalid_bad_uuid: {
      id: 'not-a-uuid', // INVALID
      tenant_id: 'familiarcat-prod',
      name: 'Bad Sprint',
      state: 'active' as const,
      start_date: '2026-08-26T09:00:00Z',
      end_date: '2026-09-06T17:00:00Z',
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'user@example.com',
    },

    invalid_bad_rfc3339: {
      id: '550e8400-e29b-41d4-a716-446655440050',
      tenant_id: 'familiarcat-prod',
      name: 'Bad Sprint',
      state: 'active' as const,
      start_date: '2026-08-26 09:00:00', // INVALID (not RFC3339)
      end_date: '2026-09-06T17:00:00Z',
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'user@example.com',
    },

    invalid_end_before_start: {
      id: '550e8400-e29b-41d4-a716-446655440050',
      tenant_id: 'familiarcat-prod',
      name: 'Bad Sprint',
      state: 'active' as const,
      start_date: '2026-09-06T17:00:00Z', // END
      end_date: '2026-08-26T09:00:00Z', // START (reversed)
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'user@example.com',
    },

    invalid_bad_state: {
      id: '550e8400-e29b-41d4-a716-446655440050',
      tenant_id: 'familiarcat-prod',
      name: 'Bad Sprint',
      state: 'invalid_state' as any, // NOT IN StateEnum
      start_date: '2026-08-26T09:00:00Z',
      end_date: '2026-09-06T17:00:00Z',
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'user@example.com',
    },

    invalid_negative_capacity: {
      id: '550e8400-e29b-41d4-a716-446655440050',
      tenant_id: 'familiarcat-prod',
      name: 'Bad Sprint',
      state: 'active' as const,
      start_date: '2026-08-26T09:00:00Z',
      end_date: '2026-09-06T17:00:00Z',
      capacity: -10, // INVALID (must be positive)
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'user@example.com',
    },
  },

  story: {
    invalid_missing_title: {
      id: '550e8400-e29b-41d4-a716-446655440060',
      tenant_id: 'familiarcat-prod',
      // MISSING: title
      state: 'open' as const,
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'user@example.com',
    },

    invalid_self_blocking: {
      id: '550e8400-e29b-41d4-a716-446655440061',
      tenant_id: 'familiarcat-prod',
      title: 'Self-blocking story',
      state: 'open' as const,
      blocked_by: ['550e8400-e29b-41d4-a716-446655440061'], // INVALID: self-blocking
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'user@example.com',
    },

    invalid_circular_blocking: {
      id: '550e8400-e29b-41d4-a716-446655440062',
      tenant_id: 'familiarcat-prod',
      title: 'Story A',
      state: 'open' as const,
      blocked_by: ['550e8400-e29b-41d4-a716-446655440063'], // Blocked by B
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'user@example.com',
      // Story B would be blocked by Story A → circular dependency
    },

    invalid_negative_points: {
      id: '550e8400-e29b-41d4-a716-446655440064',
      tenant_id: 'familiarcat-prod',
      title: 'Bad story',
      state: 'open' as const,
      story_points: -5, // INVALID (must be non-negative)
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'user@example.com',
    },

    invalid_bad_priority: {
      id: '550e8400-e29b-41d4-a716-446655440065',
      tenant_id: 'familiarcat-prod',
      title: 'Bad story',
      state: 'open' as const,
      priority: 'ultra-high' as any, // INVALID (not in enum)
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'user@example.com',
    },
  },

  task: {
    invalid_missing_story_id: {
      id: '550e8400-e29b-41d4-a716-446655440070',
      tenant_id: 'familiarcat-prod',
      title: 'Orphan task',
      state: 'open' as const,
      // MISSING: story_id (required)
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'user@example.com',
    },

    invalid_self_blocking: {
      id: '550e8400-e29b-41d4-a716-446655440071',
      tenant_id: 'familiarcat-prod',
      title: 'Self-blocking task',
      state: 'open' as const,
      story_id: '550e8400-e29b-41d4-a716-446655440010',
      blocked_by: ['550e8400-e29b-41d4-a716-446655440071'], // INVALID: self-blocking
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'user@example.com',
    },

    invalid_negative_hours: {
      id: '550e8400-e29b-41d4-a716-446655440072',
      tenant_id: 'familiarcat-prod',
      title: 'Bad task',
      state: 'open' as const,
      story_id: '550e8400-e29b-41d4-a716-446655440010',
      estimated_hours: -8, // INVALID (must be positive)
      created_at: '2026-08-25T09:30:00Z',
      updated_at: '2026-08-25T09:30:00Z',
      created_by: 'user@example.com',
    },
  },
};

/**
 * Edge Case Fixtures — Boundary conditions and tricky scenarios
 */
export const EDGE_CASE_FIXTURES = {
  story_with_max_length_title: {
    id: '550e8400-e29b-41d4-a716-446655440080',
    tenant_id: 'familiarcat-prod',
    title: 'x'.repeat(500), // Max length
    state: 'open' as const,
    created_at: '2026-08-25T09:30:00Z',
    updated_at: '2026-08-25T09:30:00Z',
    created_by: 'user@example.com',
  },

  story_with_empty_blocked_by: {
    id: '550e8400-e29b-41d4-a716-446655440081',
    tenant_id: 'familiarcat-prod',
    title: 'Story with empty blockers',
    state: 'open' as const,
    blocked_by: [], // Empty array is valid
    created_at: '2026-08-25T09:30:00Z',
    updated_at: '2026-08-25T09:30:00Z',
    created_by: 'user@example.com',
  },

  sprint_with_zero_capacity: {
    id: '550e8400-e29b-41d4-a716-446655440082',
    tenant_id: 'familiarcat-prod',
    name: 'Zero capacity sprint',
    state: 'planning' as const,
    start_date: '2026-08-26T09:00:00Z',
    end_date: '2026-09-06T17:00:00Z',
    capacity: 0, // Edge case: zero capacity
    created_at: '2026-08-25T09:30:00Z',
    updated_at: '2026-08-25T09:30:00Z',
    created_by: 'user@example.com',
  },

  task_with_high_precision_hours: {
    id: '550e8400-e29b-41d4-a716-446655440083',
    tenant_id: 'familiarcat-prod',
    title: 'Precise task',
    state: 'open' as const,
    story_id: '550e8400-e29b-41d4-a716-446655440010',
    estimated_hours: 3.14159265, // Floating point precision
    created_at: '2026-08-25T09:30:00Z',
    updated_at: '2026-08-25T09:30:00Z',
    created_by: 'user@example.com',
  },
};
