# Crew Memory Guide

How each crew member stores, retrieves, and learns from personal insights and experiences across
projects. Covers the MCP tools, the UI dashboard, the API routes, and the underlying
`@story-agent/shared` library.

Unlike **baseline memories** (shared crew knowledge), **personal memories** capture individual crew
member learnings that accumulate over time — compounding institutional knowledge across client
projects.

## Quick Start

### Memory types

| Type | Purpose | Example |
|------|---------|---------|
| **insight** | A discovery or realization | "Database partitioning by date improves query speed 3x for time-series data" |
| **lesson_learned** | Learning from experience or mistakes | "We implemented RLS incorrectly initially; the org_id must be composite key with id" |
| **decision_note** | Rationale for architectural decisions | "We chose PostgreSQL JSONB over separate tables because schema flexibility was critical" |
| **reminder** | Procedural reminder for future tasks | "Always add org_id column first when creating new multi-tenant table" |

### MCP tools

When a crew member completes a task, they can store learnings:

```typescript
// Example: Worf stores security insights
const memoryId = await callMcpTool('crew:store-memory', {
  crew_id: 'worf',
  memory_type: 'lesson_learned',
  title: 'RLS Implementation Pattern',
  content: 'Successfully implemented RLS with org_id as composite key...',
  project_id: 'client-pctms',
  task_id: 'CLIENT-001',
  tags: ['rls', 'security', 'multi-tenant'],
});
```

#### `crew:store-memory` — store a memory for future reference

Parameters:

- `crew_id` (required): Who is storing ('worf', 'data', etc.)
- `memory_type` (required): insight | lesson_learned | decision_note | reminder
- `title` (required): Short summary
- `content` (required): Full memory text
- `project_id` (optional): Which project
- `task_id` (optional): Which task
- `tags` (optional): Searchable tags
- `relates_to_crew` (optional): Other crew involved

Example response:

```json
{
  "success": true,
  "memoryId": 42,
  "message": "✅ Memory stored for worf (ID: 42)"
}
```

#### `crew:get-memories` — retrieve all memories for a crew member

```typescript
const memories = await callMcpTool('crew:get-memories', {
  crew_id: 'geordi',
  limit: 20,
  include_private: false,
});
```

#### `crew:search-memories` — search memories by text

```typescript
const results = await callMcpTool('crew:search-memories', {
  crew_id: 'worf',
  query: 'RLS security patterns',
  limit: 10,
});
```

#### `crew:search-memories-by-embedding` — AI-powered semantic search

Understands meaning and context — finds memories even if words don't match exactly. Great for
discovering related expertise.

```typescript
// Ask a question; system finds related memories
const relatedLearnings = await callMcpTool('crew:search-memories-by-embedding', {
  crew_id: 'data',
  query: 'How should we design multi-tenant database schemas?',
  limit: 10,
  similarity_threshold: 0.7,  // Higher = more similar
});
```

#### `crew:get-project-memories` — what a crew member learned on a specific project

```typescript
// See all of Geordi's learnings on the Pharma project
const pharmaLearnings = await callMcpTool('crew:get-project-memories', {
  crew_id: 'geordi',
  project_id: 'pharma-trials',
  limit: 20,
});
```

#### `crew:get-memory-stats` — statistics about crew expertise

```typescript
const stats = await callMcpTool('crew:get-memory-stats', {
  crew_id: 'worf',
});
```

Response:

```json
{
  "stats": [
    {
      "total_memories": 15,
      "memory_by_type": "lesson_learned",
      "projects_count": 3,
      "most_recent_memory": "2026-06-07T14:30:00Z"
    }
  ]
}
```

### UI dashboard

Navigate to `http://localhost:3000/crew/memories`.

Sidebar (left):

- **Crew selection**: choose which crew member to view
- **Project filter**: focus on specific projects
- **Memory type filter**: view only certain memory types
- **Statistics**: memory counts by type and project

Main area (right):

- **Search bar**: find memories by text or semantic meaning
- **Semantic toggle**: switch between text and AI search
- **Memory cards**: view individual memories
- **Summary**: total count and filtering info

Example — find Worf's RLS learnings: select "worf" from the dropdown, select the
"client-pctms" project, filter type "Lesson Learned", search "RLS".

Example — semantic search: enable the semantic toggle, ask a question ("How do I implement
multi-tenant isolation?"), and the system finds semantically related memories across crew
(Data's schema decisions, Worf's RLS patterns, etc.).

Project retrospective: `/crew/memories?project=client-pctms` shows all memories from that
project — what each crew member learned.

### API routes

For custom applications or integrations:

```bash
# GET /api/crew/memories — all memories for a crew member
curl "http://localhost:3000/api/crew/memories?crew=worf&limit=20"

# GET /api/crew/memories/search — text search
curl "http://localhost:3000/api/crew/memories/search?crew=worf&query=RLS&limit=10"

# GET /api/crew/memories/search-semantic — semantic search with AI
curl "http://localhost:3000/api/crew/memories/search-semantic?crew=data&query=database%20schema%20design&limit=10"

# GET /api/crew/memories/project — memories for a specific project
curl "http://localhost:3000/api/crew/memories/project?crew=geordi&project=pharma-trials&limit=20"

# GET /api/crew/memories/stats — memory statistics
curl "http://localhost:3000/api/crew/memories/stats?crew=worf"
```

Example response shape:

```json
{
  "success": true,
  "count": 5,
  "memories": [
    {
      "id": 42,
      "crew_id": "worf",
      "memory_type": "lesson_learned",
      "title": "RLS Pattern",
      "content": "...",
      "project_id": "client-pctms",
      "tags": ["rls", "security"],
      "created_at": "2026-06-07T14:30:00Z"
    }
  ]
}
```

### Integration tests

```bash
npm run test:integration                          # all integration tests
npm run test -- crew-memory-integration           # crew memory tests only
npm run test -- --coverage crew-memory-integration # with coverage
```

Test suite: `packages/shared/test/crew-memory-integration.test.ts` (multi-project crew memory
integration — learning phase, knowledge transfer phase, data isolation; 40+ tests).

### Quick commands

```bash
# Start the system
npm run dev

# Run all tests
npm run test:integration

# View crew memories dashboard
# Open: http://localhost:3000/crew/memories

# Check MCP tools
npm run mcp

# Verify project setup
npm run project:info
```

### Troubleshooting

- **"No memories found"** — check the crew name spelling, verify memories were stored (check the
  database), try a broader search query.
- **"Semantic search returns wrong results"** — increase `similarity_threshold` (0.7 → 0.85), try
  different query wording, check that embeddings are generated.
- **"Data isolation not working"** — verify Supabase RLS policies are enabled, check org_id is set
  correctly, review RLS policy logs.

## Personal Memories System (library deep dive)

The `@story-agent/shared` functions underneath the MCP tools and API routes. Implementation:
[packages/shared/src/db.ts](../../packages/shared/src/db.ts).

### Storing a memory

Use `storeCrewPersonalMemory()` to capture learning during or after task execution:

```typescript
import { storeCrewPersonalMemory } from '@story-agent/shared';

// Worf discovers a security pattern
await storeCrewPersonalMemory({
  crew_id: 'worf',
  memory_type: 'lesson_learned',
  title: 'RLS Policy Design Pattern for Multi-Tenant Systems',
  content: `
    Discovered that RLS policies work best when:
    1. org_id is the first column in composite keys
    2. All tables have consistent org_id column name
    3. RLS policies check auth.jwt()->>'org_id' first

    This pattern prevented org_id conflicts in Client project.
  `,
  project_id: 'client-pctms',
  tags: ['rls', 'security', 'multi-tenant', 'postgresql'],
  relates_to_crew: ['data', 'geordi'],  // Who else should know this
});
```

Result: memory stored with ID returned, accessible via search.

### Retrieving personal memories

All memories for a crew member:

```typescript
import { getCrewPersonalMemories } from '@story-agent/shared';

const memories = await getCrewPersonalMemories('worf', 20);

memories.forEach(m => {
  console.log(`[${m.memory_type}] ${m.title}`);
  console.log(`  Project: ${m.project_id}`);
  console.log(`  Tags: ${m.tags.join(', ')}`);
});
```

Memories by project:

```typescript
import { getCrewMemoriesByProject } from '@story-agent/shared';

// When starting work on new Pharma project, retrieve Worf's security learnings
const pharma_insights = await getCrewMemoriesByProject('worf', 'pharma-trials', 20);

// Apply Client's RLS patterns to Pharma project
pharma_insights
  .filter(m => m.tags.includes('rls'))
  .forEach(m => {
    console.log(`Applying Client learning to Pharma: ${m.title}`);
  });
```

### Searching memories

Text search — by keywords in title or content:

```typescript
import { searchCrewPersonalMemories } from '@story-agent/shared';

const perf_tips = await searchCrewPersonalMemories(
  'geordi',
  'index performance query optimization',
  10  // limit
);
```

Semantic search — find similar memories by meaning (not just keywords):

```typescript
import { searchCrewPersonalMemoriesByEmbedding, toEmbedding } from '@story-agent/shared';

const question = "How should I design a schema for time-series financial data?";
const embedding = await toEmbedding(question);

const similar = await searchCrewPersonalMemoriesByEmbedding(
  'data',
  embedding,
  10,      // limit
  0.7      // similarity threshold
);
```

### Memory statistics

```typescript
import { getCrewMemoryStats } from '@story-agent/shared';

const worf_stats = await getCrewMemoryStats('worf');

worf_stats.forEach(stat => {
  console.log(`${stat.memory_by_type}: ${stat.total_memories} memories across ${stat.projects_count} projects`);
  console.log(`  Most recent: ${stat.most_recent_memory}`);
});
```

### Crew workflow example: knowledge transfer between projects

**Day 1 — Client project (implementing RLS)**

```typescript
// After discovering the RLS pattern
await storeCrewPersonalMemory({
  crew_id: 'worf',
  memory_type: 'lesson_learned',
  title: 'RLS Composite Key Pattern',
  content: 'Put org_id as first column in composite keys...',
  project_id: 'client-pctms',
  tags: ['rls', 'security'],
});
```

**Day 15 — Pharma project (new client)**

```typescript
// When implementing RLS on new project
const client_rls_patterns = await searchCrewPersonalMemories('worf', 'RLS composite key', 5);

// Apply the learned pattern, then store what we learned on Pharma
await storeCrewPersonalMemory({
  crew_id: 'worf',
  memory_type: 'decision_note',
  title: 'Pharma RLS Implementation - Reused Client Pattern',
  content: 'Successfully applied RLS composite key pattern from Client...',
  project_id: 'pharma-trials',
  tags: ['rls', 'security', 'pattern-reuse'],
});
```

The same flow applies to any domain — e.g. Geordi storing an `insight` on B-Tree vs GiST index
performance for JSON queries on one project (B-Tree 5x faster for exact JSON queries; 50ms → 10ms),
then retrieving it with `getCrewMemoriesByProject` when the next project has JSON columns.

### Crew member coordination

Each memory can reference related crew members via `relates_to_crew`:

```typescript
// Crusher stores a testing lesson referencing Worf's RLS learning
await storeCrewPersonalMemory({
  crew_id: 'crusher',
  memory_type: 'lesson_learned',
  title: 'Edge Case Testing for Multi-Tenant Isolation',
  content: 'Found that testing org_id boundary conditions...',
  project_id: 'client-pctms',
  relates_to_crew: ['worf', 'troi'],
});

await storeCrewPersonalMemory({
  crew_id: 'troi',
  memory_type: 'reminder',
  title: 'Communicate Multi-Tenant Testing Strategy to Stakeholders',
  content: 'Remember to explain org_id isolation in client meeting',
  relates_to_crew: ['crusher', 'picard'],
});
```

### Memory privacy and isolation

Control whether memories are visible to other crew members:

```typescript
// Worf's private note (only he can see)
await storeCrewPersonalMemory({
  crew_id: 'worf',
  memory_type: 'reminder',
  title: 'Personal Development Goal - Learn Rust',
  content: 'Working on improving systems programming skills...',
  is_private: true,  // Only Worf can see this
});

// Shared learning (visible to team) — is_private: false is the default
```

Each project's memories are completely isolated: memories from project A are never visible on
project B (enforced by Supabase RLS).

### Best practices

1. **Store memories immediately** — capture learnings while they're fresh, right after discovering
   them (e.g. at the end of the implementing function), not later.

2. **Tag memories consistently** — use tags that recur across memories so future searches match:

   ```typescript
   const COMMON_TAGS = [
     'rls', 'security', 'postgresql', 'performance',
     'testing', 'documentation', 'deployment',
     'multi-tenant', 'compliance'
   ];
   ```

3. **Link related crew members** — when a decision involved multiple crew, list them in
   `relates_to_crew`.

4. **Reference projects and tasks** — always include `project_id` (and `task_id` when applicable)
   to enable project-specific retrieval.

5. **Use semantic search for discovery** — search with natural-language questions
   (`toEmbedding("How do I optimize queries for time-series medical data?")`) rather than exact
   keyword matching only.

### Integration with task execution

During task planning — review crew memories before starting:

```typescript
async function planTask(taskDomains, crewIds) {
  for (const crewId of crewIds) {
    const memories = await getCrewPersonalMemories(crewId, 10);
    console.log(`${crewId}'s experience: ${memories.length} relevant memories`);
  }
}
```

During task execution — store insights as they're discovered:

```typescript
async function executeTask(task) {
  const insights = [];

  // ... task execution ...

  for (const insight of insights) {
    await storeCrewPersonalMemory({
      crew_id: task.assigned_crew,
      memory_type: 'insight',
      title: insight.title,
      content: insight.description,
      project_id: task.project_id,
      task_id: task.id,
      tags: insight.tags,
    });
  }
}
```

After task completion — review what was learned:

```typescript
async function debrief(task) {
  const taskMemories = await getCrewMemoriesByProject(
    task.assigned_crew,
    task.project_id
  );
  console.log(`Task complete. ${taskMemories.length} total learnings stored.`);
}
```

## Summary

The system transforms crew member learnings into institutional knowledge that compounds over time:

- **Individual growth**: each crew member accumulates expertise
- **Collective intelligence**: crew members learn from each other's experiences
- **Scalable onboarding**: new projects start with accumulated wisdom
- **Continuous improvement**: every project adds to the knowledge base

For the surrounding multi-client architecture (projects, RLS isolation, crew learning flow), see
[../architecture/monorepo.md](../architecture/monorepo.md).
