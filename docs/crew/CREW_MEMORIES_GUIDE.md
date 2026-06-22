# Crew Baseline Memories Guide

## Overview

Crew baseline memories are persistent, institutional knowledge for all 11 crew members stored in Supabase. During missions, crew agents can reference and build upon these foundational principles.

## Quick Start

### Prerequisites
- ✅ Supabase RPC function created (`public.execute_migration()`)
- ✅ All 7 migrations executed (creates sa_observation_memories table)
- ✅ Environment: `source ~/.zshrc`

### 1-Minute Setup

```bash
# From project root
npm run crew:seed-memories
```

Expected output:
```
╔════════════════════════════════════════════════════════╗
║      Seeding Crew Baseline Memories → Supabase        ║
╚════════════════════════════════════════════════════════╝

📍 Project: https://rpkkkbufdwxmjaerbhbn.supabase.co
📊 Crew members: 11

▶️  Seeding PICARD: Captain & Strategic Command
✅ Memory seeded (ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
▶️  Seeding DATA: Architecture & Systems
✅ Memory seeded (ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
... (9 more crew members)

═══════════════════════════════════════════════════════
✅ Seeding complete: 11 succeeded, 0 failed
```

## What Gets Seeded

### The 11 Crew Members

| Crew ID | Role | Focus Area |
|---------|------|-----------|
| picard | Captain & Strategic Command | Strategic decisions, deliberation, institutional knowledge |
| data | Architecture & Systems | Type systems, domain boundaries, consistency |
| riker | Execution & Delegation | Practical implementation, team coordination |
| geordi | Performance & Optimization | System tuning, resource efficiency, bottleneck removal |
| obrien | Operations & Reliability | Uptime, continuous improvement, operational excellence |
| worf | Security & Defense | Threat modeling, perimeter security, credential management |
| troi | Stakeholder Communication | Empathy-driven messaging, trust building, clarity |
| crusher | Testing & Scientific Method | Empirical validation, risk assessment, coverage |
| uhura | Communication & Documentation | Clarity, accessibility, knowledge transfer |
| quark | Financial Optimization | Cost management, token efficiency, ROI |
| yar | QA & Risk Detection | Coverage, edge cases, failure scenarios |

Each crew member has a comprehensive baseline covering:
- **Role summary** - What they do and why it matters
- **Core principles** - Fundamental beliefs guiding decisions
- **Best practices** - How they approach their work
- **Lessons learned** - Wisdom gained from experience
- **Integration points** - How they work with other crew

### Example: Worf's Baseline

```
Role: Security & Defense

Key Principles:
- Defense-in-depth: Multiple layers, no single point of failure
- Threat modeling: Anticipate attacks, assume bad intent
- WorfGate: Credential segregation enforced at every layer
- Fail secure: When in doubt, deny access and escalate

Framework:
1. Perimeter security - What gets in/out?
2. Identity verification - Who are you? Can you prove it?
3. Authorization checks - What are you allowed to do?
4. Audit trail - Can we prove you did this? For liability?

Integration Examples:
- Validates Data's architecture for security flaws
- Reviews Riker's deployment plans for vulnerability exposure
- Questions O'Brien about monitoring coverage gaps
- Recommends Picard on risk acceptance thresholds
```

## How Crew Uses These Memories

### During Mission Analysis

When a crew member is analyzing a story, they can:

1. **Reference their own baseline**
   ```typescript
   // In Worf's security analysis tool
   const baselineMemory = await getCrewBaselineMemory('worf');
   const context = `Security framework: ${baselineMemory.content}`;
   // Include in LLM prompt for consistent security recommendations
   ```

2. **Search for relevant expertise**
   ```typescript
   // During architectural review
   const relevantMemories = await getRelevantObservationMemories({
     queryText: "type system consistency and domain boundaries",
     clientId: storyClientId,
     limit: 5
   });
   // Returns Data's baseline first (highest semantic match)
   ```

3. **Build upon their memories**
   ```typescript
   // After completing analysis, crew can add new insights
   const updatedMemory = `${baselineMemory.content}\n\n---\nNew Learning: [What we learned in this mission]`;
   await storeObservationMemory(sql, {
     storyId: `crew-extension-${storyId}`,
     crewId: 'worf',
     content: updatedMemory,
     // ...
   });
   ```

### In Mission Debriefs

When a mission completes, crew can:
1. Review what they learned
2. Update their baseline memories with new insights
3. Share learnings across the crew via observation_memories

## Data Structure

### Supabase Table: sa_observation_memories

```sql
-- Crew baseline memories look like this:
id: "550e8400-e29b-41d4-a716-446655440000"
story_id: "crew-baseline-worf"
crew_id: "worf"
client_id: NULL  -- Global scope, all clients see this
content: "[Multi-paragraph baseline knowledge...]"
transcript: "[Full baseline knowledge...]"
summary: "Security & Defense baseline knowledge and principles"
tags: ["baseline", "crew-knowledge", "worf"]
embedding: [0.123, -0.456, 0.789, ...]  -- pgvector for semantic search
created_at: "2025-01-15T10:30:00Z"
updated_at: "2025-01-15T10:30:00Z"
```

## Verification Steps

### Step 1: Check in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/rpkkkbufdwxmjaerbhbn/editor
2. Click **sa_observation_memories** table
3. Filter: `story_id LIKE "crew-baseline-%"`
4. Expected: 11 rows (one per crew member)

### Step 2: Verify via SQL

```bash
# From project root
source ~/.zshrc
curl -s -X GET "https://rpkkkbufdwxmjaerbhbn.supabase.co/rest/v1/observation_memories?story_id=like.crew-baseline-%&select=id,story_id,crew_id,summary" \
  -H "apikey: $SUPABASE_KEY" | jq '.[] | {story_id, crew_id, summary}'
```

Expected output:
```json
{
  "story_id": "crew-baseline-picard",
  "crew_id": "picard",
  "summary": "Captain & Strategic Command baseline knowledge and principles"
}
... (11 total)
```

### Step 3: Test Retrieval in Node.js

```javascript
// scripts/test-crew-memories.mjs
import { getCrewBaselineMemory, getAllCrewBaselineMemories } from '@story-agent/shared';

// Test single crew member
const worfMemory = await getCrewBaselineMemory('worf');
console.log('Worf baseline:', worfMemory?.summary);

// Test all crew memories
const allMemories = await getAllCrewBaselineMemories();
console.log(`Loaded ${allMemories.size} crew baseline memories`);

// List by crew ID
for (const [crewId, memory] of allMemories) {
  console.log(`${crewId}: ${memory.summary}`);
}
```

Run:
```bash
node scripts/test-crew-memories.mjs
```

## Troubleshooting

### "Connection refused" or "Invalid API key"

**Cause:** Corporate network blockage or credentials not loaded
**Fix:**
```bash
source ~/.zshrc  # Reload credentials
echo $SUPABASE_KEY  # Verify key is set
npm run crew:seed-memories
```

### "table sa_observation_memories does not exist"

**Cause:** Migrations not yet executed
**Fix:**
```bash
# Create RPC function first
npm run db:migrate  # Shows bootstrap SQL
# Paste SQL into: https://supabase.com/dashboard/project/rpkkkbufdwxmjaerbhbn/sql/new
# Then run migrations again
npm run db:migrate
```

### "crew-baseline-worf already exists"

**Cause:** Memories already seeded
**Fix:** This is normal. Run again to update with any new content. Supabase will upsert if the insert fails (check script for upsert logic).

### "0 crew members seeded"

**Cause:** crew-baseline-memories.ts not properly compiled
**Fix:**
```bash
# Rebuild MCP server
pnpm --filter @story-agent/mcp-server build
# Then try seeding again
npm run crew:seed-memories
```

## Integration Examples

### Example 1: Worf Evaluating a Security Change

```typescript
// In crew-member-tools.ts: security-review tool
export async function performSecurityReview(storyId: string) {
  // Get Worf's baseline for context
  const worfBaseline = await getCrewBaselineMemory('worf');
  
  const prompt = `
    You are Worf, Chief Security Officer.
    
    Your baseline principles:
    ${worfBaseline.content}
    
    Now analyze this story for security vulnerabilities:
    ${storyContent}
    
    Use your principles to guide your assessment.
  `;
  
  const assessment = await callLLM(prompt);
  return {
    crewId: 'worf',
    findings: assessment,
    citations: [`Baseline: ${worfBaseline.id}`]
  };
}
```

### Example 2: Data Architecture Consistency Check

```typescript
// In crew-member-tools.ts: architecture-review tool
export async function reviewArchitecture(storyId: string) {
  // Get Data's baseline for type system principles
  const dataBaseline = await getCrewBaselineMemory('data');
  
  // Search for related architectural decisions
  const relatedMemories = await getRelevantObservationMemories({
    queryText: "type system consistency domain boundaries versioning",
    storyId: storyId,
    clientId: null,
    limit: 3
  });
  
  const context = [
    `Primary Framework: ${dataBaseline.content}`,
    `Related Decisions: ${relatedMemories.map(m => m.summary).join('\n')}`
  ].join('\n\n');
  
  const review = await callLLM(`${context}\n\nArchitecture to review: ${code}`);
  return review;
}
```

### Example 3: Crew Learning from Missions

```typescript
// After mission completes, crew can extend their memories
export async function captureMissionLearning(
  missionId: string,
  crewId: string,
  learnings: string
) {
  const baseline = await getCrewBaselineMemory(crewId);
  
  // Create extension memory with new learnings
  await storeObservationMemory(sql, {
    storyId: `crew-mission-${missionId}`,
    crewId: crewId,
    content: learnings,
    summary: `Mission ${missionId} - new ${crewId} learnings`,
    clientId: null, // Global scope
    tags: ['mission-learning', crewId, missionId]
  });
  
  // Log what was learned
  console.log(`${crewId} captured mission learning: ${learnings.substring(0, 100)}...`);
}
```

## Next Steps

### For Developers
1. ✅ Run `npm run crew:seed-memories` to populate Supabase
2. Import baseline memory functions in MCP tools
3. Use `getCrewBaselineMemory()` to load crew context in LLM prompts
4. Call `getRelevantObservationMemories()` for semantic search

### For Mission Execution
1. At mission start, load all baseline memories via `getAllCrewBaselineMemories()`
2. Pass crew baseline context to each crew member's analysis tools
3. Capture new learnings after mission in extension memories
4. Crew references their own principles consistently across missions

### For Crew Learning
1. Each crew member extends their memory with new insights
2. Vector embeddings enable discovery of related learnings
3. Over time, crew becomes more effective as memories accumulate
4. Debriefs can surface the most impactful learnings

## FAQ

**Q: Can crew members modify their baseline memories?**
A: Yes, they can create extension memories with new learnings. The original baseline is immutable (for audit trail).

**Q: Are baseline memories isolated by client?**
A: No, they're global (client_id = NULL). All clients see the same crew principles.

**Q: What if a baseline memory is incorrect?**
A: Create a new version in crew-baseline-memories.ts, rebuild, and re-seed. Or manually delete and re-seed via Supabase.

**Q: How do crew members access their memories?**
A: Via `getCrewBaselineMemory(crewId)` in TypeScript code, or via REST API if accessed from outside Node.js.

**Q: Can I search across all crew memories?**
A: Yes, use `getRelevantObservationMemories()` with a query that matches across crew memories.

## Files Reference

| File | Purpose |
|------|---------|
| `packages/mcp-server/src/lib/crew-baseline-memories.ts` | Baseline knowledge for all 11 crew |
| `scripts/seed-crew-memories.mjs` | Seeding script (REST API) |
| `packages/shared/src/db.ts` | Database access functions |
| `SUPABASE_SETUP.md` | Supabase setup guide (includes crew memories) |

## See Also

- [Supabase Setup Guide](SUPABASE_SETUP.md) — Full database setup
- [MCP Server Tools](packages/mcp-server/src/tools/) — How crew tools work
- [Crew Baseline Memories](packages/mcp-server/src/lib/crew-baseline-memories.ts) — The actual baseline knowledge
