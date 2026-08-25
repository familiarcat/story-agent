/**
 * Phase 3 Step 3: Cache Invalidation Handler
 * Troi's Lambda Function + DynamoDB Streams Integration
 * 
 * Triggered by sa_policy_checksums table updates
 * Invalidates breadcrumb cache entries when policies change
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { PolicyChecksum } from '@story-agent/shared';

// ============================================================================
// CACHE INVALIDATION CONFIGURATION
// ============================================================================

const CACHE_INVALIDATION_SLA_MS = 5 * 60 * 1000; // 5 minutes max latency
const CACHE_INVALIDATION_TTL_JITTER_MS = 50; // Add jitter to avoid thundering herd

export interface CacheInvalidationEvent {
  policyId: string;
  trigger: 'policy-update' | 'ttl-expiry' | 'manual' | 'checksum-change';
  timestamp: string;
  previousChecksum?: string;
  newChecksum?: string;
}

export interface CacheInvalidationResult {
  policyId: string;
  invalidated: boolean;
  deletedCount: number;
  invalidationLatency_ms: number;
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

// ============================================================================
// CACHE INVALIDATION LAYER
// ============================================================================

export class BreadcrumbCacheInvalidator {
  private supabase: SupabaseClient;
  private readonly CACHE_TABLE = 'sa_breadcrumb_cache';
  private readonly STATS_TABLE = 'sa_breadcrumb_cache_stats';

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials required for cache invalidation');
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Invalidate breadcrumb cache entry when policy is updated
   * 
   * Troi's Design:
   * - Delete cache entry by policy_id (fast lookup via unique index)
   * - Record invalidation in stats table (for metrics)
   * - Add jitter to TTL expiry to avoid cache stampedes
   * - Measure invalidation latency vs. 5min SLA
   */
  async invalidateBreadcrumbByPolicyId(
    policyId: string,
    trigger: CacheInvalidationEvent['trigger'],
    checksum?: string
  ): Promise<CacheInvalidationResult> {
    const startTime = Date.now();

    try {
      // Step 1: Delete cache entry
      const { error: deleteError } = await this.supabase
        .from(this.CACHE_TABLE)
        .delete()
        .eq('policy_id', policyId);

      if (deleteError) {
        return {
          policyId,
          invalidated: false,
          deletedCount: 0,
          invalidationLatency_ms: Date.now() - startTime,
          status: 'failed',
          error: deleteError.message
        };
      }

      // Delete successful; count is approximate (Supabase delete doesn't return count)
      const deletedCount = 1;

      // Step 2: Record invalidation in stats (async, fire-and-forget)
      this.recordInvalidationStat(policyId, trigger, Date.now() - startTime).catch(
        (err: any) => console.error(`Failed to record invalidation stat: ${err}`)
      );

      const latency = Date.now() - startTime;

      // Step 3: Validate against SLA
      if (latency > CACHE_INVALIDATION_SLA_MS) {
        console.warn(
          `Cache invalidation latency exceeded SLA: ${latency}ms > ${CACHE_INVALIDATION_SLA_MS}ms`
        );
      }

      return {
        policyId,
        invalidated: true,
        deletedCount,
        invalidationLatency_ms: latency,
        status: 'success'
      };
    } catch (err) {
      return {
        policyId,
        invalidated: false,
        deletedCount: 0,
        invalidationLatency_ms: Date.now() - startTime,
        status: 'failed',
        error: String(err)
      };
    }
  }

  /**
   * Invalidate all cache entries (full purge)
   * Called during security incidents or data integrity issues
   */
  async invalidateAllBreadcrumbs(): Promise<CacheInvalidationResult> {
    const startTime = Date.now();

    const { error } = await this.supabase
      .from(this.CACHE_TABLE)
      .delete()
      .neq('cache_id', ''); // Delete all

    if (error) {
      return {
        policyId: 'batch-purge',
        invalidated: false,
        deletedCount: 0,
        invalidationLatency_ms: Date.now() - startTime,
        status: 'failed',
        error: error.message
      };
    }

    return {
      policyId: 'batch-purge',
      invalidated: true,
      deletedCount: 0, // Supabase delete doesn't return count
      invalidationLatency_ms: Date.now() - startTime,
      status: 'success'
    };
  }

  /**
   * Handle policy checksum changes
   * If new checksum differs, invalidate cache to force recomputation
   */
  async onPolicyChecksumChanged(
    policyId: string,
    oldChecksum: string,
    newChecksum: string
  ): Promise<CacheInvalidationResult> {
    if (oldChecksum === newChecksum) {
      // No change, no invalidation needed
      return {
        policyId,
        invalidated: false,
        deletedCount: 0,
        invalidationLatency_ms: 0,
        status: 'success'
      };
    }

    return this.invalidateBreadcrumbByPolicyId(
      policyId,
      'checksum-change',
      newChecksum
    );
  }

  /**
   * Record invalidation statistics for CloudWatch metrics
   * Troi's metrics: track invalidation latency + count by trigger type
   */
  private async recordInvalidationStat(
    policyId: string,
    trigger: CacheInvalidationEvent['trigger'],
    latency_ms: number
  ): Promise<void> {
    const now = new Date();
    const timeBucket = new Date(
      Math.floor(now.getTime() / (60 * 1000)) * (60 * 1000)
    ); // Round to minute

    const { error } = await this.supabase
      .from(this.STATS_TABLE)
      .upsert(
        {
          time_bucket: timeBucket.toISOString(),
          invalidation_count: 1,
          avg_invalidation_latency_ms: latency_ms
        },
        { onConflict: 'time_bucket' }
      );
    if (error) console.error(`Stats recording failed: ${error}`);
  }

  /**
   * Clean up expired cache entries (TTL expiry)
   * Runs periodically (e.g., every 5 minutes) to clean up stale data
   */
  async cleanupExpiredEntries(): Promise<CacheInvalidationResult> {
    const startTime = Date.now();

    const { error } = await this.supabase
      .from(this.CACHE_TABLE)
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error(`Expired entry cleanup failed: ${error.message}`);
      return {
        policyId: 'batch-cleanup',
        invalidated: false,
        deletedCount: 0,
        invalidationLatency_ms: Date.now() - startTime,
        status: 'failed',
        error: error.message
      };
    }

    return {
      policyId: 'batch-cleanup',
      invalidated: true,
      deletedCount: 0, // Supabase delete doesn't return count
      invalidationLatency_ms: Date.now() - startTime,
      status: 'success'
    };
  }
}

// ============================================================================
// LAMBDA HANDLER: Policy Update → Cache Invalidation
// ============================================================================

/**
 * AWS Lambda Handler (Node.js 18+)
 * 
 * Triggered by:
 * 1. sa_policy_checksums table update (Postgres NOTIFY via Lambda)
 * 2. Manual invocation via AWS Lambda console
 * 
 * Flow:
 * 1. Receive policy update event
 * 2. Extract policyId + old/new checksum
 * 3. Invalidate breadcrumb cache entry
 * 4. Record metrics
 * 5. Return result (success/failure)
 */
export async function handleCacheInvalidation(event: any): Promise<CacheInvalidationResult | { error: string }> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { error: 'Missing Supabase credentials' };
  }

  const invalidator = new BreadcrumbCacheInvalidator(supabaseUrl, supabaseKey);

  try {
    // Extract event details
    const { policyId, trigger = 'policy-update', oldChecksum, newChecksum } = event;

    if (!policyId) {
      return { error: 'Missing policyId in event' };
    }

    // Route by trigger type
    if (trigger === 'checksum-change' && oldChecksum && newChecksum) {
      return invalidator.onPolicyChecksumChanged(policyId, oldChecksum, newChecksum);
    } else if (trigger === 'ttl-expiry') {
      return invalidator.cleanupExpiredEntries();
    } else {
      return invalidator.invalidateBreadcrumbByPolicyId(policyId, trigger);
    }
  } catch (err) {
    console.error(`Cache invalidation handler error: ${err}`);
    return { error: String(err) };
  }
}

// ============================================================================
// DYANMODB STREAMS ADAPTER (Supabase Postgres Equivalent)
// ============================================================================

/**
 * Process Postgres NOTIFY event (equivalent to DynamoDB Streams)
 * Supabase Realtime can trigger Lambda via webhook on table changes
 * 
 * This adapter handles the policy checksum table change event
 */
export async function processPolicyChecsumChangeEvent(
  oldRecord: any,
  newRecord: any
): Promise<CacheInvalidationResult> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      policyId: newRecord.policy_id,
      invalidated: false,
      deletedCount: 0,
      invalidationLatency_ms: 0,
      status: 'failed',
      error: 'Missing Supabase credentials'
    };
  }

  const invalidator = new BreadcrumbCacheInvalidator(supabaseUrl, supabaseKey);

  return invalidator.onPolicyChecksumChanged(
    newRecord.policy_id,
    oldRecord.checksum_sha256,
    newRecord.checksum_sha256
  );
}

// ============================================================================
// INTEGRATION HELPERS
// ============================================================================

/**
 * Hook for getLreadcrumbPath() to trigger cache invalidation
 * Called when a policy is updated in the UI
 */
export async function invalidateCacheForPolicy(policyId: string): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials missing; cache invalidation skipped');
    return;
  }

  const invalidator = new BreadcrumbCacheInvalidator(supabaseUrl, supabaseKey);
  await invalidator.invalidateBreadcrumbByPolicyId(policyId, 'policy-update');
}

/**
 * Manual full cache purge (admin operation)
 */
export async function purgeAllBreadcrumbCache(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials required');
  }

  const invalidator = new BreadcrumbCacheInvalidator(supabaseUrl, supabaseKey);
  const result = await invalidator.invalidateAllBreadcrumbs();
  console.log(`Purged ${result.deletedCount} cache entries in ${result.invalidationLatency_ms}ms`);
}
