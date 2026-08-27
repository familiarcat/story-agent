/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Redis Cache Manager
 * 
 * Production-ready cache implementation with Redis support
 * Falls back to in-memory cache if Redis unavailable
 */

export interface CacheOptions {
  ttl?: number; // TTL in seconds
  namespace?: string; // Key namespace
}

export interface CacheBackend {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
  invalidate(): Promise<void>;
  health(): Promise<boolean>;
}

/**
 * Redis Cache Backend
 * Requires REDIS_URL or UPSTASH_REDIS_REST_URL
 */
export class RedisCache implements CacheBackend {
  private url: string;
  private token?: string;
  private connected: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Support Upstash Redis REST API
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      this.url = upstashUrl;
      this.token = upstashToken;
      this.initHealthCheck();
    } else {
      throw new Error(
        'Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN'
      );
    }
  }

  private initHealthCheck(): void {
    // Check Redis connection every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.health().catch((err) => {
        console.error('[Redis] Health check failed:', err.message);
        this.connected = false;
      });
    }, 30000);
  }

  async get(key: string): Promise<any> {
    try {
      const response = await fetch(`${this.url}/get/${key}`, {
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Redis GET failed: ${response.status}`);
      }

      const data = await response.json();
      this.connected = true;
      return data.result ? JSON.parse(data.result) : null;
    } catch (err) {
      console.error('[Redis] GET error:', err);
      this.connected = false;
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      const command = ttl
        ? ['SET', key, jsonValue, 'EX', ttl.toString()]
        : ['SET', key, jsonValue];

      const response = await fetch(`${this.url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
        },
        body: JSON.stringify({ commands: [command] }),
      });

      if (!response.ok) {
        throw new Error(`Redis SET failed: ${response.status}`);
      }

      this.connected = true;
    } catch (err) {
      console.error('[Redis] SET error:', err);
      this.connected = false;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const response = await fetch(`${this.url}/del/${key}`, {
        method: 'DELETE',
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Redis DEL failed: ${response.status}`);
      }

      this.connected = true;
    } catch (err) {
      console.error('[Redis] DEL error:', err);
      this.connected = false;
      throw err;
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      // Use SCAN + DEL for pattern matching
      const keysResponse = await fetch(`${this.url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
        },
        body: JSON.stringify({
          commands: [['SCAN', '0', 'MATCH', pattern]],
        }),
      });

      if (!keysResponse.ok) {
        throw new Error(`Redis SCAN failed: ${keysResponse.status}`);
      }

      const keysData = await keysResponse.json();
      const keys = keysData.result?.[1] ?? [];

      if (keys.length > 0) {
        await fetch(`${this.url}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.token && { Authorization: `Bearer ${this.token}` }),
          },
          body: JSON.stringify({
            commands: [['DEL', ...keys]],
          }),
        });
      }

      this.connected = true;
    } catch (err) {
      console.error('[Redis] Pattern delete error:', err);
      this.connected = false;
      throw err;
    }
  }

  async invalidate(): Promise<void> {
    try {
      const response = await fetch(`${this.url}/flushdb`, {
        method: 'POST',
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Redis FLUSHDB failed: ${response.status}`);
      }

      this.connected = true;
    } catch (err) {
      console.error('[Redis] FLUSHDB error:', err);
      this.connected = false;
      throw err;
    }
  }

  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.url}/ping`, {
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      });

      this.connected = response.ok;
      return response.ok;
    } catch (err) {
      this.connected = false;
      return false;
    }
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

/**
 * In-Memory Cache Backend (fallback)
 */
export class InMemoryCache implements CacheBackend {
  private cache = new Map<string, { value: any; expiry: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiry < now) {
          this.cache.delete(key);
        }
      }
    }, 60000);
  }

  async get(key: string): Promise<any> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    const expiry = Date.now() + ttl * 1000;
    this.cache.set(key, { value, expiry });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async invalidate(): Promise<void> {
    this.cache.clear();
  }

  async health(): Promise<boolean> {
    return true;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

/**
 * Cache Manager - selects Redis or fallback to in-memory
 */
export class CacheManager {
  private backend: CacheBackend;

  constructor() {
    try {
      // Try to initialize Redis
      this.backend = new RedisCache();
      console.log('[Cache] Using Redis backend');
    } catch (err) {
      // Fallback to in-memory
      console.warn('[Cache] Redis unavailable, using in-memory fallback:', err);
      this.backend = new InMemoryCache();
    }
  }

  async get(key: string): Promise<any> {
    return this.backend.get(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    return this.backend.set(key, value, ttl);
  }

  async delete(key: string): Promise<void> {
    return this.backend.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    return this.backend.deletePattern(pattern);
  }

  async invalidate(): Promise<void> {
    return this.backend.invalidate();
  }

  async health(): Promise<boolean> {
    return this.backend.health();
  }

  destroy(): void {
    if (this.backend && 'destroy' in this.backend) {
      (this.backend as any).destroy();
    }
  }
}

// Singleton instance
let cacheManager: CacheManager | null = null;

export function initializeCacheManager(): void {
  if (!cacheManager) {
    cacheManager = new CacheManager();
  }
}

export function getCacheManagerInstance(): CacheManager {
  if (!cacheManager) {
    initializeCacheManager();
  }
  return cacheManager!;
}
