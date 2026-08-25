/**
 * Checksum Storage Layer (DI for Supabase persistence)
 * Phase 2: Enable checksum status transition from "unknown" → "valid/invalid"
 */

import { createClient } from '@supabase/supabase-js';
import { ClientSecurityPolicy } from './client-security-policy.js';
import { computePolicySHA256, PolicyChecksum } from './policy-checksum.js';

export interface StoredChecksum {
  policyId: string;
  checksumSHA256: string;
  computedAt: string; // ISO string from Supabase
  isValid: boolean;
  errorReason?: string | null;
}

/**
 * Get stored checksum from Supabase
 * Returns null if not found; gracefully handles storage unavailable
 */
export async function getStoredChecksum(
  policyId: string,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<StoredChecksum | null> {
  try {
    const url = supabaseUrl || process.env.SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_KEY;

    if (!url || !key) {
      console.warn('[checksum-storage] Supabase credentials missing; storage unavailable');
      return null;
    }

    const client = createClient(url, key);
    const { data, error } = await client
      .from('sa_policy_checksums')
      .select('policy_id, checksum_sha256, computed_at, is_valid, error_reason')
      .eq('policy_id', policyId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.warn('[checksum-storage] Retrieval error:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      policyId: data.policy_id,
      checksumSHA256: data.checksum_sha256,
      computedAt: data.computed_at, // Already ISO string from DB
      isValid: data.is_valid,
      errorReason: data.error_reason,
    };
  } catch (err) {
    console.warn('[checksum-storage] Exception during retrieval:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Store checksum result to Supabase
 * Returns true on success; false on error (graceful fallback enabled)
 */
export async function storeChecksumResult(
  policyId: string,
  checksum: PolicyChecksum,
  isValid: boolean,
  errorReason?: string | null,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<boolean> {
  try {
    const url = supabaseUrl || process.env.SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_KEY;

    if (!url || !key) {
      console.warn('[checksum-storage] Supabase credentials missing; cannot persist');
      return false;
    }

    const client = createClient(url, key);
    const { error } = await client.from('sa_policy_checksums').insert({
      policy_id: policyId,
      checksum_sha256: checksum.checksumSHA256,
      computed_at: new Date().toISOString(), // Use current time as ISO string
      is_valid: isValid,
      error_reason: errorReason || null,
    });

    if (error) {
      console.warn('[checksum-storage] Store error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[checksum-storage] Exception during store:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

/**
 * Compute and immediately store checksum result
 * Returns computed checksum + isValid flag
 * Graceful fallback: if storage fails, still returns computed value
 */
export async function computeAndStore(
  policyId: string,
  policy: ClientSecurityPolicy,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<{ checksum: PolicyChecksum; isValid: boolean }> {
  try {
    // Compute fresh checksum
    const checksumSHA256 = computePolicySHA256(policy);
    const computedAt = new Date().toISOString(); // Store as ISO string

    const checksum: PolicyChecksum = {
      policyId,
      checksumSHA256,
      computedAt, // ISO string format
      isValid: true, // Freshly computed checksums are valid by definition
    };

    // Attempt to store (graceful fallback if unavailable)
    await storeChecksumResult(policyId, checksum, true, null, supabaseUrl, supabaseKey);

    return { checksum, isValid: true };
  } catch (err) {
    console.error('[checksum-storage] Unexpected error in computeAndStore:', err);
    // Fallback: return computed value without storage
    const checksumSHA256 = computePolicySHA256(policy);
    return {
      checksum: {
        policyId,
        checksumSHA256,
        computedAt: new Date().toISOString(), // ISO string format
        isValid: true,
      },
      isValid: true,
    };
  }
}

/**
 * Lookup or compute checksum (DI workflow)
 * If stored: return stored result (valid/invalid status)
 * If not stored: compute fresh and store for next time
 */
export async function lookupOrComputeChecksum(
  policyId: string,
  policy: ClientSecurityPolicy,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<{ checksum: PolicyChecksum; checksumStatus: 'valid' | 'invalid' | 'unknown' }> {
  // Try to retrieve stored checksum first
  const stored = await getStoredChecksum(policyId, supabaseUrl, supabaseKey);

  if (stored) {
    return {
      checksum: {
        policyId: stored.policyId,
        checksumSHA256: stored.checksumSHA256,
        computedAt: stored.computedAt, // Already ISO string from DB
        isValid: stored.isValid,
      },
      checksumStatus: stored.isValid ? 'valid' : 'invalid',
    };
  }

  // Not stored: compute and store for next time
  const { checksum, isValid } = await computeAndStore(policyId, policy, supabaseUrl, supabaseKey);

  return {
    checksum,
    checksumStatus: isValid ? 'valid' : 'unknown', // Unknown because not yet verified
  };
}
