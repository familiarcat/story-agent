# Phase 1 Implementation Guide: Metrics Collection

**Status:** Ready to Execute  
**Timeline:** 2 weeks (2026-07-17 to 2026-07-30)  
**Owner:** Data (Aha integration), Quark (Cost ledger), Geordi (Architecture)

---

## Phase 1 Goal

Establish velocity tracking infrastructure + collect 2 weeks of baseline data = first manual velocity report.

---

## Week 1: Setup & Integration

### Day 1-2: Schema Deployment

**Owner:** Quark  
**Effort:** 1-2 hours

```bash
# 1. Review Supabase migration
cat supabase/migrations/20260716000000_velocity_tracking_system.sql

# 2. Apply migration
supabase db push

# 3. Verify tables created
# Check Supabase dashboard: should see 9 new tables under `sa_velocity_*`

# 4. Create indexes (should be automatic)
supabase db inspect  # Confirm indexes exist
```

**Acceptance:**
- [ ] All 9 tables exist in Supabase
- [ ] All indexes created
- [ ] No foreign key conflicts

---

### Day 2-3: Aha Scraper Implementation

**Owner:** Data  
**Effort:** 3-4 hours  
**File:** `scripts/velocity-scraper-aha.ts` (new)

```typescript
/**
 * Aha Story Scraper
 * Fetches completed stories from last 2 hours
 */

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import * as sdk from '@aha-app/sdk';

interface AhaStoryMetrics {
  storyId: string; // PROD-30
  storyName: string;
  storyPoints: number;
  featureType: string;
  assignedCrewMember: string;
  createdDate: Date;
  startedDate?: Date;
  completedDate?: Date;
  cycleTime?: number; // Hours
  blockers: string[];
  dependencies: string[];
}

async function scrapeAhaStories(releaseId: string): Promise<AhaStoryMetrics[]> {
  const client = sdk.createClient({
    domain: process.env.AHA_DOMAIN!,
    apiKey: process.env.AHA_API_KEY!,
  });

  // 1. Fetch completed stories in last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  
  const stories = await client.request({
    method: 'GET',
    path: `/api/v1/releases/${releaseId}/features`,
    query: {
      statuses: 'Complete,Shipped',
      updated_since: twoHoursAgo,
      limit: 100,
    },
  });

  // 2. Transform to metrics
  return stories.features.map((story: any) => ({
    storyId: story.reference_num,
    storyName: story.name,
    storyPoints: story.estimate || 0,
    featureType: extractFeatureType(story.tags),
    assignedCrewMember: extractCrewMember(story.assigned_to_user),
    createdDate: new Date(story.created_at),
    startedDate: story.custom_fields?.start_date ? new Date(story.custom_fields.start_date) : undefined,
    completedDate: new Date(story.completed_at),
    cycleTime: calculateCycleTime(story.custom_fields?.start_date, story.completed_at),
    blockers: extractBlockers(story.comments),
    dependencies: extractDependencies(story.comments),
  }));
}

function extractFeatureType(tags: string[]): string {
  const typeMap: Record<string, string> = {
    'infra': 'infrastructure',
    'supabase': 'infrastructure',
    'github-actions': 'infrastructure',
    'mcp-tool': 'logic',
    'state-machine': 'logic',
    'ui-component': 'ui',
    'lcars': 'ui',
    'dashboard': 'ui',
    'worfgate': 'security',
    'audit': 'security',
    'governance': 'security',
    'qa': 'testing',
    'test-automation': 'testing',
  };

  for (const tag of tags || []) {
    if (typeMap[tag.toLowerCase()]) return typeMap[tag.toLowerCase()];
  }
  return 'logic'; // default
}

function extractCrewMember(assignedToUser: any): string {
  if (!assignedToUser) return 'unknown';
  // Map Aha user IDs to crew member IDs
  const crewMap: Record<string, string> = {
    'picard-id': 'picard',
    'riker-id': 'riker',
    'data-id': 'data',
    // ... populate with real Aha user IDs
  };
  return crewMap[assignedToUser.id] || 'unknown';
}

function calculateCycleTime(startDate: string | undefined, completedDate: string): number {
  if (!startDate) return 0;
  const diff = new Date(completedDate).getTime() - new Date(startDate).getTime();
  return diff / (1000 * 60 * 60); // Hours
}

function extractBlockers(comments: string[]): string[] {
  const blockerPattern = /blocked by|waiting on|stuck on|needs (.+)/i;
  return (comments || [])
    .filter(c => blockerPattern.test(c))
    .map(c => c.substring(0, 100));
}

function extractDependencies(comments: string[]): string[] {
  const depPattern = /depends on|dependency:/i;
  return (comments || [])
    .filter(c => depPattern.test(c))
    .map(c => c.substring(0, 100));
}

// Export for testing
export { scrapeAhaStories, AhaStoryMetrics };
```

**Testing:**
```bash
# Run manually
npx tsx scripts/velocity-scraper-aha.ts

# Check output: should show stories completed in last 2 hours
# If no stories, check Aha release ID and time filter
```

**Acceptance:**
- [ ] Script fetches completed stories from Aha
- [ ] Cycle times calculated correctly
- [ ] Feature types detected
- [ ] No Aha API errors

---

### Day 3-4: Supabase Execution Scraper

**Owner:** Quark  
**Effort:** 2-3 hours  
**File:** `scripts/velocity-scraper-execution.ts` (new)

```typescript
/**
 * Supabase Execution Scraper
 * Reads crew execution logs for blockers + duration
 */

import { createClient } from '@supabase/supabase-js';

interface CrewExecutionMetrics {
  missionId: string;
  crewMemberId: string;
  storyId?: string;
  startedAt: Date;
  completedAt?: Date;
  durationSeconds: number;
  findings: string;
  blockers: string[];
  toolsUsed: string[];
  modelUsed: string;
  tokenCount: number;
}

async function scrapeCrewExecution(): Promise<CrewExecutionMetrics[]> {
  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );

  // Query execution results from last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('sa_crew_execution_results')
    .select('*')
    .gte('completed_at', twoHoursAgo);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    missionId: row.id,
    crewMemberId: row.crew_member_id,
    storyId: row.story_id || undefined,
    startedAt: new Date(row.started_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    durationSeconds: row.duration_seconds,
    findings: row.findings || '',
    blockers: parseBlockers(row.findings),
    toolsUsed: row.tools_used || [],
    modelUsed: row.model_used || 'unknown',
    tokenCount: row.token_count || 0,
  }));
}

function parseBlockers(findings: string): string[] {
  if (!findings) return [];
  const blockerKeywords = ['blocked', 'waiting', 'stuck', 'unable to', 'need'];
  const sentences = findings.split(/[.!?]/);
  return sentences
    .filter(s => blockerKeywords.some(kw => s.toLowerCase().includes(kw)))
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export { scrapeCrewExecution, CrewExecutionMetrics };
```

**Testing:**
```bash
npx tsx scripts/velocity-scraper-execution.ts
# Should return crew execution records from last 2 hours
```

**Acceptance:**
- [ ] Reads from `sa_crew_execution_results` table
- [ ] Parses blockers from findings
- [ ] No Supabase errors

---

### Day 4-5: Cost Ledger Scraper

**Owner:** Quark  
**Effort:** 2 hours  
**File:** `scripts/velocity-scraper-cost.ts` (new)

```typescript
/**
 * Cost Ledger Scraper
 * Maps tokens → crew hours (complexity proxy)
 */

import { createClient } from '@supabase/supabase-js';

interface CrewHoursMetrics {
  crewMemberId: string;
  totalCostUSD: number;
  totalTokens: number;
  estimatedHours: number;
  costPerHour: number;
  modelsUsed: string[];
}

async function scrapeCrewCost(): Promise<CrewHoursMetrics[]> {
  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // Query cost ledger, aggregate by crew member
  const { data, error } = await db
    .from('sa_cost_ledger')
    .select('crew_member_id, model_used, total_cost_usd, total_tokens')
    .gte('created_at', twoHoursAgo);

  if (error) throw error;

  // Aggregate by crew member
  const crewMap = new Map<string, any>();

  for (const row of data || []) {
    if (!crewMap.has(row.crew_member_id)) {
      crewMap.set(row.crew_member_id, {
        crewMemberId: row.crew_member_id,
        totalCostUSD: 0,
        totalTokens: 0,
        modelsUsed: new Set<string>(),
      });
    }
    const crew = crewMap.get(row.crew_member_id);
    crew.totalCostUSD += row.total_cost_usd || 0;
    crew.totalTokens += row.total_tokens || 0;
    crew.modelsUsed.add(row.model_used);
  }

  // Convert to metrics
  const TOKEN_PER_HOUR = 150000; // Heuristic
  return Array.from(crewMap.values()).map((crew: any) => ({
    crewMemberId: crew.crewMemberId,
    totalCostUSD: crew.totalCostUSD,
    totalTokens: crew.totalTokens,
    estimatedHours: crew.totalTokens / TOKEN_PER_HOUR,
    costPerHour: crew.totalCostUSD / Math.max(crew.totalTokens / TOKEN_PER_HOUR, 0.1),
    modelsUsed: Array.from(crew.modelsUsed),
  }));
}

export { scrapeCrewCost, CrewHoursMetrics };
```

**Acceptance:**
- [ ] Queries cost ledger
- [ ] Tokens → hours conversion correct
- [ ] Aggregates by crew member

---

### Day 5: RAG Memory Scraper

**Owner:** Geordi  
**Effort:** 2 hours  
**File:** `scripts/velocity-scraper-rag.ts` (new)

```typescript
/**
 * RAG Memory Scraper
 * Fetches crew observations about velocity + blockers
 */

interface RagVelocityObservation {
  observationId: string;
  crewMemberId: string;
  topic: 'velocity' | 'risk' | 'dependency' | 'quality';
  content: string;
  tags: string[];
  relatedStories: string[];
}

async function scrapeRagMemories(): Promise<RagVelocityObservation[]> {
  // Query RAG for velocity-related observations
  const observations = await rag.search({
    query: 'velocity underestimate blocker cycle time',
    tags: ['velocity', 'risk', 'lesson-learned'],
    lookbackDays: 30,
    limit: 100,
  });

  return observations.map((obs: any) => ({
    observationId: obs.id,
    crewMemberId: obs.author_crew_member_id || 'unknown',
    topic: categorizeObservation(obs.content),
    content: obs.content,
    tags: obs.tags || [],
    relatedStories: extractStoryReferences(obs.content),
  }));
}

function categorizeObservation(content: string): 'velocity' | 'risk' | 'dependency' | 'quality' {
  const lower = content.toLowerCase();
  if (lower.includes('blocker') || lower.includes('waiting')) return 'risk';
  if (lower.includes('depends') || lower.includes('dependency')) return 'dependency';
  if (lower.includes('rework') || lower.includes('defect')) return 'quality';
  return 'velocity';
}

function extractStoryReferences(content: string): string[] {
  const matches = content.match(/PROD-\d+/g);
  return matches || [];
}

export { scrapeRagMemories, RagVelocityObservation };
```

**Acceptance:**
- [ ] Queries RAG successfully
- [ ] Returns observations with tags
- [ ] Story references extracted

---

## Week 2: Aggregation & First Report

### Day 8-9: Aggregation Logic

**Owner:** Data + Quark  
**Effort:** 3 hours  
**File:** `scripts/velocity-aggregator.ts` (new)

```typescript
/**
 * Aggregates all scraped metrics into VelocitySnapshot
 */

import {
  AggregatedMetrics,
  FEATURE_TYPE_BASELINES,
  calculateVariance,
  calculateMedian,
} from '@story-agent/shared/velocity-metrics';

async function aggregateMetrics(
  ahaMetrics: AhaStoryMetrics[],
  executionMetrics: CrewExecutionMetrics[],
  costMetrics: CrewHoursMetrics[],
  ragObservations: RagVelocityObservation[]
): Promise<AggregatedMetrics> {
  
  // 1. Crew velocity
  const crewVelocities = aggregateCrewVelocity(ahaMetrics, executionMetrics);
  
  // 2. Feature type velocities
  const featureVelocities = aggregateFeatureVelocities(ahaMetrics, crewVelocities);
  
  // 3. Sprint summary
  const sprintVelocity = aggregateSprintVelocity(ahaMetrics, ragObservations);
  
  // 4. Forecast (using updated velocities)
  const forecastSprint = calculateSprintForecast(sprintVelocity, crewVelocities, featureVelocities);
  
  return {
    crewMemberVelocities: crewVelocities,
    featureTypeVelocities: featureVelocities,
    sprintVelocity,
    forecastSprint,
  };
}

function aggregateCrewVelocity(
  ahaMetrics: AhaStoryMetrics[],
  executionMetrics: CrewExecutionMetrics[]
): CrewMemberVelocityProfile[] {
  
  const crewMap = new Map<string, any>();

  // From Aha stories
  for (const story of ahaMetrics) {
    if (!crewMap.has(story.assignedCrewMember)) {
      crewMap.set(story.assignedCrewMember, {
        storyPoints: 0,
        cycleTimes: [],
        completed: 0,
        total: 0,
        blockedHours: 0,
        totalWorkHours: 0,
      });
    }
    const crew = crewMap.get(story.assignedCrewMember);
    crew.storyPoints += story.storyPoints;
    if (story.cycleTime) crew.cycleTimes.push(story.cycleTime);
    crew.completed++;
    crew.total++;
    crew.blockedHours += story.blockers.length * 2; // Heuristic
  }

  // From execution metrics
  for (const exec of executionMetrics) {
    if (!crewMap.has(exec.crewMemberId)) {
      crewMap.set(exec.crewMemberId, {
        storyPoints: 0,
        cycleTimes: [],
        completed: 0,
        total: 0,
        blockedHours: 0,
        totalWorkHours: 0,
      });
    }
    const crew = crewMap.get(exec.crewMemberId);
    crew.totalWorkHours += exec.durationSeconds / 3600;
    if (exec.blockers.length > 0) {
      crew.blockedHours += (exec.durationSeconds / 3600) * 0.3; // 30% if blockers noted
    }
  }

  // Convert to profiles
  return Array.from(crewMap.entries()).map(([crewId, data]) => ({
    crewMemberId: crewId,
    storyPointsPerHour: data.storyPoints / Math.max(data.totalWorkHours, 0.1),
    averageCycleTimeHours: data.cycleTimes.length > 0
      ? data.cycleTimes.reduce((a: number, b: number) => a + b) / data.cycleTimes.length
      : 0,
    completionRate: data.completed / Math.max(data.total, 1),
    blockedHours: data.blockedHours,
    contextSwitchOverhead: 0.1, // Placeholder
    reworkRate: 0.05, // Placeholder
    velocityTrend: 'stable',
    burnoutIndicator: Math.min(data.blockedHours / data.totalWorkHours, 1),
    totalSprintAssignments: data.total,
    completedThisSprint: data.completed,
    preferredFeatureTypes: [],
    lastUpdated: new Date(),
  }));
}

// ... similar for other aggregations
```

**Testing:**
```bash
npx tsx scripts/velocity-aggregator.ts
# Should produce valid AggregatedMetrics JSON
```

---

### Day 9-10: Scraper Orchestration

**Owner:** Riker  
**Effort:** 2 hours  
**File:** `scripts/velocity-scraper.ts` (main entry point)

```bash
#!/bin/bash
# scripts/velocity-scraper.sh

# Run all scrapers, aggregate, store to DB + JSON report

set -e

echo "🚀 Starting velocity scraper..."

# 1. Scrape all sources
echo "📍 Fetching Aha stories..."
AHA_METRICS=$(npx tsx scripts/velocity-scraper-aha.ts)

echo "📍 Fetching crew execution..."
EXEC_METRICS=$(npx tsx scripts/velocity-scraper-execution.ts)

echo "📍 Fetching cost ledger..."
COST_METRICS=$(npx tsx scripts/velocity-scraper-cost.ts)

echo "📍 Fetching RAG memories..."
RAG_OBSERVATIONS=$(npx tsx scripts/velocity-scraper-rag.ts)

# 2. Aggregate
echo "🔄 Aggregating metrics..."
AGGREGATED=$(npx tsx scripts/velocity-aggregator.ts)

# 3. Store to Supabase
echo "💾 Storing to Supabase..."
npx tsx scripts/velocity-store.ts "$AGGREGATED"

# 4. Generate report
echo "📊 Generating report..."
REPORT_FILE="velocity-reports/report-$(date +%Y%m%d-%H%M%S).json"
mkdir -p velocity-reports
echo "$AGGREGATED" > "$REPORT_FILE"

echo "✅ Scraper complete! Report: $REPORT_FILE"
```

**Testing:**
```bash
bash scripts/velocity-scraper.sh

# Check output
cat velocity-reports/report-latest.json
```

**Acceptance:**
- [ ] All scrapers run without error
- [ ] Aggregated metrics valid
- [ ] Report saved to JSON file

---

### Day 10: Manual Report (2-Week Baseline)

**Owner:** Geordi  
**Effort:** 1 hour  
**Output:** `velocity-reports/BASELINE-2026-07-30.md`

```markdown
# Velocity Baseline Report — Sprint 1 (2026-07-17 to 2026-07-30)

**Report Date:** 2026-07-30  
**Data Collection Period:** 2 weeks  
**Scraper Runs:** 84 (every 2 hours)

## Executive Summary

- **Sprint Velocity:** [X] story points completed
- **Crew Capacity:** [Y] hours total work
- **Forecast Accuracy:** TBD (ramp-up phase)
- **Risk Level:** [GREEN|YELLOW|RED]

## Per-Crew Velocity

| Crew Member | SP/Hour | Cycle Time | Completed | On-Time Rate |
|---|---|---|---|---|
| Picard | 1.8 | 12h | 5 | 80% |
| Riker | 2.1 | 10h | 6 | 85% |
| Data | 1.9 | 11h | 5 | 75% |
| ... | ... | ... | ... | ... |

## Per-Feature-Type Velocity

| Type | SP/Hour | Cycle Time | Stories | Variance |
|---|---|---|---|---|
| Infrastructure | 2.3 | 8.5h | 8 | ±1.1h |
| Logic | 1.7 | 12.5h | 7 | ±1.6h |
| UI | 1.9 | 10.5h | 6 | ±1.4h |
| Security | 1.4 | 14h | 3 | ±1.7h |
| Testing | 2.2 | 9h | 4 | ±1.0h |

## Key Findings

1. **Infrastructure work** is faster than baseline (2.3 vs 2.5 pts/h)
2. **Security work** takes longer than baseline (1.4 vs 1.5 pts/h, but small sample)
3. **Top blockers:** [List top 3-5 blockers from RAG]
4. **Completion rate:** [X]% of assigned work completed on time

## Adjustments for Sprint 2

Based on 2-week baseline:

- Update infrastructure baseline to 2.3 pt/h (was 2.5)
- Watch security work (small sample, may normalize)
- Track [Crew member] for burnout signals (blocked_hours high)
- Expect [Feature type] to take [±X%] longer

## Next Steps

1. Review with crew in Observation Lounge
2. Adjust baselines for Sprint 2
3. Begin Phase 2 (cache + API)

---

**Report Generated By:** Velocity System Phase 1  
**Data Quality:** BASELINE (2 weeks sample, estimates may vary ±30%)
```

---

## Success Criteria (End of Phase 1)

- [ ] Supabase schema deployed + verified
- [ ] All 4 scrapers running successfully
- [ ] 14 days of baseline data collected (84 scraper runs)
- [ ] Aggregation logic producing valid metrics
- [ ] JSON reports generated successfully
- [ ] Baseline velocity report published
- [ ] Zero blockers from crew

---

## Transition to Phase 2

Once Phase 1 complete:

1. **Crew Review:** Observation Lounge validates baselines
2. **Admiral Approval:** Confirms forecast approach
3. **Phase 2 Kickoff:** Data + Quark + Riker start cache + API

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Aha API 429 (rate limit) | Add exponential backoff, batch queries |
| No stories found | Check Aha release ID, time filter, story status |
| Execution table empty | Verify `sa_crew_execution_results` has data |
| RAG search fails | Check RAG connection, tag names |
| Aggregation errors | Verify input types, check null handling |

---

## Running the Scraper

```bash
# Manual run (test)
bash scripts/velocity-scraper.sh

# Review output
cat velocity-reports/report-latest.json | jq .

# Check Supabase
supabase db inspect sa_velocity_snapshots
```

---

**Questions?** Message Geordi (architecture) or Data (Aha integration)
