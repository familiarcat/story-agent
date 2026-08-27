/**
 * Redis Cache Layer for PM Entities
 * Provides efficient caching for frequently accessed entities and state machine lookups
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 300s)
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * In-memory cache implementation (production should use Redis/Upstash)
 * This provides the interface for both in-memory and Redis implementations
 */
class InMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timer | null = null;

  constructor() {
    // Cleanup expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    const age = (Date.now() - entry.timestamp) / 1000;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl ?? 300;
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Clear pattern from cache (e.g., "sprints:tenant-1:*")
   */
  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp(`^${pattern.replace('*', '.*')}$`);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const age = (now - entry.timestamp) / 1000;
      if (age > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Destroy cache (cleanup on shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval as any);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

/**
 * PM Cache Manager
 * Manages caching for Sprint, Story, and Task entities
 */
export class PMCacheManager {
  private cache: InMemoryCache;

  constructor() {
    this.cache = new InMemoryCache();
  }

  // ===== SPRINT CACHE =====

  /**
   * Get cached sprint
   */
  async getSprint(tenantId: string, sprintId: string): Promise<any | null> {
    return this.cache.get(`sprint:${tenantId}:${sprintId}`);
  }

  /**
   * Cache a sprint
   */
  async cacheSprint(tenantId: string, sprintId: string, sprint: any): Promise<void> {
    await this.cache.set(`sprint:${tenantId}:${sprintId}`, sprint, { ttl: 300 });
  }

  /**
   * Invalidate sprint cache
   */
  async invalidateSprint(tenantId: string, sprintId: string): Promise<void> {
    await this.cache.delete(`sprint:${tenantId}:${sprintId}`);
    // Also invalidate list cache for this tenant
    await this.cache.deletePattern(`sprints:${tenantId}:*`);
  }

  /**
   * Get cached sprint list
   */
  async getSprintList(tenantId: string, state?: string, limit?: number, offset?: number): Promise<any | null> {
    const key = `sprints:${tenantId}:${state || 'all'}:${limit || 20}:${offset || 0}`;
    return this.cache.get(key);
  }

  /**
   * Cache sprint list
   */
  async cacheSprintList(
    tenantId: string,
    sprints: any[],
    state?: string,
    limit?: number,
    offset?: number
  ): Promise<void> {
    const key = `sprints:${tenantId}:${state || 'all'}:${limit || 20}:${offset || 0}`;
    await this.cache.set(key, sprints, { ttl: 60 }); // Shorter TTL for lists
  }

  // ===== STORY CACHE =====

  /**
   * Get cached story
   */
  async getStory(tenantId: string, storyId: string): Promise<any | null> {
    return this.cache.get(`story:${tenantId}:${storyId}`);
  }

  /**
   * Cache a story
   */
  async cacheStory(tenantId: string, storyId: string, story: any): Promise<void> {
    await this.cache.set(`story:${tenantId}:${storyId}`, story, { ttl: 300 });
  }

  /**
   * Invalidate story cache
   */
  async invalidateStory(tenantId: string, storyId: string, sprintId?: string): Promise<void> {
    await this.cache.delete(`story:${tenantId}:${storyId}`);
    // Invalidate sprint detail cache
    if (sprintId) {
      await this.cache.deletePattern(`sprint:${tenantId}:${sprintId}`);
    }
    // Invalidate story list cache
    await this.cache.deletePattern(`stories:${tenantId}:*`);
  }

  /**
   * Get cached story list
   */
  async getStoryList(tenantId: string, sprintId?: string, state?: string): Promise<any | null> {
    const key = `stories:${tenantId}:${sprintId || 'all'}:${state || 'all'}`;
    return this.cache.get(key);
  }

  /**
   * Cache story list
   */
  async cacheStoryList(
    tenantId: string,
    stories: any[],
    sprintId?: string,
    state?: string
  ): Promise<void> {
    const key = `stories:${tenantId}:${sprintId || 'all'}:${state || 'all'}`;
    await this.cache.set(key, stories, { ttl: 60 });
  }

  // ===== TASK CACHE =====

  /**
   * Get cached task
   */
  async getTask(tenantId: string, taskId: string): Promise<any | null> {
    return this.cache.get(`task:${tenantId}:${taskId}`);
  }

  /**
   * Cache a task
   */
  async cacheTask(tenantId: string, taskId: string, task: any): Promise<void> {
    await this.cache.set(`task:${tenantId}:${taskId}`, task, { ttl: 300 });
  }

  /**
   * Invalidate task cache
   */
  async invalidateTask(tenantId: string, taskId: string, storyId?: string): Promise<void> {
    await this.cache.delete(`task:${tenantId}:${taskId}`);
    // Invalidate story detail cache
    if (storyId) {
      await this.cache.deletePattern(`story:${tenantId}:${storyId}`);
    }
    // Invalidate task list cache
    await this.cache.deletePattern(`tasks:${tenantId}:*`);
  }

  /**
   * Get cached task list
   */
  async getTaskList(tenantId: string, storyId?: string, state?: string): Promise<any | null> {
    const key = `tasks:${tenantId}:${storyId || 'all'}:${state || 'all'}`;
    return this.cache.get(key);
  }

  /**
   * Cache task list
   */
  async cacheTaskList(
    tenantId: string,
    tasks: any[],
    storyId?: string,
    state?: string
  ): Promise<void> {
    const key = `tasks:${tenantId}:${storyId || 'all'}:${state || 'all'}`;
    await this.cache.set(key, tasks, { ttl: 60 });
  }

  // ===== TENANT-WIDE INVALIDATION =====

  /**
   * Invalidate all caches for a tenant
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    await this.cache.deletePattern(`sprint:${tenantId}:*`);
    await this.cache.deletePattern(`sprints:${tenantId}:*`);
    await this.cache.deletePattern(`story:${tenantId}:*`);
    await this.cache.deletePattern(`stories:${tenantId}:*`);
    await this.cache.deletePattern(`task:${tenantId}:*`);
    await this.cache.deletePattern(`tasks:${tenantId}:*`);
  }

  /**
   * Destroy cache on shutdown
   */
  destroy(): void {
    this.cache.destroy();
  }
}

// Singleton instance
let cacheManager: PMCacheManager | null = null;

/**
 * Get or create the cache manager singleton
 */
export function getCacheManager(): PMCacheManager {
  if (!cacheManager) {
    cacheManager = new PMCacheManager();
  }
  return cacheManager;
}

/**
 * Initialize cache manager (for testing)
 */
export function initializeCacheManager(): PMCacheManager {
  if (cacheManager) {
    cacheManager.destroy();
  }
  cacheManager = new PMCacheManager();
  return cacheManager;
}
