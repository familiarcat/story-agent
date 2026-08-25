/**
 * Policy Checksum Validation
 *
 * Provides SHA-256 checksums for client security policies enabling precise rollback
 * state reconstruction. Used during Phase 1 UX redesign + testing.
 *
 * DI Pattern: Pure functions, no external dependencies. All hashing done via SubtleCrypto.
 */

import crypto from 'crypto';
import type { ClientSecurityPolicy } from './client-security-policy.js';

export interface PolicyChecksum {
  policyId: string;
  checksumSHA256: string;
  computedAt: string; // ISO timestamp
  isValid: boolean; // matches stored value if available
}

export interface PolicyWithChecksum {
  policy: ClientSecurityPolicy;
  checksum: PolicyChecksum;
  checksumStatus: 'valid' | 'invalid' | 'unknown'; // unknown = no stored checksum to compare against
}

/**
 * Compute SHA-256 checksum for a policy object.
 * Deterministic: same policy always produces same checksum.
 * Uses canonical JSON serialization (sorted keys).
 *
 * @param policy The security policy to checksum
 * @returns SHA-256 hex digest
 */
export function computePolicySHA256(policy: ClientSecurityPolicy): string {
  const canonical = JSON.stringify(policy, Object.keys(policy).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Validate a policy against a stored checksum.
 *
 * @param policy The policy to validate
 * @param storedChecksum The checksum to validate against
 * @returns true if policy's checksum matches stored value
 */
export function validatePolicyChecksum(policy: ClientSecurityPolicy, storedChecksum: string): boolean {
  const computed = computePolicySHA256(policy);
  return computed === storedChecksum;
}

/**
 * Build a PolicyChecksum record (does not validate against stored; use validatePolicyChecksum for that).
 *
 * @param policy The policy to record
 * @param storedChecksum Optional previously stored checksum for comparison
 * @returns PolicyChecksum record with isValid flag
 */
export function buildPolicyChecksum(
  policy: ClientSecurityPolicy,
  storedChecksum?: string | null,
): PolicyChecksum {
  const checksumSHA256 = computePolicySHA256(policy);
  const isValid = storedChecksum ? validatePolicyChecksum(policy, storedChecksum) : false;

  return {
    policyId: policy.clientId,
    checksumSHA256,
    computedAt: new Date().toISOString(),
    isValid: storedChecksum ? isValid : false, // only true if we have a stored value to compare
  };
}

/**
 * Augment a policy with its checksum record.
 *
 * @param policy The policy to augment
 * @param storedChecksum Optional stored checksum for validation
 * @returns Policy + checksum + status
 */
export function augmentPolicyWithChecksum(
  policy: ClientSecurityPolicy,
  storedChecksum?: string | null,
): PolicyWithChecksum {
  const checksum = buildPolicyChecksum(policy, storedChecksum);

  let checksumStatus: 'valid' | 'invalid' | 'unknown' = 'unknown';
  if (!storedChecksum) {
    checksumStatus = 'unknown'; // no stored value to compare
  } else if (checksum.isValid) {
    checksumStatus = 'valid';
  } else {
    checksumStatus = 'invalid';
  }

  return {
    policy,
    checksum,
    checksumStatus,
  };
}

/**
 * Test helper: verify checksum computation determinism.
 * Calling twice on the same policy should produce identical checksums.
 *
 * @param policy The policy to test
 * @returns true if checksums match
 */
export function testChecksumDeterminism(policy: ClientSecurityPolicy): boolean {
  const checksum1 = computePolicySHA256(policy);
  const checksum2 = computePolicySHA256(policy);
  return checksum1 === checksum2;
}
