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
import { businessTierFromSecurityTier, enforceEnterpriseFloor } from './business-tier.js';
/**
 * Sovereign Factory Theme Theory:
 * Maps security tiers to visual environment "Baselines"
 */
export const TIER_THEMES = {
    regulated: { primary: '#2D3E50', secondary: '#1A5276', accent: '#5DADE2', alert: '#CC0000', environmentMode: 'compliance_clinical' },
    enterprise: { primary: '#1B4D3E', secondary: '#239B56', accent: '#82E0AA', alert: '#E67E22', environmentMode: 'operational_growth' },
    standard: { primary: '#4A235A', secondary: '#7D3C98', accent: '#BB8FCE', alert: '#F1C40F', environmentMode: 'dynamic_standard' }
};
export const SECURITY_POSTURES = {
    // Government / defense — highest. (FedRAMP/CMMC/ITAR; CUI/FCI.)
    defense: {
        scope: 'regulated-defense', authProviders: ['vault', 'aws-secrets-manager', 'azure-entra', 'papi'],
        complianceFrameworks: ['FedRAMP', 'CMMC', 'NIST 800-171', 'NIST 800-53', 'ITAR'],
        topology: { mode: 'recursive', depth: 3 }, entitlementTier: { max: 0, extended: false },
        recursiveSecurity: true, controlledDataHardBlock: true, requireSsmSecrets: true, requireEntraIssuer: true,
    },
    // Regulated commercial — HIPAA/PCI-DSS/GDPR/SOC2/ISO27001.
    regulated: {
        scope: 'regulated-defense', authProviders: ['azure-entra', 'aws-secrets-manager'],
        complianceFrameworks: ['HIPAA', 'PCI-DSS', 'GDPR', 'SOC2', 'ISO 27001'],
        topology: { mode: 'recursive', depth: 2 }, entitlementTier: { max: 0, extended: false },
        recursiveSecurity: true, controlledDataHardBlock: true, requireSsmSecrets: true, requireEntraIssuer: true,
    },
    // Commercial but industry-secret — trade secrets need NDAs + RBAC + export-logging (DTSA).
    'industry-secret': {
        scope: 'enterprise', authProviders: ['oidc', 'aws-secrets-manager'],
        complianceFrameworks: ['Trade Secret (DTSA)', 'NDA', 'SOC2'],
        topology: { mode: 'flat', depth: 1 }, entitlementTier: { max: 3, extended: false },
        recursiveSecurity: false, controlledDataHardBlock: false, requireSsmSecrets: false, requireEntraIssuer: false,
    },
    // Basic commercial — RBAC role hierarchy + tiered entitlements.
    commercial: {
        scope: 'commercial', authProviders: ['basic-login'],
        complianceFrameworks: [],
        topology: { mode: 'flat', depth: 1 }, entitlementTier: { max: 5, extended: true },
        recursiveSecurity: false, controlledDataHardBlock: false, requireSsmSecrets: false, requireEntraIssuer: false,
    },
};
/** Resolve a named posture's discrete config. */
export function getSecurityPosture(name) {
    return SECURITY_POSTURES[name];
}
/** Default posture for a tier when none is specified. */
export function defaultPostureForTier(tier) {
    return tier === 'regulated' ? 'regulated' : tier === 'enterprise' ? 'industry-secret' : 'commercial';
}
// ── CLIENT — GOLD STANDARD (regulated tier) ───────────────────────────────────
//
// Client is a pharmaceutical / crop-science enterprise with:
//  - GDPR obligations (EU data, patient data, PHI adjacency)
//  - Internal Entra (Azure AD) for all service auth
//  - AWS SSM Parameter Store for secrets (no plaintext env vars in CI/CD)
//  - Strict outbound controls — no customer data to GitHub without clearance
//  - Every tool call audited with immutable trail
//
// Any security measure added for Client sets the ceiling. Future clients
// that need less can relax individual requirements, but Client's policy
// is the baseline test for the system's security posture.
export const CLIENT_SECURITY_POLICY = {
    clientId: 'client-int',
    clientName: 'Client AG (Internal)',
    tier: 'regulated',
    businessTier: 'enterprise',
    tierRationale: 'Pharmaceutical enterprise with GDPR obligations, PHI-adjacent data, and mandatory Entra auth. ' +
        'Client is the hardest security client — all other clients are measured against this profile.',
    auth: {
        requireBearerToken: true,
        requireEntraIssuer: true,
        requireSessionIsolation: true,
        requireFullAuditTrail: true,
        worfGateEnforce: true,
        controlledDataHardBlock: true,
        requireSsmSecrets: true,
        sessionTtlSeconds: 3600, // 1 hour session TTL
    },
    worfGate: {
        enforceMode: 'hard',
        allowedGithubOrgs: ['client-int'],
        controlledMarkers: [
            'client',
            'client-int',
            'confidential',
            'internal use only',
            'regulated',
            'customer data',
            'patient',
            'phi',
            'pii',
            'secret',
            'proprietary',
            'pharmaceutical',
            'crop science',
            'gdpr',
            'restricted',
        ],
        allowControlledOutbound: false,
    },
    requiredEnvVars: [
        {
            name: 'CLIENT_ENTRA_TENANT_ID',
            description: 'Azure AD tenant ID for Client. Used to validate Bearer token issuer (iss claim).',
            source: 'ssm',
            sensitive: false,
        },
        {
            name: 'CLIENT_ENTRA_AUDIENCE',
            description: 'Expected audience (aud claim) in Client Entra tokens — the app registration client ID.',
            source: 'ssm',
            sensitive: false,
        },
        {
            name: 'CLIENT_ENTRA_JWKS_URI',
            description: 'JWKS URI for Client Entra tenant — used to verify token signatures without sharing secrets.',
            source: 'ssm',
            sensitive: false,
        },
        {
            name: 'WORFGATE_ENFORCE',
            description: 'Must be "true". WorfGate blocks all outbound controlled data. Hard requirement for Client tier.',
            source: 'env',
            sensitive: false,
        },
        {
            name: 'WORFGATE_ALLOWED_GITHUB_ORGS',
            description: 'Must include "client-int". Only commits targeting client-int repos are permitted.',
            source: 'env',
            sensitive: false,
        },
        {
            name: 'WORFGATE_ALLOW_CONTROLLED',
            description: 'Must be "false" for Client tier. Controlled data cannot leave the system.',
            source: 'env',
            sensitive: false,
        },
        {
            name: 'REDIS_URL',
            description: 'Redis connection URL for per-session state isolation. Required for session TTL enforcement.',
            source: 'ssm',
            sensitive: true,
        },
        {
            name: 'SUPABASE_URL',
            description: 'Supabase project URL for full audit trail persistence.',
            source: 'ssm',
            sensitive: false,
        },
        {
            name: 'SUPABASE_KEY',
            description: 'Supabase service role key. Service role required for audit log writes.',
            source: 'ssm',
            sensitive: true,
        },
        {
            name: 'GITHUB_TOKEN',
            description: 'GitHub PAT or GitHub App token scoped to client-int org. Required for branch/PR operations.',
            source: 'ssm',
            sensitive: true,
        },
    ],
    requiredSsmPaths: [
        '/story-agent/client/entra-tenant-id',
        '/story-agent/client/entra-audience',
        '/story-agent/client/entra-jwks-uri',
        '/story-agent/client/redis-url',
        '/story-agent/client/supabase-url',
        '/story-agent/client/supabase-key',
        '/story-agent/client/github-token',
    ],
};
// ── DEFAULT ENTERPRISE POLICY ────────────────────────────────────────────────
export const DEFAULT_ENTERPRISE_POLICY = {
    clientId: '__enterprise_default__',
    clientName: 'Enterprise Client (Default)',
    tier: 'enterprise',
    businessTier: 'enterprise',
    tierRationale: 'Enterprise client with strong auth requirements but without regulated-tier GDPR/PHI obligations.',
    auth: {
        requireBearerToken: true,
        requireEntraIssuer: false, // any OIDC issuer acceptable
        requireSessionIsolation: true,
        requireFullAuditTrail: true,
        worfGateEnforce: true,
        controlledDataHardBlock: false, // can be overridden per-deployment
        requireSsmSecrets: false, // env vars acceptable
        sessionTtlSeconds: 7200,
    },
    worfGate: {
        enforceMode: 'hard',
        allowedGithubOrgs: [],
        controlledMarkers: [
            'confidential',
            'internal use only',
            'customer data',
            'pii',
            'secret',
            'proprietary',
        ],
        allowControlledOutbound: false,
    },
    requiredEnvVars: [
        {
            name: 'STORY_AGENT_AUTH_JWKS_URI',
            description: 'JWKS URI for token validation. Any OIDC-compliant identity provider.',
            source: 'env',
            sensitive: false,
        },
        {
            name: 'STORY_AGENT_AUTH_AUDIENCE',
            description: 'Expected audience claim in tokens.',
            source: 'env',
            sensitive: false,
        },
        {
            name: 'WORFGATE_ENFORCE',
            description: 'Must be "true" for enterprise tier.',
            source: 'env',
            sensitive: false,
        },
        {
            name: 'WORFGATE_ALLOWED_GITHUB_ORGS',
            description: 'Comma-separated list of allowed GitHub org names.',
            source: 'env',
            sensitive: false,
        },
        {
            name: 'REDIS_URL',
            description: 'Redis connection URL for session isolation.',
            source: 'either',
            sensitive: true,
        },
        {
            name: 'SUPABASE_URL',
            description: 'Supabase project URL.',
            source: 'either',
            sensitive: false,
        },
        {
            name: 'SUPABASE_KEY',
            description: 'Supabase service role key.',
            source: 'either',
            sensitive: true,
        },
        {
            name: 'GITHUB_TOKEN',
            description: 'GitHub token scoped to allowed orgs.',
            source: 'either',
            sensitive: true,
        },
    ],
};
// ── STANDARD POLICY ───────────────────────────────────────────────────────────
export const DEFAULT_STANDARD_POLICY = {
    clientId: '__standard_default__',
    clientName: 'Standard Client (Default)',
    tier: 'standard',
    businessTier: 'commercial',
    tierRationale: 'Standard client — basic auth, advisory WorfGate, core env var credentials.',
    auth: {
        requireBearerToken: false,
        requireEntraIssuer: false,
        requireSessionIsolation: false,
        requireFullAuditTrail: false,
        worfGateEnforce: false,
        controlledDataHardBlock: false,
        requireSsmSecrets: false,
        sessionTtlSeconds: 86400,
    },
    worfGate: {
        enforceMode: 'advisory',
        allowedGithubOrgs: [],
        controlledMarkers: ['confidential', 'secret'],
        allowControlledOutbound: false,
    },
    requiredEnvVars: [
        {
            name: 'SUPABASE_URL',
            description: 'Supabase project URL.',
            source: 'env',
            sensitive: false,
        },
        {
            name: 'SUPABASE_KEY',
            description: 'Supabase service role key.',
            source: 'env',
            sensitive: true,
        },
        {
            name: 'GITHUB_TOKEN',
            description: 'GitHub token.',
            source: 'env',
            sensitive: true,
        },
    ],
};
const BASELINE_CONTROLLED_MARKERS = ['confidential', 'internal use only', 'proprietary', 'secret', 'pii'];
/** Build a complete, floor-compliant ClientSecurityPolicy from a minimal spec. */
export function buildClientPolicy(spec) {
    // Business tier (coarse top grouping). Enterprise mandates a security floor — a standard-tier client
    // placed in the Enterprise tier is raised to 'enterprise' so the DoD-grade controls apply.
    const businessTier = spec.businessTier ?? businessTierFromSecurityTier(spec.tier);
    const effectiveTier = enforceEnterpriseFloor(businessTier, spec.tier);
    // Posture drives the discrete config (config-over-code). Pick the spec's posture, else default by tier.
    const posture = spec.posture ?? defaultPostureForTier(effectiveTier);
    const pc = getSecurityPosture(posture);
    const regulated = effectiveTier === 'regulated' || pc.requireSsmSecrets;
    const secretSource = pc.requireSsmSecrets ? 'ssm' : 'either';
    const hardBlock = spec.controlledDataHardBlock ?? pc.controlledDataHardBlock;
    // Profile derived from the posture (explicit spec.profile overrides).
    const defaultProfile = {
        authProviders: pc.authProviders,
        entitlementTiers: pc.entitlementTier.max,
        recursiveSecurity: pc.recursiveSecurity,
        scope: pc.scope,
        posture,
        complianceFrameworks: pc.complianceFrameworks,
        topology: pc.topology,
        entitlementTier: pc.entitlementTier,
        summary: `${spec.clientName}: ${posture} posture — ${pc.scope}; ${pc.recursiveSecurity ? 'recursive' : 'flat'} security; entitlement tiers ≤${pc.entitlementTier.max}; frameworks: ${pc.complianceFrameworks.join(', ') || 'none'}.`,
    };
    return {
        clientId: spec.clientId.trim().toLowerCase(),
        clientName: spec.clientName,
        tier: effectiveTier,
        businessTier,
        tierAttestation: spec.tierAttestation,
        parentClientId: spec.parentClientId ?? null,
        tierRationale: spec.tierRationale ??
            `${spec.tier} tier client onboarded under ${spec.parentClientId ?? 'root'}. WorfGate enforced; ` +
                `measured against the Client regulated gold standard.`,
        auth: {
            requireBearerToken: true,
            requireEntraIssuer: pc.requireEntraIssuer,
            requireSessionIsolation: true,
            requireFullAuditTrail: true,
            worfGateEnforce: true, // floor: WorfGate is always on for onboarded clients
            controlledDataHardBlock: hardBlock,
            requireSsmSecrets: pc.requireSsmSecrets,
            sessionTtlSeconds: regulated ? 3600 : 7200,
        },
        worfGate: {
            enforceMode: 'hard', // floor: never advisory for a managed client
            allowedGithubOrgs: [spec.githubOrg],
            controlledMarkers: Array.from(new Set([...BASELINE_CONTROLLED_MARKERS, ...(spec.controlledMarkers ?? [])])),
            allowControlledOutbound: false,
        },
        requiredEnvVars: [
            { name: 'STORY_AGENT_AUTH_JWKS_URI', description: 'JWKS URI for token validation.', source: 'env', sensitive: false },
            { name: 'STORY_AGENT_AUTH_AUDIENCE', description: `Expected aud claim for ${spec.clientName} tokens.`, source: 'env', sensitive: false },
            { name: 'WORFGATE_ENFORCE', description: 'Must be "true".', source: 'env', sensitive: false },
            { name: 'WORFGATE_ALLOWED_GITHUB_ORGS', description: `Must include "${spec.githubOrg}".`, source: 'env', sensitive: false },
            { name: 'REDIS_URL', description: 'Redis for session isolation.', source: 'either', sensitive: true },
            { name: 'SUPABASE_URL', description: 'Supabase project URL.', source: secretSource, sensitive: false },
            { name: 'SUPABASE_KEY', description: 'Supabase service role key.', source: secretSource, sensitive: true },
            { name: 'GITHUB_TOKEN', description: `GitHub PAT scoped to ${spec.githubOrg} org.`, source: secretSource, sensitive: true },
        ],
        requiredSsmPaths: regulated
            ? [`/story-agent/${spec.clientId}/supabase-url`, `/story-agent/${spec.clientId}/supabase-key`, `/story-agent/${spec.clientId}/github-token`]
            : undefined,
        profile: spec.profile ?? defaultProfile,
    };
}
// Dynamic client cache — hydrated from Supabase (see client-registry.ts). resolveClientPolicy reads
// this FIRST, so clients onboarded into the `clients` table resolve with no code change. The crew
// maintains clients end-to-end via the DB; only Client (gold standard) + familiarcat (root org)
// remain code bootstrap below.
const DYNAMIC_CLIENT_CACHE = {};
/** Put a policy into the in-memory cache (called after a DB hydrate or an onboard). */
export function cacheClientPolicy(policy) {
    DYNAMIC_CLIENT_CACHE[policy.clientId.trim().toLowerCase()] = policy;
}
/** Clear the dynamic cache (e.g. before a fresh hydrate from the DB). */
export function clearDynamicClientCache() {
    for (const k of Object.keys(DYNAMIC_CLIENT_CACHE))
        delete DYNAMIC_CLIENT_CACHE[k];
}
/** Look up a policy across the dynamic cache + static bootstrap, without falling back to a default. */
export function lookupClientPolicy(clientId) {
    const k = clientId.trim().toLowerCase();
    return DYNAMIC_CLIENT_CACHE[k] ?? CLIENT_POLICY_REGISTRY[k];
}
// ── CLIENT REGISTRY ───────────────────────────────────────────────────────────
const CLIENT_POLICY_REGISTRY = {
    'client-int': CLIENT_SECURITY_POLICY,
    // familiarcat / Retailer Rewards Program
    // React CRA app tracking customer loyalty points and transaction history.
    // Enterprise tier: customer financial data (transaction amounts, PII-lite),
    // but no regulated/GDPR/PHI obligations. Bearer auth required, WorfGate on,
    // session isolation required, env vars acceptable (no SSM mandate).
    'familiarcat': {
        clientId: 'familiarcat',
        clientName: 'Retailer Rewards Program (familiarcat)',
        tier: 'enterprise',
        businessTier: 'enterprise',
        tierRationale: 'React app tracking customer loyalty points and transaction history. ' +
            'Handles PII-lite data (customer IDs, transaction amounts) with no regulated/GDPR/PHI obligations. ' +
            'Enterprise tier is below Client gold standard but above standard tier.',
        auth: {
            requireBearerToken: true,
            requireEntraIssuer: false, // any OIDC provider acceptable
            requireSessionIsolation: true,
            requireFullAuditTrail: true,
            worfGateEnforce: true,
            controlledDataHardBlock: false, // can be relaxed per deployment
            requireSsmSecrets: false, // env vars acceptable
            sessionTtlSeconds: 7200, // 2-hour session TTL
        },
        worfGate: {
            enforceMode: 'hard',
            allowedGithubOrgs: ['familiarcat'],
            controlledMarkers: [
                'confidential',
                'internal use only',
                'customer data',
                'pii',
                'secret',
                'proprietary',
                'transaction',
                'rewards',
                'loyalty',
            ],
            allowControlledOutbound: false,
        },
        requiredEnvVars: [
            {
                name: 'STORY_AGENT_AUTH_JWKS_URI',
                description: 'JWKS URI for token validation (any OIDC provider).',
                source: 'env',
                sensitive: false,
            },
            {
                name: 'STORY_AGENT_AUTH_AUDIENCE',
                description: 'Expected aud claim for familiarcat tokens.',
                source: 'env',
                sensitive: false,
            },
            {
                name: 'WORFGATE_ENFORCE',
                description: 'Must be "true" for enterprise tier.',
                source: 'env',
                sensitive: false,
            },
            {
                name: 'WORFGATE_ALLOWED_GITHUB_ORGS',
                description: 'Must include "familiarcat".',
                source: 'env',
                sensitive: false,
            },
            {
                name: 'REDIS_URL',
                description: 'Redis for session isolation.',
                source: 'either',
                sensitive: true,
            },
            {
                name: 'SUPABASE_URL',
                description: 'Supabase project URL.',
                source: 'either',
                sensitive: false,
            },
            {
                name: 'SUPABASE_KEY',
                description: 'Supabase service role key.',
                source: 'either',
                sensitive: true,
            },
            {
                name: 'GITHUB_TOKEN',
                description: 'GitHub PAT scoped to familiarcat org.',
                source: 'either',
                sensitive: true,
            },
        ],
    },
    // NOTE: onboarded clients (Jonah onward) are NOT hardcoded here — they live in the Supabase
    // `clients` table and are hydrated into the dynamic cache at startup (see client-registry.ts).
    // Only Client (gold standard) + familiarcat (root org) remain code bootstrap.
};
/**
 * Resolve the security policy for a given client ID.
 *
 * If the client is unknown, returns the ENTERPRISE default — not standard.
 * Unknown clients should not default to the weakest posture.
 */
export function resolveClientPolicy(clientId) {
    if (!clientId)
        return DEFAULT_ENTERPRISE_POLICY;
    const normalized = clientId.trim().toLowerCase();
    // DB-hydrated/onboarded clients take precedence, then the code bootstrap, then the enterprise floor.
    return DYNAMIC_CLIENT_CACHE[normalized] ?? CLIENT_POLICY_REGISTRY[normalized] ?? DEFAULT_ENTERPRISE_POLICY;
}
/** All known client policies (code bootstrap + DB-hydrated). */
export function listClientPolicies() {
    const merged = { ...CLIENT_POLICY_REGISTRY, ...DYNAMIC_CLIENT_CACHE };
    return Object.values(merged);
}
/** Direct children of a client in the hierarchy. */
export function getClientChildren(clientId) {
    const k = clientId.trim().toLowerCase();
    return listClientPolicies().filter(p => (p.parentClientId ?? null) === k);
}
/** The full client hierarchy as a tree (top-level orgs sit directly under the root admin). */
export function listClientHierarchy() {
    const all = listClientPolicies();
    const build = (p) => ({
        clientId: p.clientId,
        clientName: p.clientName,
        tier: p.tier,
        worfGateEnforce: p.auth.worfGateEnforce,
        children: all.filter(c => (c.parentClientId ?? null) === p.clientId).map(build),
    });
    return all.filter(p => !p.parentClientId).map(build);
}
/**
 * Check whether a client requires Entra-issued tokens specifically.
 * Client requires Entra. Others may use any OIDC provider.
 */
export function requiresEntraAuth(clientId) {
    return resolveClientPolicy(clientId).auth.requireEntraIssuer;
}
export function validateClientCredentials(clientId, env = process.env) {
    const policy = resolveClientPolicy(clientId);
    const missing = [];
    for (const req of policy.requiredEnvVars) {
        const value = env[req.name];
        if (!value || value.trim() === '') {
            const ssmPath = policy.requiredSsmPaths?.find(p => p.toLowerCase().includes(req.name.toLowerCase().replace('_', '-').replace(/_/g, '-')));
            missing.push({ ...req, ssmPath });
        }
    }
    const allPresent = missing.length === 0;
    const lines = [
        `Client: ${policy.clientName} [${policy.tier}]`,
        allPresent
            ? '✅ All credentials present.'
            : `❌ ${missing.length} missing credential(s):`,
        ...missing.map(m => `  - ${m.name} (${m.source}${m.ssmPath ? ` → SSM: ${m.ssmPath}` : ''}): ${m.description}`),
    ];
    return {
        clientId: policy.clientId,
        tier: policy.tier,
        missingCredentials: missing,
        allPresent,
        summary: lines.join('\n'),
    };
}
/**
 * Validate credentials for all known registered clients.
 * Used by crew integrity startup check and the /api/crew/credentials endpoint.
 */
export function validateAllClientCredentials(env = process.env) {
    return Object.keys(CLIENT_POLICY_REGISTRY).map(clientId => validateClientCredentials(clientId, env));
}
