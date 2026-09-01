/**
 * Test fixtures for PM contracts validation
 * Provides valid, invalid, and adversarial test data for conflict resolution and schema tests
 */

/**
 * Valid fixtures that should pass all validation rules
 * All UUIDs are v4 format, timestamps are RFC3339, required fields present
 */
export const VALID_FIXTURES = {
  // Valid sprint data structures (schema requires: id, tenant_id, name, state, start_date, end_date, created_at, updated_at, created_by)
  sprint: {
    valid_basic: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Sprint 1',
      state: 'planning' as const,
      start_date: '2026-08-01T00:00:00Z',
      end_date: '2026-08-15T00:00:00Z',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
      capacity: 40,
      goal: 'Deliver core features',
    },
    valid_with_metadata: {
      id: '550e8400-e29b-41d4-a716-446655440011',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Sprint with metadata',
      state: 'planning' as const,
      start_date: '2026-08-01T00:00:00Z',
      end_date: '2026-08-15T00:00:00Z',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
      metadata: { source: 'test' },
    },
  },
  
  // Valid story data structures (schema requires: id, tenant_id, title, state, created_at, updated_at, created_by)
  story: {
    valid_basic: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Build authentication',
      state: 'open' as const,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
      description: 'Implement OAuth integration',
      priority: 'high',
    },
    valid_blocked: {
      id: '550e8400-e29b-41d4-a716-446655440012',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Blocked story',
      state: 'blocked' as const,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
      blocked_by: ['550e8400-e29b-41d4-a716-446655440003'],
    },
  },

  // Valid task data structures (schema requires: id, tenant_id, title, state, created_at, updated_at, created_by)
  task: {
    valid_basic: {
      id: '550e8400-e29b-41d4-a716-446655440004',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Implement OAuth flow',
      state: 'open' as const,
      story_id: '550e8400-e29b-41d4-a716-446655440003',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
      description: 'Add OAuth login support',
    },
    valid_with_dependencies: {
      id: '550e8400-e29b-41d4-a716-446655440013',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Dependent task',
      state: 'open' as const,
      story_id: '550e8400-e29b-41d4-a716-446655440003',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
      blocked_by: ['550e8400-e29b-41d4-a716-446655440004'],
    },
  },
};

/**
 * Adversarial fixtures designed to break validation if guards aren't in place
 */
export const ADVERSARIAL_FIXTURES = {
  // Invalid sprint data (missing/invalid required fields)
  sprint: {
    invalid: {
      id: 'not-a-uuid', // Invalid UUID
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Sprint 1',
      state: 'invalid-state',
      start_date: '2026-08-01T00:00:00Z',
      end_date: '2026-08-15T00:00:00Z',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
    },
  },

  // Invalid story data
  story: {
    invalid: {
      id: '550e8400-e29b-41d4-a716-446655440005',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      title: '', // Empty title - invalid
      state: 'unknown-status', // Not a valid status
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
    },
  },

  // Invalid task data
  task: {
    invalid: {
      id: '550e8400-e29b-41d4-a716-446655440006',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      title: '', // Empty title - invalid
      state: 'invalid-state',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
    },
  },
};

/**
 * Edge case fixtures for boundary testing
 */
export const EDGE_CASE_FIXTURES = {
  sprint: {
    minimal: {
      id: '550e8400-e29b-41d4-a716-446655440007',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'S',
      state: 'planning' as const,
      start_date: '2026-08-01T00:00:00Z',
      end_date: '2026-08-01T00:00:01Z', // Minimal duration
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
    },
    sprint_with_zero_capacity: {
      id: '550e8400-e29b-41d4-a716-446655440014',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Zero capacity sprint',
      state: 'planning' as const,
      start_date: '2026-08-01T00:00:00Z',
      end_date: '2026-08-01T00:00:01Z',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
      capacity: 0,
    },
  },

  story: {
    minimal: {
      id: '550e8400-e29b-41d4-a716-446655440008',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'T',
      state: 'open' as const,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
    },
    story_with_max_length_title: {
      id: '550e8400-e29b-41d4-a716-446655440015',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'x'.repeat(500),
      state: 'open' as const,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
    },
    story_with_empty_blocked_by: {
      id: '550e8400-e29b-41d4-a716-446655440016',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Unblocked story',
      state: 'open' as const,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
      blocked_by: [],
    },
  },

  task: {
    minimal: {
      id: '550e8400-e29b-41d4-a716-446655440009',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'T',
      state: 'open' as const,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
    },
    task_with_high_precision_hours: {
      id: '550e8400-e29b-41d4-a716-446655440017',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Precise task',
      state: 'open' as const,
      story_id: '550e8400-e29b-41d4-a716-446655440003',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
      estimated_hours: 1.25,
    },
  },
};

/**
 * Integration scenarios combining multiple entities
 */
export const INTEGRATION_SCENARIOS = {
  // Scenario 1: Cross-tool conflict example
  conflictScenario: {
    storyId: '550e8400-e29b-41d4-a716-446655440010',
    tenantId: '550e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    jiraVersion: {
      id: '550e8400-e29b-41d4-a716-446655440010',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Build auth',
      state: 'done' as const,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T10:00:00Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
    },
    mondayVersion: {
      id: '550e8400-e29b-41d4-a716-446655440010',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Build auth',
      state: 'in_progress' as const,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T10:00:05Z',
      created_by: '550e8400-e29b-41d4-a716-446655440002',
    },
  },
};
