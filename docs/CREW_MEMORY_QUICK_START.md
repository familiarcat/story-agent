# 🚀 Quick Start: Using the Crew Memory System

Complete guide to using the crew personal memory system in story-agent.

---

## 🎯 What You Can Do Now

After today's implementation, you can:

1. **Store crew member insights** via MCP tools
2. **Search memories** using text or AI-powered semantic search
3. **View crew expertise** in a beautiful dashboard
4. **Track learning** across multiple projects
5. **Transfer knowledge** between projects automatically

---

## 📖 USING THE MCP TOOLS

### For Autonomous Crew Execution

When a crew member completes a task, they can now store learnings:

```typescript
// Example: Worf stores security insights
const memoryId = await callMcpTool('crew:store-memory', {
  crew_id: 'worf',
  memory_type: 'lesson_learned',
  title: 'RLS Implementation Pattern',
  content: 'Successfully implemented RLS with org_id as composite key...',
  project_id: 'bayer-pctms',
  task_id: 'BAYER-001',
  tags: ['rls', 'security', 'multi-tenant'],
});
```

### Tool: crew:store-memory
Store a memory for future reference

**Parameters**:
- `crew_id` (required): Who is storing ('worf', 'data', etc.)
- `memory_type` (required): insight | lesson_learned | decision_note | reminder
- `title` (required): Short summary
- `content` (required): Full memory text
- `project_id` (optional): Which project
- `task_id` (optional): Which task
- `tags` (optional): Searchable tags
- `relates_to_crew` (optional): Other crew involved

**Example Response**:
```json
{
  "success": true,
  "memoryId": 42,
  "message": "✅ Memory stored for worf (ID: 42)"
}
```

### Tool: crew:get-memories
Retrieve all memories for a crew member

```typescript
const memories = await callMcpTool('crew:get-memories', {
  crew_id: 'geordi',
  limit: 20,
  include_private: false,
});
```

### Tool: crew:search-memories
Search memories by text

```typescript
const results = await callMcpTool('crew:search-memories', {
  crew_id: 'worf',
  query: 'RLS security patterns',
  limit: 10,
});
```

### Tool: crew:search-memories-by-embedding
**AI-Powered Semantic Search** — Understands meaning and context

```typescript
// Ask a question; system finds related memories
const relatedLearnings = await callMcpTool('crew:search-memories-by-embedding', {
  crew_id: 'data',
  query: 'How should we design multi-tenant database schemas?',
  limit: 10,
  similarity_threshold: 0.7,  // Higher = more similar
});
```

**Why Semantic Search?**
- Finds memories even if words don't match exactly
- Understands context and intent
- Great for discovering related expertise

### Tool: crew:get-project-memories
Get what a crew member learned on a specific project

```typescript
// See all of Geordi's learnings on the Pharma project
const pharmaLearnings = await callMcpTool('crew:get-project-memories', {
  crew_id: 'geordi',
  project_id: 'pharma-trials',
  limit: 20,
});
```

### Tool: crew:get-memory-stats
Get statistics about crew expertise

```typescript
const stats = await callMcpTool('crew:get-memory-stats', {
  crew_id: 'worf',
});
```

**Response**:
```json
{
  "stats": [
    {
      "total_memories": 15,
      "memory_by_type": "lesson_learned",
      "projects_count": 3,
      "most_recent_memory": "2026-06-07T14:30:00Z"
    },
    ...
  ]
}
```

---

## 📱 USING THE UI DASHBOARD

### Access the Dashboard

Navigate to: `http://localhost:3000/crew/memories`

### Dashboard Features

**Sidebar (Left)**:
- 👤 **Crew Selection**: Choose which crew member to view
- 🎯 **Project Filter**: Focus on specific projects
- 📝 **Memory Type Filter**: View only certain memory types
- 📊 **Statistics**: Memory counts by type and project

**Main Area (Right)**:
- 🔍 **Search Bar**: Find memories by text or semantic meaning
- 🧠 **Semantic Toggle**: Switch between text and AI search
- 📋 **Memory Cards**: View individual memories
- 📈 **Summary**: Total count and filtering info

### Example: Find Worf's RLS Learnings

1. **Select crew**: Choose "worf" from dropdown
2. **View project**: Select "bayer-pctms" to focus on that project
3. **Filter type**: Select "📚 Lesson Learned" to see lessons only
4. **Search**: Type "RLS" to find security pattern memories
5. **View**: Read Worf's insights and apply to new projects

### Example: Use Semantic Search

1. **Enable semantic search**: Toggle 🧠 checkbox
2. **Ask a question**: "How do I implement multi-tenant isolation?"
3. **Hit search**: System finds semantically related memories
4. **Discover**: See Data's schema decisions, Worf's RLS patterns, etc.

---

## 🔗 USING THE API ROUTES

### Direct API Access

For custom applications or integrations:

### GET /api/crew/memories
Get all memories for a crew member

```bash
curl "http://localhost:3000/api/crew/memories?crew=worf&limit=20"
```

**Response**:
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
      "project_id": "bayer-pctms",
      "tags": ["rls", "security"],
      "created_at": "2026-06-07T14:30:00Z"
    }
  ]
}
```

### GET /api/crew/memories/search
Search memories by text

```bash
curl "http://localhost:3000/api/crew/memories/search?crew=worf&query=RLS&limit=10"
```

### GET /api/crew/memories/search-semantic
Semantic search with AI

```bash
curl "http://localhost:3000/api/crew/memories/search-semantic?crew=data&query=database%20schema%20design&limit=10"
```

### GET /api/crew/memories/project
Get memories for a specific project

```bash
curl "http://localhost:3000/api/crew/memories/project?crew=geordi&project=pharma-trials&limit=20"
```

### GET /api/crew/memories/stats
Get memory statistics

```bash
curl "http://localhost:3000/api/crew/memories/stats?crew=worf"
```

---

## 🧪 RUNNING THE INTEGRATION TESTS

### Run All Tests

```bash
npm run test:integration
```

### Run Crew Memory Tests Only

```bash
npm run test -- crew-memory-integration
```

### Run with Coverage

```bash
npm run test -- --coverage crew-memory-integration
```

### Expected Test Output

```
PASS  packages/shared/test/crew-memory-integration.test.ts
  Multi-Project Crew Memory Integration Tests
    Project A: Initial Learning Phase
      ✓ should allow Worf to store RLS security insights
      ✓ should allow Data to store schema design decisions
      ✓ should allow Geordi to store performance baselines
      ✓ should retrieve all Project A memories
    Project B: Knowledge Transfer Phase
      ✓ should retrieve Worf's RLS learnings from Project A
      ✓ should find related Data expertise
      ✓ should apply indexing strategy to Project B
      ✓ should maintain complete data isolation
    ... (40+ tests total)

Test Suites: 1 passed, 1 total
Tests:       40 passed, 40 total
```

---

## 📚 TYPICAL WORKFLOW

### Day 1: Working on Task

Crew member executes a task and discovers something valuable:

```typescript
// After implementing RLS successfully
await callMcpTool('crew:store-memory', {
  crew_id: 'worf',
  memory_type: 'lesson_learned',
  title: 'RLS Works Best With Composite Keys',
  content: 'Put org_id as first column for better performance...',
  project_id: current_project_id,
  tags: ['rls', 'performance'],
});
```

### Day 2: Starting New Project

New crew member assigned to similar task:

```typescript
// Search for related memories
const rls_insights = await callMcpTool('crew:search-memories', {
  crew_id: 'worf',
  query: 'RLS pattern composite key',
});

// Result: Finds memory from yesterday!
// Saves 2 weeks of learning
```

### Day 3: Comparing Approaches

Manager uses dashboard to compare crew expertise:

1. Go to `/crew/memories`
2. Select "worf"
3. Filter by project A and project B
4. See how learnings transferred

---

## 💡 PRACTICAL EXAMPLES

### Example 1: Knowledge Transfer Between Projects

**Scenario**: Same schema pattern on new project

```typescript
// Worf stores Bayer pattern
await store({
  crew_id: 'worf',
  memory_type: 'lesson_learned',
  title: 'Bayer RLS Pattern',
  content: '...',
  project_id: 'bayer-pctms',
  tags: ['rls', 'multi-tenant'],
});

// Later on new Pharma project
const patterns = await search({
  crew_id: 'worf',
  query: 'multi-tenant RLS implementation',
});
// Result: Find Bayer pattern!
// Apply to Pharma immediately
```

### Example 2: Crew Collaboration

**Scenario**: Multiple crew members working together

```typescript
// Worf stores insight
await store({
  crew_id: 'worf',
  memory_type: 'insight',
  title: 'RLS Audit Requirements',
  content: '...',
  relates_to_crew: ['data', 'crusher'],  // Reference others
  tags: ['security', 'audit'],
});

// Data references Worf's learning
const related = await search({
  crew_id: 'data',
  query: 'RLS and audit trails',
});
```

### Example 3: Project Retrospective

**Scenario**: Review what was learned on a project

```bash
# Use dashboard to view project retrospective
# Navigate to: /crew/memories?project=bayer-pctms

# See all memories from that project
# Understand what each crew member learned
# Plan training for similar future projects
```

---

## ⚙️ ADVANCED USAGE

### Semantic Search with Custom Threshold

Find memories with higher confidence (more similar):

```typescript
const matches = await callMcpTool('crew:search-memories-by-embedding', {
  crew_id: 'data',
  query: 'database indexing strategy',
  limit: 5,
  similarity_threshold: 0.85,  // Very similar only
});
```

### Store Memories with Rich Tags

Use consistent tags for better discovery:

```typescript
await store({
  crew_id: 'geordi',
  memory_type: 'insight',
  title: 'Index Performance Optimization',
  content: '...',
  tags: [
    'performance',      // Category
    'indexing',         // Technique
    'postgresql',       // Technology
    'optimization',     // Domain
    'time-series',      // Use case
  ],
});
```

### Track Crew Collaboration

Link memories to related crew members:

```typescript
await store({
  crew_id: 'crusher',
  memory_type: 'decision_note',
  title: 'Testing Strategy for Multi-Tenant Systems',
  content: '...',
  relates_to_crew: ['worf', 'yar', 'data'],  // Who else should know
  tags: ['testing', 'security', 'audit'],
});
```

---

## 🔒 PRIVACY & SECURITY

### Private Memories

Store memories only visible to the crew member:

```typescript
await store({
  crew_id: 'worf',
  memory_type: 'reminder',
  title: 'Personal Learning Goal',
  content: 'Work on Rust programming skills',
  is_private: true,  // Only Worf sees this
});
```

### Data Isolation

Each project's memories are completely isolated:

```typescript
// Memories from project-a are NEVER visible on project-b
const project_a = await getProjectMemories('worf', 'project-a');
const project_b = await getProjectMemories('worf', 'project-b');
// project_a and project_b are completely separate
```

---

## 📊 MONITORING CREW GROWTH

### Track Expertise Over Time

```typescript
// Get stats for Worf
const stats = await getMemoryStats('worf');

// Output shows:
// - Total memories: 47
// - Lesson learned: 15
// - Insights: 12
// - Decision notes: 8
// - Reminders: 12
// - Projects covered: 4
// - Most recent: Today

// Each project adds to expertise!
```

### Compare Crew Members

Use dashboard to compare expertise:

1. View Worf's memories
2. Compare with Data's memories
3. Identify specialization areas
4. Plan team assignments accordingly

---

## ✅ SUCCESS CHECKLIST

After implementing today:

- [ ] **MCP Tools Working**: Test storing a memory
- [ ] **UI Dashboard Accessible**: Visit `/crew/memories`
- [ ] **API Routes Responding**: Test `/api/crew/memories`
- [ ] **Tests Passing**: Run integration test suite
- [ ] **Knowledge Transferring**: See memories from past projects
- [ ] **Search Working**: Find memories via text and semantic search
- [ ] **Crew Growing**: Watch expertise accumulate

---

## 🎯 QUICK COMMANDS

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

---

## 📞 TROUBLESHOOTING

### "No memories found"
- Check crew name is spelled correctly
- Verify memories were stored (check database)
- Try broader search query

### "Semantic search returns wrong results"
- Increase `similarity_threshold` (0.7 → 0.85)
- Try different query wording
- Check if embeddings are generated

### "Data isolation not working"
- Verify Supabase RLS policies enabled
- Check org_id is set correctly
- Review RLS policy logs

---

## 📚 Learn More

- [CREW_MANIFEST.md](CREW_MANIFEST.md) — All crew members
- [CREW_PERSONAL_MEMORIES_GUIDE.md](CREW_PERSONAL_MEMORIES_GUIDE.md) — Detailed guide
- [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) — What was built

---

**Ready to use the crew memory system! 🚀**

Start by visiting `/crew/memories` or testing the MCP tools.

