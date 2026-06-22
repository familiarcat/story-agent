/**
 * Client Security Policy — Client is the Gold Standard
 *
 * Client (client-int) is the hardest security client we support.
 * All new clients are measured against Client's policy tier.
 * If you build something that passes Client's security requirements,
 * it works for every client we'll ever onboard.
 *
 * Security tiers:
 *  - 'regulated'  → Client tier: Entra auth, SSM secrets, WorfGate always on,
 *                   user-session isolation, full audit trail, no controlled data leak.
 *  - 'enterprise' → Strong auth required, WorfGate on, session isolation,
 *                   env-var secrets acceptable.
 *  - 'standard'   → Bearer token or API key acceptable, WorfGate advisory,
 *                   basic audit logging.
 */
export type SecurityTier = 'regulated' | 'enterprise' | 'standard';
export interface UITheme {
    primary: string;
    secondary: string;
    accent: string;
    alert: string;
    environmentMode: string;
}
/**
 * Sovereign Factory Theme Theory:
 * Maps security tiers to visual environment "Baselines"
 */
export declare const TIER_THEMES: Record<SecurityTier, UITheme>;
export interface ClientAuthRequirements {
    /** Bearer token required on every HTTP MCP call */
    requireBearerToken: boolean;
    /** Must use Entra (Azure AD) as the token issuer — not generic JWT */
    requireEntraIssuer: boolean;
    /** `user-session-id` header must be present and used to scope Redis session state */
    requireSessionIsolation: boolean;
    /** All tool invocations must be logged to sa_mission_debriefs */
    requireFullAuditTrail: boolean;
    /** WorfGate must block, not advisory */
    worfGateEnforce: boolean;
    /** Controlled-data outbound is always blocked — cannot be overridden */
    controlledDataHardBlock: boolean;
    /** Secrets must come from AWS SSM — env vars not acceptable for this tier */
    requireSsmSecrets: boolean;
    /** Minimum session-scoped Redis TTL (seconds) */
    sessionTtlSeconds: number;
}
export interface ClientWorfGatePolicy {
    /** WORFGATE_ENFORCE must be 'true' */
    enforceMode: 'hard' | 'advisory';
    /** These GitHub orgs are allowlisted for outbound commits */
    allowedGithubOrgs: string[];
    /** Controlled-data markers that trigger WorfGate blocking for this client */
    controlledMarkers: string[];
    /** WORFGATE_ALLOW_CONTROLLED — can controlled data ever leave the system? */
    allowControlledOutbound: boolean;
}
export interface ClientSecurityPolicy {
    clientId: string;
    clientName: string;
    tier: SecurityTier;
    auth: ClientAuthRequirements;
    worfGate: ClientWorfGatePolicy;
    /** Human-readable rationale for why this tier applies */
    tierRationale: string;
    /** Required environment variables that MUST be set for this client to operate */
    requiredEnvVars: Array<{
        name: string;
        description: string;
        source: 'ssm' | 'env' | 'either';
        sensitive: boolean;
    }>;
    /** SSM parameter paths that must be populated (Client/regulated tier only) */
    requiredSsmPaths?: string[];
}
export declare const CLIENT_SECURITY_POLICY: ClientSecurityPolicy;
export declare const DEFAULT_ENTERPRISE_POLICY: ClientSecurityPolicy;
export declare const DEFAULT_STANDARD_POLICY: ClientSecurityPolicy;
/**
 * Resolve the security policy for a given client ID.
 *
 * If the client is unknown, returns the ENTERPRISE default — not standard.
 * Unknown clients should not default to the weakest posture.
 */
export declare function resolveClientPolicy(clientId: string | null | undefined): ClientSecurityPolicy;
/**
 * Check whether a client requires Entra-issued tokens specifically.
 * Client requires Entra. Others may use any OIDC provider.
 */
export declare function requiresEntraAuth(clientId: string | null | undefined): boolean;
/**
 * Validate that all required environment variables for a given client policy
 * are present. Returns a report of what's missing.
 *
 * Used at startup and in the credentials-inventory endpoint.
 */
export interface CredentialValidationReport {
    clientId: string;
    tier: SecurityTier;
    missingCredentials: Array<{
        name: string;
        description: string;
        source: 'ssm' | 'env' | 'either';
        sensitive: boolean;
        /** Only for SSM-sourced: the SSM parameter path */
        ssmPath?: string;
    }>;
    allPresent: boolean;
    /** Human-readable summary for logs / MCP tool output */
    summary: string;
}
export declare function validateClientCredentials(clientId: string | null | undefined, env?: Record<string, string | undefined>): CredentialValidationReport;
/**
 * Validate credentials for all known registered clients.
 * Used by crew integrity startup check and the /api/crew/credentials endpoint.
 */
export declare function validateAllClientCredentials(env?: Record<string, string | undefined>): CredentialValidationReport[];
//# sourceMappingURL=client-security-policy.d.ts.map