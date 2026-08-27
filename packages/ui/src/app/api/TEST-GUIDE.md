/**
 * PM API Endpoint Testing Guide
 * 
 * This file documents the API endpoints and provides curl commands for quick manual testing
 * 
 * Prerequisites:
 * - Server running on http://localhost:3000
 * - Environment variables: SUPABASE_URL, SUPABASE_KEY set
 * - Database tables: sa_pm_sprints, sa_pm_stories, sa_pm_tasks created
 */

export const ENDPOINT_TESTS = {
  // ===== SPRINT ENDPOINTS =====

  'POST /api/sprints': {
    description: 'Create a new sprint',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'default-tenant',
      'x-user-id': 'user-123',
    },
    body: {
      name: 'Sprint 1',
      start_date: '2026-09-01',
      end_date: '2026-09-14',
      capacity: 40,
      goal: 'Deliver core features',
    },
    expectedStatus: 201,
    expectedResponse: {
      success: true,
      data: {
        id: 'string',
        tenant_id: 'default-tenant',
        name: 'Sprint 1',
        state: 'planning',
        created_by: 'user-123',
        created_at: 'ISO-8601 timestamp',
      },
    },
    curl: `curl -X POST http://localhost:3000/api/sprints \\
  -H "Content-Type: application/json" \\
  -H "x-tenant-id: default-tenant" \\
  -H "x-user-id: user-123" \\
  -d '{
    "name": "Sprint 1",
    "start_date": "2026-09-01",
    "end_date": "2026-09-14",
    "capacity": 40,
    "goal": "Deliver core features"
  }'`,
  },

  'GET /api/sprints': {
    description: 'List sprints for tenant with pagination',
    method: 'GET',
    queryParams: {
      limit: 'number (default: 20)',
      offset: 'number (default: 0)',
      state: 'string (optional: planning, in_progress, closed, archived)',
    },
    headers: {
      'x-tenant-id': 'default-tenant',
    },
    expectedStatus: 200,
    expectedResponse: {
      success: true,
      data: [{ id: 'string', name: 'string', state: 'string' }],
      pagination: { limit: 20, offset: 0, total: 42 },
    },
    curl: `curl -X GET "http://localhost:3000/api/sprints?limit=10&offset=0" \\
  -H "x-tenant-id: default-tenant"`,
  },

  'GET /api/sprints/[id]': {
    description: 'Get a single sprint by ID',
    method: 'GET',
    pathParams: { id: 'sprint-id-uuid' },
    headers: { 'x-tenant-id': 'default-tenant' },
    expectedStatus: 200,
    expectedResponse: {
      success: true,
      data: { id: 'string', name: 'string', state: 'string', capacity: 40 },
    },
    curl: `curl -X GET http://localhost:3000/api/sprints/550e8400-e29b-41d4-a716-446655440000 \\
  -H "x-tenant-id: default-tenant"`,
  },

  'PUT /api/sprints/[id]': {
    description: 'Update a sprint (name, capacity, state, etc)',
    method: 'PUT',
    pathParams: { id: 'sprint-id-uuid' },
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'default-tenant',
      'x-user-id': 'user-123',
    },
    body: {
      name: 'Sprint 1 - Updated',
      capacity: 45,
      state: 'in_progress',
    },
    expectedStatus: 200,
    validStateTransitions: ['planning→in_progress', 'in_progress→closed', 'closed→archived'],
    invalidStateTransitions: ['planning→closed', 'archived→*'],
    curl: `curl -X PUT http://localhost:3000/api/sprints/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Content-Type: application/json" \\
  -H "x-tenant-id: default-tenant" \\
  -H "x-user-id: user-123" \\
  -d '{
    "state": "in_progress",
    "capacity": 45
  }'`,
  },

  'DELETE /api/sprints/[id]': {
    description: 'Archive a sprint (soft delete)',
    method: 'DELETE',
    pathParams: { id: 'sprint-id-uuid' },
    headers: {
      'x-tenant-id': 'default-tenant',
      'x-user-id': 'user-123',
    },
    expectedStatus: 204,
    note: 'Soft delete: sets state to "archived"',
    curl: `curl -X DELETE http://localhost:3000/api/sprints/550e8400-e29b-41d4-a716-446655440000 \\
  -H "x-tenant-id: default-tenant" \\
  -H "x-user-id: user-123"`,
  },

  // ===== STORY ENDPOINTS =====

  'POST /api/stories': {
    description: 'Create a story in a sprint',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'default-tenant',
      'x-user-id': 'user-123',
    },
    body: {
      sprint_id: 'sprint-uuid',
      name: 'User authentication',
      description: 'Implement login/signup',
      story_points: 5,
    },
    expectedStatus: 201,
    curl: `curl -X POST http://localhost:3000/api/stories \\
  -H "Content-Type: application/json" \\
  -H "x-tenant-id: default-tenant" \\
  -H "x-user-id: user-123" \\
  -d '{
    "sprint_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "User authentication",
    "description": "Implement login/signup",
    "story_points": 5
  }'`,
  },

  'GET /api/stories': {
    description: 'List stories for tenant',
    method: 'GET',
    queryParams: {
      limit: 'number',
      offset: 'number',
      sprint_id: 'string (filter by sprint)',
      state: 'string (open, in_progress, review, closed, archived)',
    },
    headers: { 'x-tenant-id': 'default-tenant' },
    expectedStatus: 200,
  },

  'GET /api/stories/[id]': {
    description: 'Get a single story',
    method: 'GET',
    expectedStatus: 200,
  },

  'PUT /api/stories/[id]': {
    description: 'Update a story',
    method: 'PUT',
    validStateTransitions: [
      'open→in_progress',
      'in_progress→review',
      'review→closed',
      'closed→archived',
    ],
    curl: `curl -X PUT http://localhost:3000/api/stories/story-id \\
  -H "Content-Type: application/json" \\
  -H "x-tenant-id: default-tenant" \\
  -H "x-user-id: user-123" \\
  -d '{"state": "in_progress"}'`,
  },

  'DELETE /api/stories/[id]': {
    description: 'Archive a story',
    method: 'DELETE',
    expectedStatus: 204,
  },

  // ===== TASK ENDPOINTS =====

  'POST /api/tasks': {
    description: 'Create a task in a story',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'default-tenant',
      'x-user-id': 'user-123',
    },
    body: {
      story_id: 'story-uuid',
      name: 'Setup authentication library',
      description: 'Integrate Auth0 or similar',
      estimated_hours: 4,
    },
    expectedStatus: 201,
  },

  'GET /api/tasks': {
    description: 'List tasks for tenant',
    method: 'GET',
    queryParams: {
      limit: 'number',
      offset: 'number',
      story_id: 'string (filter by story)',
      state: 'string (todo, in_progress, done, archived)',
    },
    expectedStatus: 200,
  },

  'GET /api/tasks/[id]': {
    description: 'Get a single task',
    method: 'GET',
    expectedStatus: 200,
  },

  'PUT /api/tasks/[id]': {
    description: 'Update a task',
    method: 'PUT',
    validStateTransitions: [
      'todo→in_progress',
      'in_progress→done',
      'done→archived',
    ],
  },

  'DELETE /api/tasks/[id]': {
    description: 'Archive a task',
    method: 'DELETE',
    expectedStatus: 204,
  },
};

/**
 * Error Response Examples
 */
export const ERROR_RESPONSES = {
  RBAC_DENIED: {
    status: 403,
    body: {
      success: false,
      error: 'RBAC_DENIED: User cannot create sprints',
    },
  },
  VALIDATION_ERROR: {
    status: 400,
    body: {
      success: false,
      error: 'VALIDATION_ERROR: Invalid input',
      details: ['name is required', 'start_date must be ISO 8601'],
    },
  },
  NOT_FOUND: {
    status: 404,
    body: {
      success: false,
      error: 'NOT_FOUND: Sprint not found',
    },
  },
  INVALID_STATE_TRANSITION: {
    status: 400,
    body: {
      success: false,
      error: "VALIDATION_ERROR: Invalid state transition from 'planning' to 'closed'. Valid states: in_progress, archived",
    },
  },
  DB_ERROR: {
    status: 500,
    body: {
      success: false,
      error: 'Internal server error',
    },
  },
};

/**
 * Quick Test Workflow
 * Run these in order to test the complete flow
 */
export const QUICK_TEST_WORKFLOW = `
# 1. CREATE SPRINT
SPRINT_ID=$(curl -s -X POST http://localhost:3000/api/sprints \\
  -H "Content-Type: application/json" \\
  -H "x-tenant-id: test-tenant" \\
  -H "x-user-id: test-user" \\
  -d '{
    "name": "Test Sprint",
    "start_date": "2026-09-01",
    "end_date": "2026-09-14",
    "capacity": 40,
    "goal": "Test"
  }' | jq -r '.data.id')
echo "Created sprint: $SPRINT_ID"

# 2. GET SPRINT
curl -X GET http://localhost:3000/api/sprints/$SPRINT_ID \\
  -H "x-tenant-id: test-tenant" | jq

# 3. UPDATE SPRINT STATE
curl -X PUT http://localhost:3000/api/sprints/$SPRINT_ID \\
  -H "Content-Type: application/json" \\
  -H "x-tenant-id: test-tenant" \\
  -H "x-user-id: test-user" \\
  -d '{"state": "in_progress"}' | jq

# 4. CREATE STORY
STORY_ID=$(curl -s -X POST http://localhost:3000/api/stories \\
  -H "Content-Type: application/json" \\
  -H "x-tenant-id: test-tenant" \\
  -H "x-user-id: test-user" \\
  -d "{
    \"sprint_id\": \"$SPRINT_ID\",
    \"name\": \"Test Story\",
    \"description\": \"Test description\",
    \"story_points\": 5
  }" | jq -r '.data.id')
echo "Created story: $STORY_ID"

# 5. CREATE TASK
TASK_ID=$(curl -s -X POST http://localhost:3000/api/tasks \\
  -H "Content-Type: application/json" \\
  -H "x-tenant-id: test-tenant" \\
  -H "x-user-id: test-user" \\
  -d "{
    \"story_id\": \"$STORY_ID\",
    \"name\": \"Test Task\",
    \"description\": \"Test task\",
    \"estimated_hours\": 4
  }" | jq -r '.data.id')
echo "Created task: $TASK_ID"

# 6. PROGRESS TASK STATE
curl -X PUT http://localhost:3000/api/tasks/$TASK_ID \\
  -H "Content-Type: application/json" \\
  -H "x-tenant-id: test-tenant" \\
  -H "x-user-id: test-user" \\
  -d '{"state": "in_progress"}' | jq

# 7. PROGRESS STORY STATE
curl -X PUT http://localhost:3000/api/stories/$STORY_ID \\
  -H "Content-Type: application/json" \\
  -H "x-tenant-id: test-tenant" \\
  -H "x-user-id: test-user" \\
  -d '{"state": "in_progress"}' | jq

# 8. LIST SPRINTS
curl -X GET "http://localhost:3000/api/sprints?limit=5&offset=0" \\
  -H "x-tenant-id: test-tenant" | jq
`;

/**
 * State Machine Transitions Reference
 */
export const STATE_MACHINES = {
  sprint: {
    states: ['planning', 'in_progress', 'closed', 'archived'],
    transitions: {
      planning: ['in_progress', 'archived'],
      in_progress: ['closed', 'archived'],
      closed: ['archived'],
      archived: [],
    },
    description: 'Sprint lifecycle from planning to closed',
  },
  story: {
    states: ['open', 'in_progress', 'review', 'closed', 'archived'],
    transitions: {
      open: ['in_progress', 'archived'],
      in_progress: ['review', 'archived'],
      review: ['closed', 'in_progress', 'archived'],
      closed: ['archived'],
      archived: [],
    },
    description: 'Story lifecycle with review step',
  },
  task: {
    states: ['todo', 'in_progress', 'done', 'archived'],
    transitions: {
      todo: ['in_progress', 'archived'],
      in_progress: ['done', 'archived'],
      done: ['archived'],
      archived: [],
    },
    description: 'Task lifecycle from todo to done',
  },
};

/**
 * Caching Strategy
 * 
 * Individual entities (GET /sprints/[id]):
 * - TTL: 300 seconds (5 minutes)
 * - Invalidation: On create, update, or delete of entity
 * 
 * List endpoints (GET /sprints):
 * - TTL: 60 seconds (1 minute)
 * - Invalidation: On any write operation to tenant
 * 
 * Cache keys:
 * - sprint:{tenantId}:{sprintId}
 * - sprints:{tenantId}:{state}:{limit}:{offset}
 * - story:{tenantId}:{storyId}
 * - stories:{tenantId}:{sprintId}:{state}
 * - task:{tenantId}:{taskId}
 * - tasks:{tenantId}:{storyId}:{state}
 */
