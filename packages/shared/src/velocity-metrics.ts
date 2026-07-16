/**
 * Velocity Metrics System — Core Types & Calculations
 * 
 * Defines crew velocity profiles, sprint forecasts, and estimation models.
 * Shared between MCP server and UI.
 */

export interface CrewMemberVelocityProfile {
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

export interface FeatureTypeVelocity {
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

export interface SprintVelocity {
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
  scopeCreepDelta: number; // +/- additional points added after sprint start
  
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

export interface BlockerRecord {
  blockerId: string;
  description: string; // "Waiting on Supabase migration", etc.
  affectedStories: string[]; // Story IDs blocked
  hoursBlocked: number;
  resolvedDate?: Date;
  rootCause: string; // External dependency, design review, etc.
}

export interface SprintForecast {
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

export interface AggregatedMetrics {
  crewMemberVelocities: CrewMemberVelocityProfile[];
  featureTypeVelocities: FeatureTypeVelocity[];
  sprintVelocity: SprintVelocity;
  forecastSprint: SprintForecast;
}

/**
 * Baseline velocities (empirical defaults)
 * Updated quarterly based on actual crew performance
 */
export const FEATURE_TYPE_BASELINES: Record<string, FeatureTypeVelocity> = {
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

/**
 * Velocity Snapshot — Stored in Supabase for historical analysis
 */
export interface VelocitySnapshot {
  id: string;
  snapshotTimestamp: Date;
  sprintId: string;
  releaseId?: string;
  crewMemberId?: string; // NULL = sprint-level aggregate
  featureType?: string; // NULL = all types
  
  // Metrics
  storyPointsCompleted: number;
  cycleTimeHours: number;
  completionRate: number;
  blockedHours: number;
  currentVelocity: number;
  remainingPoints: number;
  forecastHoursToCompletion: number;
  forecastCompletionDate: Date;
  confidence50Date: Date;
  confidence80Date: Date;
  confidence95Date: Date;
  identifiedBlockers: any[];
  scopeCreepDelta: number;
  reworkEstimate: number;
  
  // Full snapshot JSON (for reconstruction)
  metricsJson: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Estimation Result
 */
export interface ReleaseEstimate {
  storyEstimates: any[];
  totalHoursNeeded: number;
  crewCapacity: number;
  parallelFactor: number;
  workingDaysNeeded: number;
  calendarDaysNeeded: number;
  baseCompletionDate: Date;
  riskAdjustmentPercent: number;
  confidence50: { date: Date; confidence: 50; daysFromNow: number };
  confidence80: { date: Date; confidence: 80; daysFromNow: number };
  confidence95: { date: Date; confidence: 95; daysFromNow: number };
  recommendation: string;
}

/**
 * Utility Functions
 */

export function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance); // Standard deviation
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function daysFromNow(date: Date): number {
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateCycleTime(startDate: string | undefined, completedDate: string | Date): number {
  if (!startDate) return 0;
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(completedDate).getTime();
  return (endMs - startMs) / (1000 * 60 * 60); // Hours
}

/**
 * Trend Analysis
 */
export interface TrendAnalysis {
  trend: 'improving' | 'degrading' | 'stable' | 'insufficient_data';
  percentChange: number;
  snapshots: VelocitySnapshot[];
}

/**
 * Crew Hour Metrics (from cost ledger)
 */
export interface CrewHoursMetrics {
  crewMemberId: string;
  totalCostUSD: number;
  totalTokens: number;
  estimatedHours: number; // Derived from tokens + model
  costPerHour: number;
  costPerStoryPoint: number; // If story linked
  modelsUsed: string[]; // Which OpenRouter models invoked
}

/**
 * RAG Velocity Observation
 */
export interface RagVelocityObservation {
  observationId: string;
  crewMemberId: string;
  topic: 'velocity' | 'risk' | 'dependency' | 'quality';
  content: string;
  tags: string[];
  createdAt: Date;
  relatedStories: string[]; // Story references
}

/**
 * Story Risk Flag
 */
export interface StoryRiskFlag {
  storyId: string;
  timePercentage: number; // % of estimated time elapsed
  estimatedProgress: number; // % complete (0-100)
  recommendation: string;
  escalationTo: string; // Crew member
  escalationLevel: 'warning' | 'critical';
  flaggedAt: Date;
  resolvedAt?: Date;
}

export const CREW_BASELINE_CAPACITY_HOURS_PER_DAY = 6; // 8h - meetings/admin
export const WORKING_DAYS_PER_WEEK = 5;
export const TOKEN_PER_HOUR = 150000; // Heuristic for token→hours conversion
