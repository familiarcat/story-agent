/** Coarse default: regulated/enterprise security clients are Enterprise; standard is Commercial. */
export function businessTierFromSecurityTier(t) {
    return t === 'regulated' || t === 'enterprise' ? 'enterprise' : 'commercial';
}
/**
 * Enterprise mandates a security floor: a client in the Enterprise tier may not run below the
 * 'enterprise' security tier. Raises a too-low tier to the floor; leaves regulated/enterprise as-is.
 */
export function enforceEnterpriseFloor(businessTier, securityTier) {
    if (businessTier !== 'enterprise')
        return securityTier;
    return securityTier === 'standard' ? 'enterprise' : securityTier;
}
/**
 * Gate: placing/elevating a client into the Enterprise tier REQUIRES a manager attestation. Throws a
 * clear error if missing or incomplete. Commercial needs none. Call before persisting the client.
 */
export function assertTierAttestation(businessTier, attestation) {
    if (businessTier !== 'enterprise')
        return;
    if (!attestation || !attestation.approvedBy?.trim() || !attestation.statement?.trim()) {
        throw new Error('Enterprise tier requires a manager attestation: provide tierAttestation { approvedBy, statement } ' +
            '(e.g. approvedBy: "<manager>", statement: "Handles ITAR/EAR controlled data"). ' +
            'Enterprise carries the DoD-grade WorfGate floor and must be approved by a top-level manager.');
    }
}
