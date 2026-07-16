# Velocity Tracking & Autonomous Estimation System

**Status:** Design Specification (Phase 0)  
**Last Updated:** 2026-07-16  
**Owner:** Geordi (Crew Design), Quark (Metrics/Cost), Data (State Machine)  
**Audience:** Crew + Admiral (tactical + strategic planning)

---

## Executive Summary

This system makes crew velocity **measurable, predictable, and self-optimizing** without friction to autonomous work:

- **Metrics Capture:** Per-crew, per-feature-type, and sprint-level velocity tracking
- **Real-Time Forecasting:** Story Agent estimates time-to-release based on current crew velocity (with confidence intervals)
- **Autonomous Optimization:** Auto-adjust estimates, flag underestimated work, recommend crew reallocation
- **RAG Integration:** Scrape lessons learned + blockers to improve estimation model
- **Cost Correlation:** Tie story point estimates to actual crew hours + cost (via cost ledger)

**Expected Outcome:** By Sprint 3, release forecast is within ±10% error, enabling the Admiral to make data-driven scope/timeline decisions.

---

## PART 1: Velocity Metrics Model

### 1.1 Per-Crew-Member Velocity

```typescript
/**
 * Crew member velocity profile
 * Tracks speed, quality, and blockers per crew member
 */
interface CrewMemberVelocityProfile {
  crewMemberId: string; // picard, riker, data, etc.
  
  // Speed Metrics (rolling 2-week average)
  storyPointsPerHour: number; // Completed SP / hours worked
  averageCycleTimeHours: number; // Median time from "started" to "complete"
  completionRate: number; // % of assigned stories hitting target date (0-1)
  
  // Quality & Constraints
  blockedHours: number; // Hours spent waiting on others (last 2 weeks)
  contextSwitchOverhead: number; // % of time lost to interruptions
  reworkRate: number; // % of completed work requiring rework
  
  // Trend Analysis
  velocityTrend: 'improving' | 'stable' | 'degrading'; // vs previous sprint
  burnoutIndicator: number; // 0-1, higher = higher risk of fatigue
  
  // Metadata
  totalSprintAssignments: number; // Stories assigned this sprint
  completedThisSprint: number; // Stories completed this sprint
  preferredFeatureTypes: string[]; // e.g., ['backend', 'mcp-tools']
  lastUpdated: Date;
}
```

### 1.2 Per-Feature-Type Velocity

```typescript
interface FeatureTypeVelocity {
  featureType: 'infrastructure' | 'logic' | 'ui' | 'security' | 'testing';
  
  // Baseline velocity for this feature type across all crew
  avgStoryPointsPerHour: number; // Category average
  avgCycleTimeHours: number;
  
  // Variance (how much does it vary between crew members?)
  variance: number; // Standard deviation of velocity
  slowestCycleTime: number; // 95th percentile (conservative estimate)
  
  // Complexity Profile
  complexityMultiplier: {
    low: number; // 0.8x baseline (simple stories are faster)
    medium: number; // 1.0x baseline (typical story)
    high: number; // 1.5x baseline (complex/risky stories)
  };
  
  // Historical Data
  storiesCompleted: number; // Sample size
  lastUpdated: Date;
}

// Baseline velocities (empirical from Story Agent baseline)
const FEATURE_TYPE_BASELINES: Record<string, FeatureTypeVelocity> = {
  infrastructure: {
    featureType: 'infrastructure',
    avgStoryPointsPerHour: 2.5, // Supabase, GitHub Actions, API
    avgCycleTimeHours: 8,
    variance: 1.2,
    slowestCycleTime: 16,
    complexityMultiplier: { low: 0.7, medium: 1.0, high: 1.8 },
    storiesCompleted: 0,
    lastUpdated: new Date(),
  },
  logic: {
    featureType: 'logic',
    avgStoryPointsPerHour: 1.8, // MCP tools, state machines, business logic
    avgCycleTimeHours: 12,
    variance: 1.5,
    slowestCycleTime: 20,
    complexityMultiplier: { low: 0.6, medium: 1.0, high: 2.0 },
    storiesCompleted: 0,
    lastUpdated: new Date(),
  },
  ui: {
    featureType: 'ui',
    avgStoryPointsPerHour: 2.0, // React, LCARS, dashboards
    avgCycleTimeHours: 10,
    variance: 1.3,
    slowestCycleTime: 18,
    complexityMultiplier: { low: 0.75, medium: 1.0, high: 1.7 },
    storiesCompleted: 0,
    lastUpdated: new Date(),
  },
  security: {
    featureType: 'security',
    avgStoryPointsPerHour: 1.5, // WorfGate, audit, governance
    avgCycleTimeHours: 14,
    variance: 1.6,
    slowestCycleTime: 24,
    complexityMultiplier: { low: 0.5, medium: 1.0, high: 2.2 },
    storiesCompleted: 0,
    lastUpdated: new Date(),
  },
  testing: {
    featureType: 'testing',
    avgStoryPointsPerHour: 2.2, // QA, test automation, coverage
    avgCycleTimeHours: 9,
    variance: 1.1,
    slowestCycleTime: 15,
    complexityMultiplier: { low: 0.8, medium: 1.0, high: 1.5 },
    storiesCompleted: 0,
    lastUpdated: new Date(),
  },
};
```

### 1.3 Sprint-Level Velocity

```typescript
interface SprintVelocity {
  sprintId: string; // PROD-R-8, etc.
  releaseId: string;
  
  // Completion metrics
  totalStoryPointsPlanned: number;
  totalStoryPointsCompleted: number;
  completionRate: number; // Completed / Planned
  
  // Trend
  previousSprintVelocity: number; // SP completed in prior sprint
  velocityTrend: number; // % change (positive = improving)
  
  // Cycle time
  avgCycleTime: number; // Hours to complete a story (sprint average)
  medianCycleTime: number; // More robust to outliers
  
  // Blockers & Risks
  identifiedBlockers: BlockerRecord[];
  riskScore: number; // 0-1 (higher = more risk)
  scope creepDelta: number; // +/- additional points added after sprint start
  
  // Quality
  reworkEstimate: number; // SP that will need rework
  defectRate: number; // % of completed work with defects
  
  metadata: {
    startDate: Date;
    endDate: Date;
    crewMembers: string[]; // Who participated
    lastUpdated: Date;
  };
}

interface BlockerRecord {
  blockerId: string;
  description: string; // "Waiting on Supabase migration", etc.
  affectedStories: string[]; // Story IDs blocked
  hoursBlocked: number;
  resolvedDate?: Date;
  root cause: string; // External dependency, design review, etc.
}
```

### 1.4 Predictive Metrics

```typescript
interface SprintForecast {
  sprintId: string;
  forecastAsOf: Date;
  
  // Current State
  currentVelocity: number; // Points/hour (rolling average)
  remainingStoryPoints: number; // Unfinished work
  
  // Time Estimates
  forecastHoursToCompletion: number;
  forecastCalendarDays: number; // At current crew capacity
  
  // Confidence Intervals
  estimate50: {
    hoursToCompletion: number;
    completionDate: Date;
    confidence: 50;
  };
  estimate80: {
    hoursToCompletion: number;
    completionDate: Date;
    confidence: 80;
  };
  estimate95: {
    hoursToCompletion: number;
    completionDate: Date;
    confidence: 95;
  };
  
  // Risk Assessment
  identifiedRisks: string[]; // ["UI work behind schedule", "Supabase migration blocked"]
  riskScore: number; // 0-1
  recommendedActions: string[]; // Crew reallocation, scope reduction, etc.
  
  // Meta
  baselineAssumptions: {
    crewCapacityHoursPerDay: number;
    workingDaysPerWeek: number;
    historicalVariance: number; // Used for confidence intervals
  };
}
```

---

## PART 2: RAG Scraping Strategy (Every 2 Hours)

### 2.1 Scraper Architecture

```typescript
/**
 * Velocity Scraper: Collects metrics from Aha, Supabase, cost ledger, RAG, git
 * Runs every 2 hours (or configurable interval) to aggregate latest metrics.
 */

interface VelocityScraperJob {
  jobId: string;
  runAt: Date;
  sources: ScraperSource[];
  aggregatedMetrics: AggregatedMetrics;
  metadata: {
    duration_ms: number;
    storiesProcessed: number;
    errorsEncountered: ErrorRecord[];
  };
}

interface ScraperSource {
  source: 'aha' | 'supabase_execution' | 'supabase_cost' | 'rag_memory' | 'github';
  status: 'pending' | 'success' | 'partial' | 'failed';
  recordsCollected: number;
  lastSync: Date;
}

interface AggregatedMetrics {
  crewMemberVelocities: CrewMemberVelocityProfile[];
  featureTypeVelocities: FeatureTypeVelocity[];
  sprintVelocity: SprintVelocity;
  forecastSprint: SprintForecast;
}
```

### 2.2 Data Collection Per Source

#### **2.2.1 From Aha (Story Status)**

```typescript
interface AhaStoryMetrics {
  storyId: string; // PROD-30
  storyName: string;
  storyPoints: number;
  featureType: string; // Tagged in Aha
  assignedCrewMember: string;
  
  // Timeline
  createdDate: Date;
  startedDate?: Date;
  completedDate?: Date;
  
  // Derived
  cycleTime?: number; // Hours from started → completed
  
  // Metadata
  blockers: string[]; // From Aha comments
  dependencies: string[]; // Story IDs this depends on
}

/**
 * Query: Fetch all stories with status "Complete" or "Shipped" in last 2 hours
 * 
 * Aha API:
 *   GET /releases/{releaseId}/features?status=Complete,Shipped&updated_since=2h ago
 *   Extract: id, name, estimate (story points), tags, assigned_to, start_date, completion_date
 *   
 * Fallback: Scrape comments for blockers ("blocked by PROD-XX", "waiting on migration")
 */

async function scrapeAhaStories(releaseId: string): Promise<AhaStoryMetrics[]> {
  // 1. Fetch completed stories in last 2 hours
  const completedStories = await ahaClient.getStories({
    releaseId,
    statuses: ['Complete', 'Shipped'],
    updatedSince: new Date(Date.now() - 2 * 60 * 60 * 1000),
  });

  return completedStories.map((story) => ({
    storyId: story.referenceNum,
    storyName: story.name,
    storyPoints: story.estimate || 0,
    featureType: extractFeatureType(story.tags),
    assignedCrewMember: extractCrewMember(story.customFields.assignedTo),
    createdDate: new Date(story.createdAt),
    startedDate: story.customFields.startDate ? new Date(story.customFields.startDate) : undefined,
    completedDate: new Date(story.completedAt),
    cycleTime: calculateCycleTime(story.customFields.startDate, story.completedAt),
    blockers: extractBlockers(story.comments),
    dependencies: extractDependencies(story.comments),
  }));
}

function extractFeatureType(tags: string[]): string {
  // Map Aha tags to feature type
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
  
  for (const tag of tags) {
    if (typeMap[tag]) return typeMap[tag];
  }
  return 'logic'; // default
}

function extractBlockers(comments: string[]): string[] {
  const blockerPattern = /blocked by|waiting on|stuck on|needs (.+)/i;
  return comments
    .filter(c => blockerPattern.test(c))
    .map(c => c.substring(0, 100)); // Truncate for storage
}

function calculateCycleTime(startDate: string | undefined, completedDate: string): number {
  if (!startDate) return 0;
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(completedDate).getTime();
  return (endMs - startMs) / (1000 * 60 * 60); // Hours
}
```

#### **2.2.2 From Supabase Execution State**

```typescript
/**
 * Query crew execution logs for task completion + blockers
 * Table: sa_crew_execution_results
 */

interface CrewExecutionMetrics {
  missionId: string;
  crewMemberId: string;
  storyId?: string; // If linked to Aha story
  
  // Time tracking
  startedAt: Date;
  completedAt?: Date;
  durationSeconds: number;
  
  // Quality & Findings
  findings: string; // Crew report on what they did
  blockers: string[]; // What got in the way
  escalations: string[]; // Needed human help?
  selfAssessedConfidence: number; // 0-1, crew's estimate of quality
  
  // Complexity Signal
  toolsUsed: string[]; // MCP tools invoked (complex = more tools)
  modelUsed: string; // "deepseek" = simple, "claude" = complex
  tokenCount: number; // Proxy for effort
}

async function scrapeCrewExecution(): Promise<CrewExecutionMetrics[]> {
  // Query execution results from last 2 hours
  const results = await db
    .from('sa_crew_execution_results')
    .select('*')
    .gte('completed_at', new Date(Date.now() - 2 * 60 * 60 * 1000));

  return results.map((row) => ({
    missionId: row.id,
    crewMemberId: row.crew_member_id,
    storyId: row.story_id || undefined,
    startedAt: new Date(row.started_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    durationSeconds: row.duration_seconds,
    findings: row.findings || '',
    blockers: parseBlockers(row.findings),
    escalations: row.escalations || [],
    selfAssessedConfidence: row.confidence || 0.8,
    toolsUsed: row.tools_used || [],
    modelUsed: row.model_used || 'unknown',
    tokenCount: row.token_count || 0,
  }));
}

function parseBlockers(findings: string): string[] {
  const blockerKeywords = ['blocked', 'waiting', 'stuck', 'unable to', 'need'];
  const sentences = findings.split(/[.!?]/);
  return sentences
    .filter(s => blockerKeywords.some(kw => s.toLowerCase().includes(kw)))
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
```

#### **2.2.3 From Cost Ledger (Crew Hours)**

```typescript
/**
 * Query cost ledger to derive crew hours worked
 * Table: sa_cost_ledger (shared with ai-enterprise-os)
 */

interface CrewHoursMetrics {
  crewMemberId: string;
  totalCostUSD: number;
  totalTokens: number;
  estimatedHours: number; // Derived from tokens + model
  costPerHour: number;
  costPerStoryPoint: number; // If story linked
  modelsUsed: string[]; // Which OpenRouter models invoked
}

async function scrapeCrewCost(): Promise<CrewHoursMetrics[]> {
  // Query cost ledger, group by crew member
  const costData = await db
    .from('sa_cost_ledger')
    .select('crew_member_id, model_used, total_cost_usd, total_tokens')
    .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000))
    .groupBy('crew_member_id');

  // Token→hours conversion (heuristic)
  const TOKEN_PER_HOUR = 150000; // Rough average from OpenRouter

  return costData.map((row) => {
    const hours = row.total_tokens / TOKEN_PER_HOUR;
    return {
      crewMemberId: row.crew_member_id,
      totalCostUSD: row.total_cost_usd,
      totalTokens: row.total_tokens,
      estimatedHours: hours,
      costPerHour: row.total_cost_usd / Math.max(hours, 0.1),
      costPerStoryPoint: 0, // Will be calculated after linking to stories
      modelsUsed: [...new Set((row.models_used || []).split(','))],
    };
  });
}
```

#### **2.2.4 From RAG Memory (Lessons Learned)**

```typescript
/**
 * Query RAG memories for crew-authored observations:
 * - Risk flags ("UI work always +20%")
 * - Velocity patterns per crew member
 * - Dependency discoveries
 * - Quality issues
 */

interface RagVelocityObservation {
  observationId: string;
  crewMemberId: string;
  topic: 'velocity' | 'risk' | 'dependency' | 'quality';
  content: string;
  tags: string[];
  createdAt: Date;
  relatedStories: string[]; // Story references
}

async function scrapeRagMemories(): Promise<RagVelocityObservation[]> {
  // Query RAG for velocity-related observations (last 30 days)
  const observations = await rag.search({
    query: 'velocity underestimate blocker cycle time',
    tags: ['velocity', 'risk', 'lesson-learned'],
    lookbackDays: 30,
    limit: 100,
  });

  return observations.map((obs) => ({
    observationId: obs.id,
    crewMemberId: obs.author_crew_member_id || 'unknown',
    topic: categorizeObservation(obs.content),
    content: obs.content,
    tags: obs.tags || [],
    createdAt: new Date(obs.created_at),
    relatedStories: extractStoryReferences(obs.content),
  }));
}

function categorizeObservation(content: string): 'velocity' | 'risk' | 'dependency' | 'quality' {
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('blocker') || lowerContent.includes('waiting')) return 'risk';
  if (lowerContent.includes('depends') || lowerContent.includes('dependency')) return 'dependency';
  if (lowerContent.includes('rework') || lowerContent.includes('defect')) return 'quality';
  return 'velocity';
}

function extractStoryReferences(content: string): string[] {
  const storyPattern = /PROD-\d+/g;
  return content.match(storyPattern) || [];
}
```

#### **2.2.5 From Git (Commit Activity - Optional)**

```typescript
/**
 * Lightweight commit analysis for activity signals
 * (Optional: can be deferred to Phase 2)
 */

interface GitActivityMetrics {
  crewMemberId: string;
  commitsLast2Hours: number;
  commitsLast24Hours: number;
  avgTimePerCommit: number; // Minutes
  activitySignal: number; // 0-1 (higher = active)
}

// Deferred implementation — requires git log parsing
// For now, rely on Supabase execution state + Aha story completion as activity proxy
```

### 2.3 Aggregation Logic

```typescript
/**
 * Aggregate collected metrics into velocity snapshots
 */

async function aggregateMetrics(
  ahaMetrics: AhaStoryMetrics[],
  executionMetrics: CrewExecutionMetrics[],
  costMetrics: CrewHoursMetrics[],
  ragObservations: RagVelocityObservation[]
): Promise<AggregatedMetrics> {
  
  // 1. Calculate per-crew velocity
  const crewVelocities = aggregateCrewVelocity(ahaMetrics, executionMetrics, costMetrics);
  
  // 2. Update feature-type velocities
  const featureVelocities = aggregateFeatureVelocities(ahaMetrics, crewVelocities);
  
  // 3. Sprint-level summary
  const sprintVelocity = aggregateSprintVelocity(ahaMetrics, ragObservations);
  
  // 4. Forecast (using updated velocities)
  const forecast = calculateSprintForecast(sprintVelocity, crewVelocities, featureVelocities);
  
  return {
    crewMemberVelocities: crewVelocities,
    featureTypeVelocities: featureVelocities,
    sprintVelocity,
    forecastSprint: forecast,
  };
}

function aggregateCrewVelocity(
  ahaMetrics: AhaStoryMetrics[],
  executionMetrics: CrewExecutionMetrics[],
  costMetrics: CrewHoursMetrics[]
): CrewMemberVelocityProfile[] {
  
  // Group by crew member
  const crewMap = new Map<string, {
    storyPoints: number;
    cycleTime: number[];
    completed: number;
    total: number;
    blockedHours: number;
    totalWorkHours: number;
  }>();

  // Populate from Aha stories
  for (const story of ahaMetrics) {
    if (!crewMap.has(story.assignedCrewMember)) {
      crewMap.set(story.assignedCrewMember, {
        storyPoints: 0,
        cycleTime: [],
        completed: 0,
        total: 0,
        blockedHours: 0,
        totalWorkHours: 0,
      });
    }
    const crew = crewMap.get(story.assignedCrewMember)!;
    crew.storyPoints += story.storyPoints;
    if (story.cycleTime) crew.cycleTime.push(story.cycleTime);
    crew.completed++;
    crew.total++;
    crew.blockedHours += story.blockers.length * 2; // Heuristic: each blocker = ~2 hours
  }

  // Populate from execution metrics
  for (const exec of executionMetrics) {
    if (!crewMap.has(exec.crewMemberId)) {
      crewMap.set(exec.crewMemberId, {
        storyPoints: 0,
        cycleTime: [],
        completed: 0,
        total: 0,
        blockedHours: 0,
        totalWorkHours: 0,
      });
    }
    const crew = crewMap.get(exec.crewMemberId)!;
    crew.totalWorkHours += exec.durationSeconds / 3600;
    if (exec.blockers.length > 0) {
      crew.blockedHours += exec.durationSeconds / 3600 * 0.3; // Heuristic: 30% of time if blockers noted
    }
  }

  // Convert to velocity profiles
  return Array.from(crewMap.entries()).map(([crewId, data]) => {
    const workHours = Math.max(data.totalWorkHours, 0.1);
    const avgCycleTime = data.cycleTime.length > 0
      ? data.cycleTime.reduce((a, b) => a + b) / data.cycleTime.length
      : 0;

    return {
      crewMemberId: crewId,
      storyPointsPerHour: data.storyPoints / workHours,
      averageCycleTimeHours: avgCycleTime,
      completionRate: data.completed / Math.max(data.total, 1),
      blockedHours: data.blockedHours,
      contextSwitchOverhead: 0.1, // Placeholder: todo measure from Aha task switches
      reworkRate: 0.05, // Placeholder: todo track from defect rate
      velocityTrend: 'stable', // Placeholder: would compare to previous sprint
      burnoutIndicator: Math.min(data.blockedHours / workHours, 1),
      totalSprintAssignments: data.total,
      completedThisSprint: data.completed,
      preferredFeatureTypes: [], // Placeholder: would track from past assignments
      lastUpdated: new Date(),
    };
  });
}

function aggregateFeatureVelocities(
  ahaMetrics: AhaStoryMetrics[],
  crewVelocities: CrewMemberVelocityProfile[]
): FeatureTypeVelocity[] {
  
  const featureMap = new Map<string, {
    pointsCompleted: number;
    cycleTimes: number[];
    count: number;
  }>();

  for (const story of ahaMetrics) {
    const type = story.featureType;
    if (!featureMap.has(type)) {
      featureMap.set(type, { pointsCompleted: 0, cycleTimes: [], count: 0 });
    }
    const feature = featureMap.get(type)!;
    feature.pointsCompleted += story.storyPoints;
    if (story.cycleTime) feature.cycleTimes.push(story.cycleTime);
    feature.count++;
  }

  return Array.from(featureMap.entries()).map(([type, data]) => {
    const avgCycleTime = data.cycleTimes.length > 0
      ? data.cycleTimes.reduce((a, b) => a + b) / data.cycleTimes.length
      : FEATURE_TYPE_BASELINES[type]?.avgCycleTimeHours || 10;

    const avgPointsPerHour = data.count > 0
      ? data.pointsCompleted / (data.cycleTimes.reduce((a, b) => a + b, 0) / 3600)
      : FEATURE_TYPE_BASELINES[type]?.avgStoryPointsPerHour || 2.0;

    return {
      featureType: type as any,
      avgStoryPointsPerHour: avgPointsPerHour,
      avgCycleTimeHours: avgCycleTime,
      variance: calculateVariance(data.cycleTimes),
      slowestCycleTime: Math.max(...data.cycleTimes),
      complexityMultiplier: FEATURE_TYPE_BASELINES[type]?.complexityMultiplier || { low: 0.7, medium: 1.0, high: 1.5 },
      storiesCompleted: data.count,
      lastUpdated: new Date(),
    };
  });
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance); // Standard deviation
}

function aggregateSprintVelocity(
  ahaMetrics: AhaStoryMetrics[],
  ragObservations: RagVelocityObservation[]
): SprintVelocity {
  
  const pointsCompleted = ahaMetrics.reduce((sum, s) => sum + s.storyPoints, 0);
  const cycleTimes = ahaMetrics.filter(s => s.cycleTime).map(s => s.cycleTime!);
  
  // Extract blockers from RAG
  const blockerObservations = ragObservations.filter(o => o.topic === 'risk');
  const blockers: BlockerRecord[] = blockerObservations.map((obs, idx) => ({
    blockerId: `blocker-${idx}`,
    description: obs.content.substring(0, 200),
    affectedStories: obs.relatedStories,
    hoursBlocked: 4, // Placeholder
    root_cause: extractRootCause(obs.content),
  }));

  return {
    sprintId: 'current-sprint', // Would be parameterized
    releaseId: 'PROD-R-8',
    totalStoryPointsPlanned: 0, // Would query Aha release
    totalStoryPointsCompleted: pointsCompleted,
    completionRate: 0, // Placeholder
    previousSprintVelocity: 0, // Placeholder
    velocityTrend: 0,
    avgCycleTime: cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b) / cycleTimes.length : 0,
    medianCycleTime: calculateMedian(cycleTimes),
    identifiedBlockers: blockers,
    riskScore: Math.min(blockers.length * 0.15, 1),
    scopeCreepDelta: 0, // Placeholder
    reworkEstimate: Math.round(pointsCompleted * 0.05),
    defectRate: 0.02,
    metadata: {
      startDate: new Date(),
      endDate: new Date(),
      crewMembers: [...new Set(ahaMetrics.map(s => s.assignedCrewMember))],
      lastUpdated: new Date(),
    },
  };
}

function extractRootCause(content: string): string {
  if (content.includes('external')) return 'External dependency';
  if (content.includes('design')) return 'Design review';
  if (content.includes('approval')) return 'Approval gate';
  if (content.includes('dependency')) return 'Story dependency';
  return 'Other';
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
```

---

## PART 3: Cache System Architecture

### 3.1 Cache Layers

```typescript
interface CacheLayer {
  layer: 'hot' | 'warm' | 'cold';
  storageBackend: 'memory' | 'redis' | 'supabase';
  ttlSeconds: number;
  queryLatency: string; // expected SLA
}

const CACHE_LAYERS: Record<string, CacheLayer> = {
  hot: {
    layer: 'hot',
    storageBackend: 'memory',
    ttlSeconds: 7200, // 2 hours (matches scraper frequency)
    queryLatency: '<100ms',
  },
  warm: {
    layer: 'warm',
    storageBackend: 'redis', // Optional, if available
    ttlSeconds: 604800, // 7 days
    queryLatency: '<500ms',
  },
  cold: {
    layer: 'cold',
    storageBackend: 'supabase',
    ttlSeconds: 0, // Permanent
    queryLatency: '<1s',
  },
};

/**
 * Hot Cache (In-Memory)
 * Stores last 2 hours of velocity snapshots for sub-second queries
 */

class HotVelocityCache {
  private cache = new Map<string, AggregatedMetrics>();
  private ttlMap = new Map<string, number>();

  set(key: string, value: AggregatedMetrics, ttlSeconds: number = 7200) {
    this.cache.set(key, value);
    this.ttlMap.set(key, Date.now() + ttlSeconds * 1000);
    
    // Auto-cleanup expired entries
    setInterval(() => this.cleanup(), 60000);
  }

  get(key: string): AggregatedMetrics | null {
    const expiry = this.ttlMap.get(key);
    if (!expiry || expiry < Date.now()) {
      this.cache.delete(key);
      this.ttlMap.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this.ttlMap.entries()) {
      if (expiry < now) {
        this.cache.delete(key);
        this.ttlMap.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
    this.ttlMap.clear();
  }
}

/**
 * Warm Cache (Redis - optional, if available)
 * Stores last 7 days of snapshots for faster retrieval than DB
 */

class WarmVelocityCache {
  private client: RedisClient; // Optional

  async set(key: string, value: AggregatedMetrics) {
    if (!this.client) return;
    const ttl = 604800; // 7 days
    await this.client.setex(key, ttl, JSON.stringify(value));
  }

  async get(key: string): Promise<AggregatedMetrics | null> {
    if (!this.client) return null;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async delete(key: string) {
    if (!this.client) return;
    await this.client.del(key);
  }
}

/**
 * Cold Storage (Supabase)
 * Historical velocity snapshots for long-term trend analysis
 */

class ColdVelocityCache {
  async store(snapshot: VelocitySnapshot) {
    await db
      .from('sa_velocity_snapshots')
      .upsert({
        id: crypto.randomUUID(),
        snapshot_timestamp: new Date(),
        sprint_id: snapshot.sprintId,
        release_id: snapshot.releaseId,
        crew_member_id: snapshot.crewMemberId || null,
        story_points_completed: snapshot.storyPointsCompleted,
        cycle_time_hours: snapshot.avgCycleTime,
        completion_rate: snapshot.completionRate,
        blocked_hours: snapshot.blockedHours,
        feature_type: snapshot.featureType || null,
        remaining_points: snapshot.remainingPoints,
        current_velocity_points_per_hour: snapshot.currentVelocity,
        forecast_hours_to_completion: snapshot.forecastHoursToCompletion,
        forecast_completion_date: snapshot.forecastCompletionDate,
        confidence_50_date: snapshot.confidence50Date,
        confidence_80_date: snapshot.confidence80Date,
        confidence_95_date: snapshot.confidence95Date,
        identified_blockers: snapshot.identifiedBlockers,
        scope_creep_delta: snapshot.scopeCreepDelta,
        quality_rework_estimate: snapshot.reworkEstimate,
        metrics_json: JSON.stringify(snapshot),
      }, { onConflict: 'id' });
  }

  async query(sprintId: string, limit: number = 10): Promise<VelocitySnapshot[]> {
    const results = await db
      .from('sa_velocity_snapshots')
      .select('*')
      .eq('sprint_id', sprintId)
      .order('snapshot_timestamp', { ascending: false })
      .limit(limit);

    return results.map(row => JSON.parse(row.metrics_json));
  }

  async trendAnalysis(sprintId: string): Promise<TrendAnalysis> {
    const snapshots = await this.query(sprintId, 20);
    
    if (snapshots.length < 2) {
      return { trend: 'insufficient_data', snapshots };
    }

    const velocities = snapshots.map(s => s.currentVelocity);
    const earliest = velocities[velocities.length - 1];
    const latest = velocities[0];
    const percentChange = ((latest - earliest) / earliest) * 100;

    return {
      trend: percentChange > 5 ? 'improving' : percentChange < -5 ? 'degrading' : 'stable',
      percentChange,
      snapshots,
    };
  }
}
```

### 3.2 Supabase Table Definition

```sql
-- Velocity Snapshots (Cold Storage)
CREATE TABLE sa_velocity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Context
  sprint_id TEXT NOT NULL,
  release_id TEXT,
  crew_member_id TEXT, -- NULL = sprint-level aggregate
  feature_type TEXT, -- NULL = all types
  
  -- Completion Metrics
  story_points_completed INTEGER NOT NULL DEFAULT 0,
  cycle_time_hours NUMERIC,
  completion_rate NUMERIC CHECK (completion_rate >= 0 AND completion_rate <= 1),
  blocked_hours NUMERIC DEFAULT 0,
  
  -- Velocity
  current_velocity_points_per_hour NUMERIC,
  
  -- Forecast
  remaining_points INTEGER,
  forecast_hours_to_completion NUMERIC,
  forecast_completion_date DATE,
  confidence_50_date DATE,
  confidence_80_date DATE,
  confidence_95_date DATE,
  
  -- Risk Assessment
  identified_blockers JSONB, -- Array of blocker descriptions
  scope_creep_delta INTEGER DEFAULT 0,
  quality_rework_estimate NUMERIC DEFAULT 0,
  
  -- Full snapshot (for reconstruction)
  metrics_json JSONB NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_velocity_sprint_crew ON sa_velocity_snapshots(sprint_id, crew_member_id, snapshot_timestamp DESC);
CREATE INDEX idx_velocity_sprint_timestamp ON sa_velocity_snapshots(sprint_id, snapshot_timestamp DESC);
CREATE INDEX idx_velocity_feature_type ON sa_velocity_snapshots(feature_type, snapshot_timestamp DESC);
```

### 3.3 Access Patterns

```typescript
/**
 * Cache Manager: Orchestrates hot/warm/cold layers
 */

class VelocityCacheManager {
  constructor(
    private hotCache: HotVelocityCache,
    private warmCache: WarmVelocityCache,
    private coldCache: ColdVelocityCache
  ) {}

  /**
   * Get latest velocity for crew member
   * Query path: hot → warm → cold
   */
  async getCrewVelocity(crewId: string): Promise<CrewMemberVelocityProfile | null> {
    const key = `crew:${crewId}:latest`;

    // 1. Check hot cache
    const hotData = this.hotCache.get(key);
    if (hotData) return hotData.crewMemberVelocities.find(c => c.crewMemberId === crewId) || null;

    // 2. Check warm cache
    const warmData = await this.warmCache.get(key);
    if (warmData) {
      this.hotCache.set(key, warmData); // Promote to hot
      return warmData.crewMemberVelocities.find(c => c.crewMemberId === crewId) || null;
    }

    // 3. Query cold storage (last snapshot)
    const latestSnapshot = await db
      .from('sa_velocity_snapshots')
      .select('metrics_json')
      .eq('crew_member_id', crewId)
      .order('snapshot_timestamp', { ascending: false })
      .limit(1)
      .single();

    if (latestSnapshot) {
      const data = JSON.parse(latestSnapshot.metrics_json);
      await this.warmCache.set(key, data);
      this.hotCache.set(key, data);
      return data.crewMemberVelocities.find((c: any) => c.crewMemberId === crewId) || null;
    }

    return null;
  }

  /**
   * Get sprint forecast
   * Query path: hot → warm → cold
   */
  async getSprintForecast(sprintId: string): Promise<SprintForecast | null> {
    const key = `sprint:${sprintId}:forecast`;

    // 1. Hot cache
    const hotData = this.hotCache.get(key);
    if (hotData) return hotData.forecastSprint;

    // 2. Warm cache
    const warmData = await this.warmCache.get(key);
    if (warmData) {
      this.hotCache.set(key, warmData);
      return warmData.forecastSprint;
    }

    // 3. Cold storage
    const latest = await db
      .from('sa_velocity_snapshots')
      .select('metrics_json')
      .eq('sprint_id', sprintId)
      .is('crew_member_id', null) // Sprint-level (not crew-specific)
      .order('snapshot_timestamp', { ascending: false })
      .limit(1)
      .single();

    if (latest) {
      const data = JSON.parse(latest.metrics_json);
      await this.warmCache.set(key, data);
      this.hotCache.set(key, data);
      return data.forecastSprint;
    }

    return null;
  }

  /**
   * Get trend analysis (multiple snapshots)
   */
  async getSprintTrend(sprintId: string, lookbackDays: number = 14): Promise<TrendAnalysis> {
    const key = `sprint:${sprintId}:trend:${lookbackDays}d`;

    // Check warm cache first
    const cached = await this.warmCache.get(key);
    if (cached) return cached;

    // Query cold storage
    const trend = await this.coldCache.trendAnalysis(sprintId);
    
    // Cache result for 1 hour
    await this.warmCache.set(key, trend);
    
    return trend;
  }

  /**
   * Store new snapshot (writes to all layers)
   */
  async storeSnapshot(snapshot: AggregatedMetrics, sprintId: string) {
    // 1. Hot cache (immediate)
    const key = `sprint:${sprintId}:snapshot:${Date.now()}`;
    this.hotCache.set(key, { ...snapshot, forecastSprint: snapshot.forecastSprint || {} } as any);

    // 2. Warm cache (if available)
    await this.warmCache.set(key, { ...snapshot } as any);

    // 3. Cold storage (persistent)
    for (const crew of snapshot.crewMemberVelocities) {
      await this.coldCache.store({
        sprintId,
        releaseId: 'PROD-R-8',
        crewMemberId: crew.crewMemberId,
        storyPointsCompleted: 0,
        avgCycleTime: crew.averageCycleTimeHours,
        completionRate: crew.completionRate,
        blockedHours: crew.blockedHours,
        currentVelocity: crew.storyPointsPerHour,
        remainingPoints: 0,
        forecastHoursToCompletion: 0,
        forecastCompletionDate: new Date(),
        confidence50Date: new Date(),
        confidence80Date: new Date(),
        confidence95Date: new Date(),
        identifiedBlockers: [],
        scopeCreepDelta: 0,
        reworkEstimate: 0,
      });
    }
  }
}
```

---

## PART 4: Estimation Engine Algorithm

### 4.1 Core Forecasting Logic

```typescript
/**
 * VelocityEstimator: Calculates time-to-release + confidence intervals
 */

class VelocityEstimator {
  constructor(
    private velocityCache: VelocityCacheManager,
    private ahaClient: AhaClient
  ) {}

  /**
   * Estimate time to release
   * Input: Sprint ID, remaining work
   * Output: Forecast with confidence intervals
   */
  async estimateReleaseDate(sprintId: string): Promise<ReleaseEstimate> {
    // 1. Fetch sprint details from Aha
    const sprint = await this.ahaClient.getSprint(sprintId);
    const remainingStories = sprint.features.filter(f => f.status !== 'Complete' && f.status !== 'Shipped');
    
    // 2. Get current crew velocity
    const forecast = await this.velocityCache.getSprintForecast(sprintId);
    if (!forecast) {
      return this.getMostConservativeEstimate(remainingStories);
    }

    // 3. Calculate time to completion
    const estimate = this.calculateEstimate(
      remainingStories,
      forecast,
      sprint
    );

    // 4. Apply risk adjustments
    const adjusted = this.applyRiskAdjustments(estimate, forecast);

    return adjusted;
  }

  /**
   * Core calculation (pseudocode)
   * 
   * FOR each_remaining_story:
   *   feature_type = story.tags[0]
   *   velocity = cache.getFeatureTypeVelocity(feature_type)
   *   hours_needed = story.storyPoints / velocity.avgPointsPerHour
   *   adjusted_hours = hours_needed * velocity.complexityMultiplier[story.complexity]
   * 
   * total_hours = SUM(adjusted_hours per story)
   * 
   * -- Account for crew availability
   * crew_capacity = SUM(hours_available_this_week per assigned crew member)
   * parallel_factor = min(crew_count / 7, 1.0) -- Cap at 7 crew members
   * 
   * effective_hours = total_hours / parallel_factor
   * working_days = ceil(effective_hours / (crew_capacity / 5))
   * 
   * -- Confidence intervals (based on historical variance)
   * confidence_50 = working_days
   * confidence_80 = working_days * (1 + variance_factor * 0.3)
   * confidence_95 = working_days * (1 + variance_factor * 0.6)
   */
  
  private calculateEstimate(
    remainingStories: AhaStory[],
    forecast: SprintForecast,
    sprint: AhaSprint
  ): EstimateResult {
    
    const featureVelocities = forecast.forecastSprint.featureVelocities || {};
    let totalHoursNeeded = 0;

    // Calculate hours per story
    const storyEstimates = remainingStories.map(story => {
      const featureType = this.extractFeatureType(story.tags);
      const velocity = featureVelocities[featureType] || FEATURE_TYPE_BASELINES[featureType];
      
      if (!velocity) {
        console.warn(`No velocity found for feature type: ${featureType}`);
        return { story, hoursNeeded: 0 };
      }

      const baseHours = story.storyPoints / velocity.avgStoryPointsPerHour;
      const complexity = this.estimateComplexity(story);
      const multiplier = velocity.complexityMultiplier[complexity] || 1.0;
      const adjustedHours = baseHours * multiplier;

      totalHoursNeeded += adjustedHours;

      return {
        story,
        baseHours,
        complexity,
        multiplier,
        adjustedHours,
      };
    });

    // Crew capacity calculation
    const assignedCrew = [...new Set(remainingStories.map(s => s.assignedTo))];
    const crewCapacity = this.calculateCrewCapacity(assignedCrew);
    
    // Parallel work factor
    const parallelFactor = Math.min(assignedCrew.length / 7, 1.0);
    const effectiveHours = totalHoursNeeded / Math.max(parallelFactor, 0.5);
    
    // Convert to calendar days
    const workingDaysPerWeek = 5;
    const hoursPerDay = crewCapacity / workingDaysPerWeek;
    const workingDaysNeeded = Math.ceil(effectiveHours / hoursPerDay);
    const calendarDays = Math.ceil(workingDaysNeeded * 7 / 5);

    // Base estimate
    const baseCompletionDate = new Date();
    baseCompletionDate.setDate(baseCompletionDate.getDate() + calendarDays);

    return {
      storyEstimates,
      totalHoursNeeded,
      crewCapacity,
      parallelFactor,
      workingDaysNeeded,
      calendarDaysNeeded: calendarDays,
      baseCompletionDate,
    };
  }

  private applyRiskAdjustments(
    estimate: EstimateResult,
    forecast: SprintForecast
  ): ReleaseEstimate {
    
    // Risk factors
    let bufferPercent = 0;

    // 1. Identified blockers
    if (forecast.identifiedRisks.length > 0) {
      bufferPercent += 25; // 25% buffer for known blockers
    }

    // 2. Scope creep
    if (forecast.forecastSprint.scopeCreepDelta > 0) {
      const creepHours = forecast.forecastSprint.scopeCreepDelta / 2; // Heuristic: 2 hours per point
      bufferPercent += (creepHours / estimate.totalHoursNeeded) * 100;
    }

    // 3. Quality rework
    if (forecast.forecastSprint.reworkEstimate > 0) {
      const reworkHours = forecast.forecastSprint.reworkEstimate / 2;
      bufferPercent += (reworkHours / estimate.totalHoursNeeded) * 100;
    }

    // 4. Historical variance
    const varianceFactor = forecast.baselineAssumptions.historicalVariance || 0.2;

    // Calculate confidence intervals
    const bufferDays50 = estimate.calendarDaysNeeded * bufferPercent / 100;
    const bufferDays80 = estimate.calendarDaysNeeded * (bufferPercent + varianceFactor * 30) / 100;
    const bufferDays95 = estimate.calendarDaysNeeded * (bufferPercent + varianceFactor * 60) / 100;

    const estimate50 = new Date(estimate.baseCompletionDate);
    estimate50.setDate(estimate50.getDate() + bufferDays50);

    const estimate80 = new Date(estimate.baseCompletionDate);
    estimate80.setDate(estimate80.getDate() + bufferDays80);

    const estimate95 = new Date(estimate.baseCompletionDate);
    estimate95.setDate(estimate95.getDate() + bufferDays95);

    return {
      ...estimate,
      riskAdjustmentPercent: bufferPercent,
      confidence50: {
        date: estimate50,
        confidence: 50,
        daysFromNow: this.daysFromNow(estimate50),
      },
      confidence80: {
        date: estimate80,
        confidence: 80,
        daysFromNow: this.daysFromNow(estimate80),
      },
      confidence95: {
        date: estimate95,
        confidence: 95,
        daysFromNow: this.daysFromNow(estimate95),
      },
      recommendation: this.generateRecommendation(forecast, estimate),
    };
  }

  private estimateComplexity(story: AhaStory): 'low' | 'medium' | 'high' {
    // Heuristic: story points + tags + blockers
    if (story.storyPoints <= 3) return 'low';
    if (story.storyPoints >= 8) return 'high';
    if (story.tags.includes('experimental')) return 'high';
    return 'medium';
  }

  private calculateCrewCapacity(assignedCrew: string[]): number {
    // Heuristic: 6 hours per crew member per day (8h - meetings/admin)
    return assignedCrew.length * 6;
  }

  private daysFromNow(date: Date): number {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private generateRecommendation(forecast: SprintForecast, estimate: EstimateResult): string {
    if (forecast.riskScore > 0.7) {
      return `🔴 High risk: Release delayed to ${estimate.confidence95.date.toDateString()}. Recommend scope reduction of ${Math.round(estimate.totalHoursNeeded * 0.2 / 2)} points.`;
    }
    if (forecast.riskScore > 0.4) {
      return `🟡 Moderate risk: Release on ${estimate.confidence80.date.toDateString()} (80% confidence). Monitor blockers.`;
    }
    return `🟢 On track: Release by ${estimate.confidence80.date.toDateString()} (80% confidence).`;
  }

  private getMostConservativeEstimate(stories: AhaStory[]): ReleaseEstimate {
    // Fallback when no velocity data yet
    const totalPoints = stories.reduce((sum, s) => sum + s.storyPoints, 0);
    const conservativeHours = totalPoints * 2; // Worst-case: 2 hours per point
    const days = Math.ceil(conservativeHours / 6); // 6 hours/day crew capacity

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + days);

    return {
      storyEstimates: [],
      totalHoursNeeded: conservativeHours,
      crewCapacity: 6,
      parallelFactor: 1,
      workingDaysNeeded: days,
      calendarDaysNeeded: days,
      baseCompletionDate: baseDate,
      riskAdjustmentPercent: 100, // Worst-case until real data available
      confidence50: { date: baseDate, confidence: 50, daysFromNow: this.daysFromNow(baseDate) },
      confidence80: {
        date: new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000),
        confidence: 80,
        daysFromNow: days * 2,
      },
      confidence95: {
        date: new Date(baseDate.getTime() + days * 2 * 24 * 60 * 60 * 1000),
        confidence: 95,
        daysFromNow: days * 3,
      },
      recommendation: `⚠️ Insufficient velocity data. Conservative estimate: ${days * 3} days. Recommend collecting 2-3 sprints of data.`,
    };
  }

  private extractFeatureType(tags: string[]): string {
    // Same as scraper logic
    return tags.find(t => Object.keys(FEATURE_TYPE_BASELINES).includes(t)) || 'logic';
  }
}

interface ReleaseEstimate extends EstimateResult {
  riskAdjustmentPercent: number;
  confidence50: { date: Date; confidence: 50; daysFromNow: number };
  confidence80: { date: Date; confidence: 80; daysFromNow: number };
  confidence95: { date: Date; confidence: 95; daysFromNow: number };
  recommendation: string;
}

interface EstimateResult {
  storyEstimates: any[];
  totalHoursNeeded: number;
  crewCapacity: number;
  parallelFactor: number;
  workingDaysNeeded: number;
  calendarDaysNeeded: number;
  baseCompletionDate: Date;
}
```

---

## PART 5: Autonomous Optimization Rules

### 5.1 Auto-Adjust Story Points

```typescript
/**
 * VelocityOptimizer: Auto-adjust estimates based on historical performance
 */

class VelocityOptimizer {
  /**
   * Rule 1: Adjust baseline estimates based on actual velocity
   * 
   * If feature type X consistently completes 20% faster than estimated:
   *   - Reduce baseline estimate for that feature type by 15%
   * 
   * If feature type Y consistently takes 30% longer:
   *   - Increase baseline estimate by 20%
   */
  async adjustFeatureTypeBaselines(sprintId: string) {
    const trend = await this.velocityCache.getSprintTrend(sprintId, 30);
    
    for (const featureType of Object.keys(FEATURE_TYPE_BASELINES)) {
      const typeSnapshots = trend.snapshots.filter(s => s.featureType === featureType);
      if (typeSnapshots.length < 3) continue; // Need at least 3 data points

      // Compare planned vs actual
      const avgPlannedHours = typeSnapshots.map(s => s.story.storyPoints * 2).reduce((a, b) => a + b) / typeSnapshots.length;
      const avgActualHours = typeSnapshots.map(s => s.cycleTime).reduce((a, b) => a + b) / typeSnapshots.length;
      
      const variance = (avgActualHours - avgPlannedHours) / avgPlannedHours;

      if (Math.abs(variance) > 0.15) { // >15% difference
        const adjustment = variance > 0 ? 1.15 : 0.85; // Adjust by 15%
        
        FEATURE_TYPE_BASELINES[featureType].avgStoryPointsPerHour *= 1 / adjustment;
        
        // Log to RAG
        await this.storeAdjustment({
          featureType,
          oldBaseline: avgPlannedHours,
          newBaseline: avgActualHours,
          reason: `${Math.round(variance * 100)}% variance observed`,
        });
      }
    }
  }

  /**
   * Rule 2: Flag underestimated stories
   * 
   * If story is 50% through its time box but only 25% complete:
   *   - Flag as "at risk" with 24-hour response SLA
   */
  async flagUnderestimatedStories(sprintId: string) {
    const stories = await this.ahaClient.getSprintStories(sprintId);
    
    for (const story of stories) {
      if (story.status === 'Complete' || story.status === 'Shipped') continue;

      const cycleTimeSoFar = this.calculateCycleTime(story.startedDate, new Date());
      const estimatedCycleTime = story.storyPoints * 2; // Heuristic: 2 hours per point
      const timePercentage = cycleTimeSoFar / estimatedCycleTime;

      // Estimate progress based on cycle time
      // If we're 50% through but the story doesn't look 50% complete, flag
      const estimatedProgress = this.estimateStoryProgress(story);
      
      if (timePercentage >= 0.5 && estimatedProgress < 0.35) {
        // Story is at risk
        await this.flagStoryAsRisk({
          storyId: story.id,
          timePercentage: Math.round(timePercentage * 100),
          estimatedProgress: Math.round(estimatedProgress * 100),
          recommendation: `Story ${story.id} is behind schedule. Options: (1) extend deadline, (2) reduce scope, (3) add help.`,
          escalationTo: story.assignedTo, // Crew member
          escalationLevel: timePercentage >= 0.75 ? 'critical' : 'warning',
        });
      }
    }
  }

  /**
   * Rule 3: Auto-scale complexity estimates
   * 
   * If cost ledger shows a story took 150k tokens (high-complexity proxy):
   *   - Tag future similar stories as "high complexity"
   *   - Apply 1.5x multiplier to estimates
   */
  async autoScaleComplexity() {
    const costData = await db
      .from('sa_cost_ledger')
      .select('story_id, total_tokens, model_used')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Last 30 days

    // Categorize by complexity
    const complexityMap = new Map<string, number>();
    
    for (const row of costData) {
      const complexity = row.total_tokens > 100000 ? 'high' : row.total_tokens > 50000 ? 'medium' : 'low';
      complexityMap.set(row.story_id, row.total_tokens);
    }

    // Store complexity ratings for future reference
    for (const [storyId, tokens] of complexityMap.entries()) {
      await db
        .from('sa_story_complexity')
        .upsert({
          story_id: storyId,
          estimated_tokens: tokens,
          complexity_level: tokens > 100000 ? 'high' : tokens > 50000 ? 'medium' : 'low',
          updated_at: new Date(),
        });
    }
  }

  /**
   * Rule 4: Optimize crew allocation
   * 
   * If UI work (Uhura) is bottleneck and Infrastructure work (O'Brien) is ahead:
   *   - Recommend: "Move 1 story from O'Brien to Uhura"
   *   - Track completion rate per story type per crew member
   */
  async recommendCrewReallocation(sprintId: string) {
    const crew = await this.velocityCache.getSprintForecast(sprintId);
    const stories = await this.ahaClient.getSprintStories(sprintId);
    
    // Find bottlenecks
    const completionByType = new Map<string, { total: number; completed: number; assignee: string }>();
    
    for (const story of stories) {
      const type = this.extractFeatureType(story.tags);
      if (!completionByType.has(type)) {
        completionByType.set(type, { total: 0, completed: 0, assignee: story.assignedTo });
      }
      const stat = completionByType.get(type)!;
      stat.total++;
      if (story.status === 'Complete') stat.completed++;
    }

    // Identify bottlenecks
    const bottlenecks: string[] = [];
    for (const [type, stat] of completionByType.entries()) {
      const completionRate = stat.completed / stat.total;
      if (completionRate < 0.3) {
        bottlenecks.push(`${type} (${stat.assignee}): ${Math.round(completionRate * 100)}% done`);
      }
    }

    if (bottlenecks.length > 0) {
      await this.storeReallocationRecommendation({
        sprintId,
        bottlenecks,
        recommendation: `Recommend reassigning 1-2 stories from higher-velocity crew members to bottleneck assignees.`,
        priority: 'high',
      });
    }
  }

  /**
   * Rule 5: Continuous learning loop
   * 
   * After sprint completion:
   *   - Compare forecast vs actual
   *   - Calculate accuracy
   *   - Store lessons in RAG
   */
  async postSprintRetrospective(sprintId: string, actualCompletionDate: Date) {
    const forecasts = await db
      .from('sa_velocity_snapshots')
      .select('metrics_json')
      .eq('sprint_id', sprintId)
      .order('snapshot_timestamp', { ascending: false })
      .limit(1);

    if (forecasts.length === 0) return;

    const lastForecast = JSON.parse(forecasts[0].metrics_json);
    const forecastDate = lastForecast.forecastSprint.confidence80Date;
    const daysError = this.daysFromNow(actualCompletionDate) - this.daysFromNow(forecastDate);
    const errorPercent = (daysError / this.daysFromNow(forecastDate)) * 100;

    // Store lesson
    const lesson = {
      sprintId,
      forecastDate,
      actualDate: actualCompletionDate,
      daysError,
      errorPercent: Math.round(errorPercent),
      accuracy: Math.round(100 - Math.abs(errorPercent)),
      recommendation: `Forecast was ${daysError > 0 ? 'pessimistic' : 'optimistic'} by ${Math.abs(Math.round(daysError))} days.`,
    };

    // Store to RAG for crew reflection
    await this.storeToRag({
      topic: 'velocity-retrospective',
      content: `Sprint ${sprintId} completed. ${lesson.recommendation}`,
      tags: ['velocity', 'retrospective', 'lesson-learned'],
      data: lesson,
    });

    // Update velocity model for next sprint
    // (Crew members review this + adjust their own estimates)
  }

  private async flagStoryAsRisk(riskRecord: any) {
    // Store risk flag to Supabase
    await db.from('sa_story_risks').insert(riskRecord);
    
    // Notify crew member via RAG
    await this.storeToRag({
      topic: 'story-risk-flag',
      content: riskRecord.recommendation,
      tags: ['risk', 'alert'],
      relatedStories: [riskRecord.storyId],
    });
  }

  private async storeAdjustment(data: any) {
    await this.storeToRag({
      topic: 'velocity-adjustment',
      content: `Feature type ${data.featureType} baseline adjusted. Reason: ${data.reason}`,
      tags: ['velocity', 'adjustment'],
      data,
    });
  }

  private async storeReallocationRecommendation(data: any) {
    await this.storeToRag({
      topic: 'crew-allocation',
      content: data.recommendation,
      tags: ['crew', 'allocation', 'bottleneck'],
      data,
    });
  }

  private estimateStoryProgress(story: any): number {
    // Heuristic based on story status + comments
    const statusProgress: Record<string, number> = {
      'Planned': 0,
      'In Progress': 0.3,
      'In Review': 0.7,
      'Blocked': 0.2,
      'Complete': 1.0,
    };
    return statusProgress[story.status] || 0;
  }

  private calculateCycleTime(startDate: string | undefined, endDate: Date): number {
    if (!startDate) return 0;
    const diff = endDate.getTime() - new Date(startDate).getTime();
    return diff / (1000 * 60 * 60); // Hours
  }

  private daysFromNow(date: Date): number {
    const diff = date.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private extractFeatureType(tags: string[]): string {
    return tags.find(t => Object.keys(FEATURE_TYPE_BASELINES).includes(t)) || 'logic';
  }

  private async storeToRag(observation: any) {
    // TODO: Implement RAG storage
    console.log('[RAG]', observation);
  }
}
```

---

## PART 6: Implementation Roadmap

### Phase 1 (Sprint 1: Week 1-2) — Metrics Collection

**Goal:** Establish velocity tracking infrastructure + collect 2 weeks of baseline data.

**Deliverables:**
1. `packages/shared/src/velocity-metrics.ts` — Core types + baselines
2. `supabase/migrations/<timestamp>_create_velocity_tables.sql` — DB schema
3. `scripts/velocity-scraper.ts` — Manual scraper (runs once per 2 hours)
4. Manual velocity report (JSON) after 2 weeks

**Owner:** Geordi (design), Data (Aha integration), Quark (cost ledger)

**Effort:** ~12 points (3 crew members, 2 weeks part-time)

**Tasks:**
- [ ] Define `VelocityMetrics` types + baselines
- [ ] Create Supabase `sa_velocity_snapshots` table
- [ ] Implement Aha scraper (completed stories)
- [ ] Implement Supabase scraper (execution state + cost ledger)
- [ ] Implement RAG scraper (lessons learned)
- [ ] Run scraper manually, collect baseline data
- [ ] Publish raw velocity report

---

### Phase 2 (Sprint 2: Week 3-4) — Cache & Estimation API

**Goal:** Build fast cache layer + expose velocity estimation API.

**Deliverables:**
1. `packages/shared/src/velocity-cache.ts` — Hot/warm/cold cache
2. `packages/ui/src/app/api/estimation/velocity.ts` — Velocity API endpoints
3. `packages/mcp-server/src/lib/velocity-estimator.ts` — Estimation engine
4. API docs + example queries

**Owner:** Quark (cache design), Riker (API), Data (estimator logic)

**Effort:** ~14 points

**Tasks:**
- [ ] Implement `HotVelocityCache` (in-memory)
- [ ] Implement `WarmVelocityCache` (Redis, optional)
- [ ] Implement `ColdVelocityCache` (Supabase query)
- [ ] Implement `VelocityEstimator` (forecast calculation)
- [ ] Create API routes: `GET /api/estimation/velocity?sprintId=PROD-R-8`
- [ ] Integrate cache manager into API
- [ ] Add API authentication + rate limiting
- [ ] Write API docs

---

### Phase 3 (Sprint 3: Week 5-6) — Dashboard & Automation

**Goal:** Visualize velocity data + enable autonomous optimization.

**Deliverables:**
1. `/release/[releaseId]/velocity` — Velocity dashboard (React)
2. Velocity API auto-estimation (MCP tool)
3. Sprint burndown chart (historical + forecast)
4. Auto-flagging for underestimated stories
5. Crew notifications for risk flags

**Owner:** Uhura (UI/dashboard), Geordi (burndown visualization), Worf (notifications)

**Effort:** ~16 points

**Tasks:**
- [ ] Design velocity dashboard layout
- [ ] Implement velocity summary card (crew + sprint metrics)
- [ ] Implement burndown chart (historical trend + forecast)
- [ ] Implement forecast panel (50/80/95 confidence dates)
- [ ] Implement risk flags + blocker list
- [ ] Create MCP tool: `auto_estimate_story_points`
- [ ] Implement auto-flagging logic (underestimated stories)
- [ ] Add Aha comment notifications

---

### Phase 4 (Post-Sprint: Week 7+) — Optimization & Learning

**Goal:** Enable crew self-optimization + Admiral strategic planning.

**Deliverables:**
1. Crew allocation recommendations (UI panel)
2. Observation Lounge feedback loop (crew velocity reflection)
3. Velocity leaderboard (per-crew member)
4. Admiral release risk dashboard

**Owner:** Picard (strategy), Riker (crew coordination), Data (analysis)

**Effort:** ~12 points

**Tasks:**
- [ ] Implement reallocation recommendation engine
- [ ] Create Observation Lounge prompt for velocity feedback
- [ ] Implement velocity leaderboard
- [ ] Create Admiral release health dashboard
- [ ] Add cross-sprint trend analysis
- [ ] Implement crew self-assessment form

---

## PART 7: Design Decisions & Trade-offs

| Decision | Rationale | Alternatives | Selected |
|---|---|---|---|
| **Scraper Frequency** | Every 2 hours provides fast feedback loop, enables real-time risk flagging | Daily batch (simpler, less overhead) | **2-hour batches** (with fallback to daily if overload) |
| **Confidence Intervals** | 50/80/95 realistic + risk-aware, gives stakeholders choices | Single point estimate (simpler), percentile approach | **50/80/95** (lead with 80% as default) |
| **Velocity Metric** | Points/hour (universal across feature types) + cycle time (quality signal) | Cost-based ($/ story), pure hours (less portable) | **Points/hour + cycle time** |
| **Historical Data Baseline** | Need 2-3 sprints before estimates reliable; ramp-up Week 1-6 | Start estimates immediately (high error), wait 6 weeks (opportunity cost) | **Start collecting, estimates by Sprint 2** |
| **Cache Layers** | Hot (fast) + cold (persistent) with optional warm (Redis) handles scaling | Single in-memory (doesn't scale), pure DB (slow) | **Tiered cache** (hot required, warm/cold optional) |
| **Crew Self-Assessment** | Hybrid: automated + crew override (realistic, lets crew explain anomalies) | Purely automated (simple, misses context), purely manual (high overhead) | **Hybrid with crew override** |
| **Feature Type Taxonomy** | 5 types (infrastructure, logic, ui, security, testing) match crew roles | Finer-grained (harder to track), coarser (loses specificity) | **5 types** (crew-aligned) |

---

## PART 8: Integration Points

```typescript
/**
 * Where does velocity system connect to existing Story Agent infrastructure?
 */

// 1. MCP Tools (story-agent MCP server)
registerTool('get_velocity_forecast', {
  description: 'Estimate time-to-release for a sprint',
  schema: z.object({ sprintId: z.string() }),
  handler: async (sprintId) => {
    const estimator = new VelocityEstimator(velocityCache, ahaClient);
    return await estimator.estimateReleaseDate(sprintId);
  },
});

// 2. Aha Workflow Automation (update story estimates auto)
onAhaFeatureCreated(async (feature) => {
  const featureType = extractFeatureType(feature.tags);
  const baseline = FEATURE_TYPE_BASELINES[featureType];
  const estimatedPoints = baseline.avgCycleTimeHours / 2; // Conservative
  await ahaClient.updateFeatureEstimate(feature.id, estimatedPoints);
});

// 3. Crew Execution Feedback (after mission completes)
onCrewMissionComplete(async (result) => {
  // Store execution metrics for velocity scraper
  await db.from('sa_crew_execution_results').insert({
    mission_id: result.id,
    crew_member_id: result.actor,
    story_id: result.linkedStoryId,
    duration_seconds: result.elapsedMs / 1000,
    findings: result.findings,
    tools_used: result.toolsInvoked,
    model_used: result.modelUsed,
    token_count: result.tokensUsed,
  });
});

// 4. Cost Ledger Integration (crew hours proxy)
onCostLedgerEntry(async (entry) => {
  // Cost ledger already tracked; scraper reads from it
  // No additional integration needed
});

// 5. RAG Memory Storage (lessons learned)
onObservationLoungComplete(async (result) => {
  // Crew observations → stored as RagVelocityObservation
  for (const observation of result.crewObservations) {
    if (observation.topic.includes('velocity') || observation.topic.includes('blocker')) {
      await storeToRag({
        topic: 'velocity-lesson',
        content: observation.content,
        crewMemberId: observation.author,
        tags: extractTags(observation),
        relatedStories: extractStoryReferences(observation.content),
      });
    }
  }
});

// 6. Admiral Dashboard / Release Planning
onReleaseEdit(async (release) => {
  // Admiral looks at velocity forecast to adjust timeline
  const forecast = await velocityCache.getSprintForecast(release.id);
  if (forecast && forecast.confidence95Date < release.targetDate) {
    // Flag to Admiral: release is at risk
    notifyAdmiral({
      severity: 'warning',
      message: `Release ${release.id} is at risk. 95% confidence: ${forecast.confidence95Date}`,
      recommendation: `Reduce scope by ${estimateScopeReduction(forecast)} points or extend deadline by ${estimateDaysNeeded(forecast)} days`,
    });
  }
});

// 7. UI API Integration (velocity dashboard)
app.get('/api/estimation/velocity', async (req, res) => {
  const { sprintId } = req.query;
  const estimator = new VelocityEstimator(velocityCache, ahaClient);
  const forecast = await estimator.estimateReleaseDate(sprintId);
  res.json(forecast);
});

// 8. Scheduled Scraper (every 2 hours)
schedule('0 */2 * * *', async () => {
  const scraper = new VelocityScraper(ahaClient, db, ragClient);
  const metrics = await scraper.run();
  await velocityCache.storeSnapshot(metrics, 'current-sprint');
  
  // Run optimization rules
  const optimizer = new VelocityOptimizer(velocityCache);
  await optimizer.flagUnderestimatedStories('current-sprint');
  await optimizer.recommendCrewReallocation('current-sprint');
});
```

---

## PART 9: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Insufficient baseline data (Sprint 1)** | High | Medium | Start collecting immediately, use conservative estimates until Sprint 2, clearly label estimates as "ramp-up mode" |
| **Aha API rate limits** | Medium | High | Batch queries, cache results aggressively, implement exponential backoff |
| **Crew members gaming velocity** | Low | High | Transparent reporting (show confidence intervals), retrospectives (compare forecast vs actual), motivate accuracy over speed |
| **External blockers distort velocity** | High | Medium | Track blocker hours separately, calculate "unblocked velocity" as baseline, flag blockers in forecast |
| **Feature type misclassification** | Medium | Low | Crew tags stories explicitly in Aha, ML fallback if tag missing, review misclassifications monthly |
| **Cost ledger unavailable** | Low | Medium | Velocity system doesn't depend on cost ledger; it's optional for complexity signals |
| **Redis downtime (warm cache)** | Low | Low | Fallback: hot cache + cold storage (adds 500ms latency, acceptable) |
| **Crew abandons velocity feedback** | Low | High | Gamify (leaderboard), show value ("I know when I'll be done"), integrate into sprint planning, leadership emphasis |

---

## PART 10: Success Criteria

- ✅ **By Sprint 1 (Week 2):** Velocity scraper running, collecting Aha + execution data
- ✅ **By Sprint 2 (Week 4):** Velocity API live, forecasts within ±20% error
- ✅ **By Sprint 3 (Week 6):** Dashboard live, auto-flagging active, crew using estimates
- ✅ **By Post-Sprint (Week 8+):** Forecasts within ±10% error, crew self-optimizing, Admiral informed

**Key Metrics:**
- Forecast accuracy (actual vs predicted completion date): target ±10% by Sprint 3
- Crew adoption: 80%+ use velocity estimates in Sprint 2
- Risk flag latency: underestimated stories flagged within 24 hours
- Velocity trend: stable or improving (no degradation)

---

## PART 11: Crew Roles & Responsibilities

| Crew Member | Role | Owned Phase | Deliverables |
|---|---|---|---|
| **Geordi** | Design lead (cache, forecast logic) | 1-2 | Velocity metrics schema, cache architecture, burndown visualization |
| **Data** | Integration lead (Aha, Supabase) | 1 | Aha scraper, execution scraper, DB aggregation |
| **Quark** | Cost/efficiency lead | 1-2 | Cost ledger integration, model routing (complexity signals) |
| **Riker** | API lead, optimization orchestrator | 2-3 | Estimation API, optimization rules, crew allocation |
| **Uhura** | Dashboard UI lead | 3 | Velocity dashboard, forecast visualization, crew notifications |
| **Worf** | Security & governance | 2-3 | RAG storage (governance), notification security, Admiral audit |
| **Picard** | Strategy + oversight | 3-4 | Release planning integration, Admiral dashboard, crew coordination |

---

## NEXT STEPS

1. **Admiral Review** → Approve design (Phase 0 checkpoint)
2. **Phase 1 Kickoff** → Geordi + Data start metrics collection
3. **Week 2 Checkpoint** → First manual velocity report
4. **Crew Observation Lounge** → Feedback on baselines + risk factors
5. **Phase 2 Start** → Cache + API implementation
6. **Phase 3 Start** → Dashboard + automation

---

**Document Owners:** Geordi (design), Quark (metrics), Data (integration)  
**Last Review:** 2026-07-16  
**Next Review:** When Phase 1 baseline data ready (~2026-07-30)
