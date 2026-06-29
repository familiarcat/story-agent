import type { SecurityTier } from './client-security-policy.js';

/**
 * Business tier — the top conceptual grouping above clients (crew reorg; see
 * docs/architecture/hierarchy-and-entitlements.md). Distinct from the fine `SecurityTier`:
 *   - 'commercial' → lighter WorfGate floor.
 *   - 'enterprise' → DoD-grade floor (>= 'enterprise' security tier, controlled-data hard block,
 *      SSM-only secrets) AND a recorded manager attestation.
 */
export type BusinessTier = 'commercial' | 'enterprise';

/** Manager sign-off recorded when a client is placed in (or elevated to) the Enterprise tier. */
export interface TierAttestation {
  /** The top-level manager who approved the elevation. */
  approvedBy: string;
  /** Why it qualifies (e.g. "Handles ITAR/EAR controlled data"). */
  statement: string;
  /** ISO timestamp of the attestation. */
  approvedAt: string;
}

/** Coarse default: regulated/enterprise security clients are Enterprise; standard is Commercial. */
export function businessTierFromSecurityTier(t: SecurityTier): BusinessTier {
  return t === 'regulated' || t === 'enterprise' ? 'enterprise' : 'commercial';
}

/**
 * Enterprise mandates a security floor: a client in the Enterprise tier may not run below the
 * 'enterprise' security tier. Raises a too-low tier to the floor; leaves regulated/enterprise as-is.
 */
export function enforceEnterpriseFloor(businessTier: BusinessTier, securityTier: SecurityTier): SecurityTier {
  if (businessTier !== 'enterprise') return securityTier;
  return securityTier === 'standard' ? 'enterprise' : securityTier;
}

/**
 * Gate: placing/elevating a client into the Enterprise tier REQUIRES a manager attestation. Throws a
 * clear error if missing or incomplete. Commercial needs none. Call before persisting the client.
 */
export function assertTierAttestation(businessTier: BusinessTier, attestation?: TierAttestation): void {
  if (businessTier !== 'enterprise') return;
  if (!attestation || !attestation.approvedBy?.trim() || !attestation.statement?.trim()) {
    throw new Error(
      'Enterprise tier requires a manager attestation: provide tierAttestation { approvedBy, statement } ' +
        '(e.g. approvedBy: "<manager>", statement: "Handles ITAR/EAR controlled data"). ' +
        'Enterprise carries the DoD-grade WorfGate floor and must be approved by a top-level manager.',
    );
  }
}
