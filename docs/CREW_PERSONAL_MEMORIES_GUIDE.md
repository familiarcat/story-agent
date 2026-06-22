# Crew Personal Memories System

A system for each crew member to store, retrieve, and learn from personal insights and experiences across projects.

## Overview

The Personal Memories System enables autonomous crew members to:

- **Store learnings** from task execution
- **Share insights** with other crew members (or keep private)
- **Retrieve past experiences** when starting new projects
- **Apply lessons learned** to avoid repeating mistakes
- **Compound institutional knowledge** across client projects

Unlike **baseline memories** (shared crew knowledge), **personal memories** capture individual crew member learnings that accumulate over time.

## Memory Types

Each memory has a type that indicates its purpose:

| Type | Purpose | Example |
|------|---------|---------|
| **insight** | A discovery or realization | "Database partitioning by date improves query speed 3x for time-series data" |
| **lesson_learned** | Learning from experience or mistakes | "We implemented RLS incorrectly initially; the org_id must be composite key with id" |
| **decision_note** | Rationale for architectural decisions | "We chose PostgreSQL JSONB over separate tables because schema flexibility was critical for Client" |
| **reminder** | Procedural reminder for future tasks | "Always add org_id column first when creating new multi-tenant table" |

## Storing a Memory

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

Result: Memory stored with ID returned, accessible via search.

## Retrieving Personal Memories

### All Memories for a Crew Member

```typescript
import { getCrewPersonalMemories } from '@story-agent/shared';

// Worf retrieves all his memories
const memories = await getCrewPersonalMemories('worf', 20);

memories.forEach(m => {
  console.log(`[${m.memory_type}] ${m.title}`);
  console.log(`  Project: ${m.project_id}`);
  console.log(`  Tags: ${m.tags.join(', ')}`);
});
```

### Memories by Project

```typescript
import { getCrewMemoriesByProject } from '@story-agent/shared';

// When starting work on new Pharma project, retrieve Worf's security learnings
const pharma_insights = await getCrewMemoriesByProject('worf', 'pharma-trials', 20);

// Apply Client's RLS patterns to Pharma project
pharma_insights
  .filter(m => m.tags.includes('rls'))
  .forEach(m => {
    console.log(`📋 Applying Client learning to Pharma: ${m.title}`);
  });
```

## Searching Memories

### Text Search

Search by keywords in title or content:

```typescript
import { searchCrewPersonalMemories } from '@story-agent/shared';

// Geordi searches for performance optimization learnings
const perf_tips = await searchCrewPersonalMemories(
  'geordi',
  'index performance query optimization',
  10  // limit
);

perf_tips.forEach(m => {
  console.log(`🔍 Found: ${m.title}`);
});
```

### Semantic Search

Find similar memories by meaning (not just keywords):

```typescript
import { searchCrewPersonalMemoriesByEmbedding, toEmbedding } from '@story-agent/shared';

// Data wants to find schema design patterns
const question = "How should I design a schema for time-series financial data?";
const embedding = await toEmbedding(question);

const similar = await searchCrewPersonalMemoriesByEmbedding(
  'data',
  embedding,
  10,      // limit
  0.7      // similarity threshold
);

similar.forEach(m => {
  console.log(`📊 Relevant to your question: ${m.title}`);
});
```

## Crew Workflow Examples

### Example 1: Worf's Security Learning Flow

**Day 1 - Client Project (Implementing RLS)**

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

**Day 15 - Pharma Project (New Client)**

```typescript
// When implementing RLS on new project
const client_rls_patterns = await searchCrewPersonalMemories(
  'worf',
  'RLS composite key',
  5
);

// Apply the learned pattern
console.log(`📚 Applying ${client_rls_patterns.length} RLS patterns from Client`);
client_rls_patterns.forEach(m => {
  console.log(`  • ${m.title}`);
});

// Then store what we learned on Pharma
await storeCrewPersonalMemory({
  crew_id: 'worf',
  memory_type: 'decision_note',
  title: 'Pharma RLS Implementation - Reused Client Pattern',
  content: 'Successfully applied RLS composite key pattern from Client...',
  project_id: 'pharma-trials',
  tags: ['rls', 'security', 'pattern-reuse'],
});
```

### Example 2: Geordi's Performance Learning Across Projects

**Client Project - Index Performance Optimization**

```typescript
// After discovering index strategy
await storeCrewPersonalMemory({
  crew_id: 'geordi',
  memory_type: 'insight',
  title: 'B-Tree vs GiST Index Performance for JSON Queries',
  content: `
    B-Tree indexes are 5x faster than GiST for exact JSON queries on Client's
    trial data schema. GiST better for range/containment queries.
    
    Baseline: 50ms query time with GiST
    Optimized: 10ms with B-Tree (80% improvement)
  `,
  project_id: 'client-pctms',
  tags: ['performance', 'indexes', 'json', 'postgresql'],
});
```

**Next Project - Immediate Benefit**

```typescript
// When new project starts
const geordi_perf_tips = await getCrewMemoriesByProject('geordi', 'new-project');

// Pharma project learns from Client's experience
if (pharma_schema.hasJsonColumns()) {
  console.log('🎯 Applying Client index strategy to new project');
  // Use B-Tree indexes immediately, skip GiST testing
}
```

## Crew Member Coordination

### Finding Related Memories

Each memory can reference related crew members:

```typescript
// Troi and Crusher store related insights
await storeCrewPersonalMemory({
  crew_id: 'crusher',
  memory_type: 'lesson_learned',
  title: 'Edge Case Testing for Multi-Tenant Isolation',
  content: 'Found that testing org_id boundary conditions...',
  project_id: 'client-pctms',
  relates_to_crew: ['worf', 'troi'],  // References Worf's RLS learning
});

await storeCrewPersonalMemory({
  crew_id: 'troi',
  memory_type: 'reminder',
  title: 'Communicate Multi-Tenant Testing Strategy to Stakeholders',
  content: 'Remember to explain org_id isolation in client meeting',
  relates_to_crew: ['crusher', 'picard'],  // References Crusher's testing
});
```

### Retrieving All Crew Memories

Get memory statistics for a crew member:

```typescript
import { getCrewMemoryStats } from '@story-agent/shared';

const worf_stats = await getCrewMemoryStats('worf');

worf_stats.forEach(stat => {
  console.log(`${stat.memory_by_type}: ${stat.total_memories} memories across ${stat.projects_count} projects`);
  console.log(`  Most recent: ${stat.most_recent_memory}`);
});
```

## Memory Privacy

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

// Shared learning (visible to team)
await storeCrewPersonalMemory({
  crew_id: 'worf',
  memory_type: 'insight',
  title: 'RLS Pattern Worth Sharing',
  content: '...',
  is_private: false,  // Team can see this (default)
});
```

## Best Practices

### 1. **Store Memories Immediately**

Capture learnings while they're fresh:

```typescript
// ✅ Good: Store learning right after discovering it
async function implementRLS() {
  // ... RLS implementation ...
  
  // Immediately capture learning
  await storeCrewPersonalMemory({
    crew_id: 'worf',
    memory_type: 'lesson_learned',
    title: '...',
    content: '...',
  });
}

// ❌ Avoid: Waiting to store memories later
```

### 2. **Tag Memories Consistently**

Use consistent tags for searchability:

```typescript
// Tags that appear in multiple memories
const COMMON_TAGS = [
  'rls', 'security', 'postgresql', 'performance',
  'testing', 'documentation', 'deployment',
  'multi-tenant', 'compliance'
];

// ✅ Good
await storeCrewPersonalMemory({
  crew_id: 'worf',
  tags: ['rls', 'security', 'multi-tenant'],  // Consistent tags
});

// ❌ Avoid random tags that won't match future searches
```

### 3. **Link Related Crew Members**

Document collaboration:

```typescript
// ✅ When decision involved multiple crew
await storeCrewPersonalMemory({
  crew_id: 'data',
  memory_type: 'decision_note',
  title: 'Schema Design Choice: JSONB vs Normalized',
  content: '...',
  relates_to_crew: ['worf', 'geordi', 'picard'],  // All involved
});
```

### 4. **Reference Projects and Tasks**

Enable project-specific retrieval:

```typescript
// ✅ Always include project context
await storeCrewPersonalMemory({
  crew_id: 'geordi',
  project_id: 'client-pctms',  // Which project
  task_id: 'PCTMS-001',        // Which task
  memory_type: 'insight',
  // ...
});
```

### 5. **Use Semantic Search for Discovery**

When searching, ask questions:

```typescript
// ✅ Search with natural language
const embedding = await toEmbedding(
  "How do I optimize queries for time-series medical data?"
);
const results = await searchCrewPersonalMemoriesByEmbedding('geordi', embedding);

// ❌ Avoid: Exact keyword matching only
// const results = await searchCrewPersonalMemories('geordi', 'time-series');
```

## Integration with Task Execution

### During Task Planning

```typescript
// Before starting task, review crew memories
async function planTask(taskDomains, crewIds) {
  for (const crewId of crewIds) {
    const memories = await getCrewPersonalMemories(crewId, 10);
    console.log(`📚 ${crewId}'s experience: ${memories.length} relevant memories`);
  }
}
```

### During Task Execution

```typescript
// Store insights as they're discovered
async function executeTask(task) {
  const insights = [];
  
  // ... task execution ...
  
  // Capture learning
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

### After Task Completion

```typescript
// Review what was learned
async function debrief(task) {
  const taskMemories = await getCrewMemoriesByProject(
    task.assigned_crew,
    task.project_id
  );
  
  console.log(`✅ Task complete. ${taskMemories.length} total learnings stored.`);
}
```

## Summary

The Personal Memories System transforms crew member learnings into institutional knowledge that compounds over time:

- **Individual growth**: Each crew member accumulates expertise
- **Collective intelligence**: Crew members learn from each other's experiences
- **Scalable onboarding**: New projects start with years of accumulated wisdom
- **Continuous improvement**: Every project adds to the knowledge base

The system enables the crew to become more capable with each client project! 🚀

---

For more information:
- [MONOREPO_MULTI_CLIENT_ARCHITECTURE.md](MONOREPO_MULTI_CLIENT_ARCHITECTURE.md)
- [AUTONOMOUS_CREW_MISSION_TEST.md](AUTONOMOUS_CREW_MISSION_TEST.md)
- [packages/shared/src/db.ts](../packages/shared/src/db.ts) - Implementation
