/**
 * Velocity Cache System — Hot/Warm/Cold Layers
 * 
 * Orchestrates in-memory, Redis (optional), and Supabase storage
 * for fast velocity metric retrieval and historical analysis.
 */

import type {
  AggregatedMetrics,
  CrewMemberVelocityProfile,
  FeatureTypeVelocity,
  SprintForecast,
  TrendAnalysis,
  VelocitySnapshot,
} from './velocity-metrics';

/**
 * Hot Cache (In-Memory)
 * Stores last 2 hours of velocity snapshots for sub-second queries
 */
export class HotVelocityCache {
  private cache = new Map<string, AggregatedMetrics>();
  private ttlMap = new Map<string, number>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private ttlSeconds: number = 7200) {
    // Auto-cleanup every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  set(key: string, value: AggregatedMetrics): void {
    this.cache.set(key, value);
    this.ttlMap.set(key, Date.now() + this.ttlSeconds * 1000);
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

  private cleanup(): void {
    const now = Date.now();
    for (const [key, expiry] of this.ttlMap.entries()) {
      if (expiry < now) {
        this.cache.delete(key);
        this.ttlMap.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.ttlMap.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }

  getStats() {
    return {
      entriesCount: this.cache.size,
      ttlSeconds: this.ttlSeconds,
    };
  }
}

/**
 * Warm Cache (Redis - Optional)
 * Stores last 7 days of snapshots for faster retrieval than DB
 * Falls back gracefully if Redis unavailable
 */
export class WarmVelocityCache {
  private client: any; // RedisClient from redis package
  private ttlSeconds = 604800; // 7 days

  constructor(client?: any) {
    this.client = client;
  }

  async set(key: string, value: AggregatedMetrics): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(key, this.ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.warn('[WarmVelocityCache] Failed to set:', error);
      // Fail silently — fallback to cold cache
    }
  }

  async get(key: string): Promise<AggregatedMetrics | null> {
    if (!this.client) return null;
    try {
      const cached = await this.client.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('[WarmVelocityCache] Failed to get:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      console.warn('[WarmVelocityCache] Failed to delete:', error);
    }
  }

  async flush(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.flushdb();
    } catch (error) {
      console.warn('[WarmVelocityCache] Failed to flush:', error);
    }
  }

  isConnected(): boolean {
    return !!this.client;
  }
}

/**
 * Cold Storage (Supabase)
 * Historical velocity snapshots for long-term trend analysis
 */
export class ColdVelocityCache {
  constructor(private db: any) {} // Supabase client

  async store(snapshot: VelocitySnapshot): Promise<void> {
    if (!this.db) throw new Error('Database client not initialized');

    const { error } = await this.db.from('sa_velocity_snapshots').upsert({
      id: snapshot.id,
      snapshot_timestamp: snapshot.snapshotTimestamp,
      sprint_id: snapshot.sprintId,
      release_id: snapshot.releaseId || null,
      crew_member_id: snapshot.crewMemberId || null,
      feature_type: snapshot.featureType || null,
      story_points_completed: snapshot.storyPointsCompleted,
      cycle_time_hours: snapshot.cycleTimeHours,
      completion_rate: snapshot.completionRate,
      blocked_hours: snapshot.blockedHours,
      current_velocity_points_per_hour: snapshot.currentVelocity,
      remaining_points: snapshot.remainingPoints,
      forecast_hours_to_completion: snapshot.forecastHoursToCompletion,
      forecast_completion_date: snapshot.forecastCompletionDate,
      confidence_50_date: snapshot.confidence50Date,
      confidence_80_date: snapshot.confidence80Date,
      confidence_95_date: snapshot.confidence95Date,
      identified_blockers: snapshot.identifiedBlockers,
      scope_creep_delta: snapshot.scopeCreepDelta,
      quality_rework_estimate: snapshot.reworkEstimate,
      metrics_json: snapshot.metricsJson,
      created_at: snapshot.createdAt,
      updated_at: snapshot.updatedAt,
    });

    if (error) throw error;
  }

  async query(sprintId: string, limit: number = 10): Promise<VelocitySnapshot[]> {
    if (!this.db) throw new Error('Database client not initialized');

    const { data, error } = await this.db
      .from('sa_velocity_snapshots')
      .select('*')
      .eq('sprint_id', sprintId)
      .order('snapshot_timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      snapshotTimestamp: new Date(row.snapshot_timestamp),
      sprintId: row.sprint_id,
      releaseId: row.release_id,
      crewMemberId: row.crew_member_id,
      featureType: row.feature_type,
      storyPointsCompleted: row.story_points_completed,
      cycleTimeHours: row.cycle_time_hours,
      completionRate: row.completion_rate,
      blockedHours: row.blocked_hours,
      currentVelocity: row.current_velocity_points_per_hour,
      remainingPoints: row.remaining_points,
      forecastHoursToCompletion: row.forecast_hours_to_completion,
      forecastCompletionDate: new Date(row.forecast_completion_date),
      confidence50Date: new Date(row.confidence_50_date),
      confidence80Date: new Date(row.confidence_80_date),
      confidence95Date: new Date(row.confidence_95_date),
      identifiedBlockers: row.identified_blockers,
      scopeCreepDelta: row.scope_creep_delta,
      reworkEstimate: row.quality_rework_estimate,
      metricsJson: row.metrics_json,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  async trendAnalysis(sprintId: string, lookbackDays: number = 14): Promise<TrendAnalysis> {
    if (!this.db) throw new Error('Database client not initialized');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

    const { data, error } = await this.db
      .from('sa_velocity_snapshots')
      .select('metrics_json, snapshot_timestamp')
      .eq('sprint_id', sprintId)
      .is('crew_member_id', null) // Sprint-level (not crew-specific)
      .gte('snapshot_timestamp', cutoffDate.toISOString())
      .order('snapshot_timestamp', { ascending: false });

    if (error) throw error;

    const snapshots: VelocitySnapshot[] = (data || []).map((row: any) =>
      JSON.parse(row.metrics_json)
    );

    if (snapshots.length < 2) {
      return { trend: 'insufficient_data', percentChange: 0, snapshots };
    }

    const velocities = snapshots.map((s) => s.currentVelocity);
    const earliest = velocities[velocities.length - 1];
    const latest = velocities[0];
    const percentChange = ((latest - earliest) / earliest) * 100;

    return {
      trend: percentChange > 5 ? 'improving' : percentChange < -5 ? 'degrading' : 'stable',
      percentChange,
      snapshots,
    };
  }

  async getLatestPerCrew(
    sprintId: string
  ): Promise<Map<string, VelocitySnapshot>> {
    if (!this.db) throw new Error('Database client not initialized');

    const { data, error } = await this.db
      .from('sa_velocity_snapshots')
      .select('*')
      .eq('sprint_id', sprintId)
      .not('crew_member_id', 'is', null)
      .order('snapshot_timestamp', { ascending: false })
      .limit(100); // Fetch last 100, then filter to latest per crew

    if (error) throw error;

    const latestPerCrew = new Map<string, VelocitySnapshot>();
    for (const row of data || []) {
      if (!latestPerCrew.has(row.crew_member_id)) {
        latestPerCrew.set(row.crew_member_id, this.rowToSnapshot(row));
      }
    }

    return latestPerCrew;
  }

  private rowToSnapshot(row: any): VelocitySnapshot {
    return {
      id: row.id,
      snapshotTimestamp: new Date(row.snapshot_timestamp),
      sprintId: row.sprint_id,
      releaseId: row.release_id,
      crewMemberId: row.crew_member_id,
      featureType: row.feature_type,
      storyPointsCompleted: row.story_points_completed,
      cycleTimeHours: row.cycle_time_hours,
      completionRate: row.completion_rate,
      blockedHours: row.blocked_hours,
      currentVelocity: row.current_velocity_points_per_hour,
      remainingPoints: row.remaining_points,
      forecastHoursToCompletion: row.forecast_hours_to_completion,
      forecastCompletionDate: new Date(row.forecast_completion_date),
      confidence50Date: new Date(row.confidence_50_date),
      confidence80Date: new Date(row.confidence_80_date),
      confidence95Date: new Date(row.confidence_95_date),
      identifiedBlockers: row.identified_blockers,
      scopeCreepDelta: row.scope_creep_delta,
      reworkEstimate: row.quality_rework_estimate,
      metricsJson: row.metrics_json,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

/**
 * Velocity Cache Manager
 * Orchestrates hot/warm/cold cache layers
 */
export class VelocityCacheManager {
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
    if (hotData) {
      const profile = hotData.crewMemberVelocities.find((c) => c.crewMemberId === crewId);
      if (profile) return profile;
    }

    // 2. Check warm cache
    const warmData = await this.warmCache.get(key);
    if (warmData) {
      this.hotCache.set(key, warmData); // Promote to hot
      return warmData.crewMemberVelocities.find((c) => c.crewMemberId === crewId) || null;
    }

    // 3. Query cold storage (last snapshot)
    // TODO: Implement when DB integration available
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
    // TODO: Implement when DB integration available
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

    // Query cold storage (returns AggregatedMetrics)
    const metrics = await this.coldCache.trendAnalysis(sprintId, lookbackDays);

    // Convert AggregatedMetrics to TrendAnalysis
    const trend: TrendAnalysis = {
      trend: 'stable', // TODO: compute from metrics.sprintVelocity trends
      percentChange: 0, // TODO: compute from historical velocity
      snapshots: [], // TODO: extract from metrics if available
    };

    // Cache result for 1 hour
    // (Note: warm cache expects AggregatedMetrics, so we'll skip caching the trend here)

    return trend;
  }

  /**
   * Store new snapshot (writes to all layers)
   */
  async storeSnapshot(
    metrics: AggregatedMetrics,
    sprintId: string,
    releaseId?: string
  ): Promise<void> {
    const key = `sprint:${sprintId}:snapshot:${Date.now()}`;

    // 1. Hot cache (immediate)
    this.hotCache.set(key, metrics);

    // 2. Warm cache (if available)
    await this.warmCache.set(key, metrics);

    // 3. Cold storage (persistent)
    // Store sprint-level snapshot
    const sprintSnapshot: VelocitySnapshot = {
      id: crypto.randomUUID?.() || `snap-${Date.now()}`,
      snapshotTimestamp: new Date(),
      sprintId,
      releaseId,
      crewMemberId: undefined,
      featureType: undefined,
      storyPointsCompleted: metrics.sprintVelocity.totalStoryPointsCompleted,
      cycleTimeHours: metrics.sprintVelocity.avgCycleTime,
      completionRate: metrics.sprintVelocity.completionRate,
      blockedHours: metrics.sprintVelocity.identifiedBlockers.reduce((sum, b) => sum + b.hoursBlocked, 0),
      currentVelocity: metrics.sprintVelocity.totalStoryPointsCompleted /
        Math.max(
          (new Date().getTime() - metrics.sprintVelocity.metadata.startDate.getTime()) / (1000 * 60 * 60),
          1
        ),
      remainingPoints: 0, // TODO: Calculate from remaining work
      forecastHoursToCompletion: metrics.forecastSprint.forecastHoursToCompletion,
      forecastCompletionDate: metrics.forecastSprint.estimate80.completionDate,
      confidence50Date: metrics.forecastSprint.estimate50.completionDate,
      confidence80Date: metrics.forecastSprint.estimate80.completionDate,
      confidence95Date: metrics.forecastSprint.estimate95.completionDate,
      identifiedBlockers: metrics.sprintVelocity.identifiedBlockers,
      scopeCreepDelta: metrics.sprintVelocity.scopeCreepDelta,
      reworkEstimate: metrics.sprintVelocity.reworkEstimate,
      metricsJson: metrics,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.coldCache.store(sprintSnapshot);

    // Store per-crew snapshots
    for (const crew of metrics.crewMemberVelocities) {
      const crewSnapshot: VelocitySnapshot = {
        id: crypto.randomUUID?.() || `snap-${Date.now()}-${crew.crewMemberId}`,
        snapshotTimestamp: new Date(),
        sprintId,
        releaseId,
        crewMemberId: crew.crewMemberId,
        featureType: undefined,
        storyPointsCompleted: 0, // Would be calculated per crew
        cycleTimeHours: crew.averageCycleTimeHours,
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
        reworkEstimate: crew.reworkRate,
        metricsJson: { crewMemberVelocities: [crew] },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.coldCache.store(crewSnapshot);
    }
  }

  /**
   * Get hot cache statistics
   */
  getHotCacheStats() {
    return this.hotCache.getStats();
  }

  /**
   * Get warm cache status
   */
  getWarmCacheStatus() {
    return {
      connected: this.warmCache.isConnected(),
      ttlSeconds: 604800,
    };
  }

  /**
   * Flush all caches (use with caution)
   */
  async flushAll(): Promise<void> {
    this.hotCache.clear();
    await this.warmCache.flush();
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    this.hotCache.destroy();
  }
}

/**
 * Factory for cache manager initialization
 */
export function createVelocityCacheManager(
  db: any,
  redisClient?: any
): VelocityCacheManager {
  const hot = new HotVelocityCache();
  const warm = new WarmVelocityCache(redisClient);
  const cold = new ColdVelocityCache(db);

  return new VelocityCacheManager(hot, warm, cold);
}
