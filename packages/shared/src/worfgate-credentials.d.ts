/**
 * WorfGate Credential Broker.
 *
 * The crew obtains credentials for authorized operations THROUGH WorfGate, not by ad-hoc env
 * reads. WorfGate resolves a NAMED credential from the process environment (loaded from
 * ~/.zshrc / ~/.alexai-secrets — see [[worfgate-secrets-principle]]), authorizes the request by
 * crew identity, AUDITS every access, and NEVER logs or serializes the secret value.
 *
 * Worf is the owning officer: he holds the WorfGate skill, so the crew always has governed
 * access to this capability and its tools through him.
 */
export type CredentialOperation = 'supabase:migrate' | 'supabase:link' | 'supabase:query' | 'aws:deploy' | 'aws:secrets' | 'aha:write' | 'aha:read' | 'github:push' | 'figma:tokens-sync' | 'figma:read' | 'llm:call';
export interface CredentialSpec {
    /** Environment variable name (loaded from ~/.zshrc / ~/.alexai-secrets). */
    name: string;
    description: string;
    /** Operations this credential is permitted to serve. */
    operations: CredentialOperation[];
    /** Whether absence should be treated as a hard blocker for its operations. */
    required: boolean;
}
/** The officer who owns the WorfGate skill — always authorized to broker credentials. */
export declare const WORFGATE_OFFICER = "worf";
/** Allowlisted credentials the crew may broker — keyed by env var name. */
export declare const CREW_CREDENTIAL_REGISTRY: Record<string, CredentialSpec>;
export interface CredentialAccessResult {
    name: string;
    authorized: boolean;
    available: boolean;
    /** The secret value — present ONLY when authorized && available. NEVER serialize this field. */
    value?: string;
    reason: string;
}
export interface CredentialAuditEntry {
    timestamp: string;
    name: string;
    operation: CredentialOperation;
    crewId: string;
    authorized: boolean;
    available: boolean;
}
/** The credential-access audit trail (no values, ever). */
export declare function getCredentialAuditLog(): CredentialAuditEntry[];
export interface CredentialProvider {
    /** Identifier, e.g. 'env' | 'vault' | 'aws-secrets-manager'. */
    name: string;
    /** Lower = consulted first. env defaults to 100; put external vaults below to override. */
    priority: number;
    /** Whether this provider is configured/active in the current environment. */
    isActive(): boolean;
    /** Resolve a credential by name; return undefined if absent. */
    get(name: string): Promise<string | undefined>;
}
/** Register a secret provider (sorted by priority; lower first). */
export declare function registerCredentialProvider(p: CredentialProvider): void;
/** Active providers in priority order (for status/inventory). */
export declare function listCredentialProviders(): Array<{
    name: string;
    priority: number;
    active: boolean;
}>;
/** Presence-only check across the env (sync, no value). */
export declare function worfGateHasCredential(name: string): boolean;
/**
 * Resolve a credential through WorfGate (sync, ENV provider only — fast path for hot code).
 * For the full provider chain (Vault / Secrets Manager), use resolveWorfGateCredentialAsync.
 */
export declare function resolveWorfGateCredential(name: string, ctx: {
    operation: CredentialOperation;
    crewId?: string;
    clientId?: string | null;
}): CredentialAccessResult;
/**
 * Resolve a credential through WorfGate across the full provider chain (env → Vault → Secrets
 * Manager → …). Authorizes by crew identity, audits, and returns the value + which provider served
 * it ONLY to calling code. Use redactCredential() to serialize safely.
 */
export declare function resolveWorfGateCredentialAsync(name: string, ctx: {
    operation: CredentialOperation;
    crewId?: string;
    clientId?: string | null;
}): Promise<CredentialAccessResult & {
    source?: string;
}>;
/** Safe serialization: strips the secret value, keeps the decision. */
export declare function redactCredential(r: CredentialAccessResult): Omit<CredentialAccessResult, 'value'> & {
    hasValue: boolean;
};
/** Presence map for a set of credentials (no values) — for status/inventory views. */
export declare function credentialStatus(names?: string[]): Array<{
    name: string;
    description: string;
    operations: CredentialOperation[];
    available: boolean;
    required: boolean;
}>;
/** Crew permitted to break-glass override. O'Brien is primary; Worf (gate owner) + Picard (command) tier in. */
export declare const OVERRIDE_CREW: Set<string>;
export declare const MIN_OVERRIDE_REASON_LEN = 20;
export declare const OVERRIDE_LIMIT_PER_DAY = 3;
export interface OverrideEntry {
    timestamp: string;
    name: string;
    operation: CredentialOperation;
    crewId: string;
    reason: string;
    /** true = the override was permitted (all bounds passed); false = refused (denialReason set). */
    granted: boolean;
    /** whether the credential value was actually present in the environment. */
    available: boolean;
    denialReason?: string;
}
/** The MONITORED override stream (no secret values, ever) — the Observation Lounge reads this. */
export declare function getOverrideAuditLog(): OverrideEntry[];
/**
 * Break-glass: resolve a REGISTERED credential for an operation OUTSIDE its normal allowlist, with a
 * mandatory justification. Bounded + monitored per the crew ruling. The value is returned only to the
 * caller and NEVER logged. Every attempt (granted/denied) lands in the monitored override stream.
 */
export declare function resolveWorfGateOverride(name: string, ctx: {
    operation: CredentialOperation;
    crewId: string;
    reason: string;
}): CredentialAccessResult & {
    override: true;
    monitored: true;
};
/**
 * Monitoring digest for the Observation Lounge — the crew reviews overrides together. No secret
 * values. Surfaces recent overrides + anomaly flags (rate pressure, repeats, denials) for review.
 */
export declare function summarizeOverridesForLounge(sinceHours?: number): {
    windowHours: number;
    total: number;
    granted: number;
    denied: number;
    byCrew: Record<string, number>;
    byCredentialOp: Record<string, number>;
    recent: OverrideEntry[];
    anomalies: string[];
};
//# sourceMappingURL=worfgate-credentials.d.ts.map