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
export const TIER_THEMES: Record<SecurityTier, UITheme> = {
  regulated: { primary: '#2D3E50', secondary: '#1A5276', accent: '#5DADE2', alert: '#CC0000', environmentMode: 'compliance_clinical' },
  enterprise: { primary: '#1B4D3E', secondary: '#239B56', accent: '#82E0AA', alert: '#E67E22', environmentMode: 'operational_growth' },
  standard: { primary: '#4A235A', secondary: '#7D3C98', accent: '#BB8FCE', alert: '#F1C40F', environmentMode: 'dynamic_standard' }
};

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
  /**
   * Parent client in the org hierarchy (e.g. a client onboarded under the 'familiarcat' main user).
   * null/undefined = a top-level org sitting directly under the root admin (Brady Georgen).
   */
  parentClientId?: string | null;
  /** Scope profile — where this client sits on the security/complexity spectrum (crew-analyzable). */
  profile?: ClientScopeProfile;
}

/**
 * A client's place on the scope spectrum — from a highly-protected enterprise client (multi-cloud
 * Vault/AWS/Azure, recursive security) down to a basic commercial site (login + a few entitlement
 * tiers). Lets the crew reason across the gestalt of clients the system must serve.
 */
export interface ClientScopeProfile {
  /** Identity/secret backends, e.g. ['vault','aws-secrets-manager','azure-entra','papi'] or ['basic-login']. */
  authProviders: string[];
  /** Number of human entitlement tiers beneath the client (0 = role-based / N/A). */
  entitlementTiers: number;
  /** Multi-layer/recursive security (regulated) vs a flat commercial posture. */
  recursiveSecurity: boolean;
  /** Commercial vs enterprise vs regulated/defense posture. */
  scope: 'commercial' | 'enterprise' | 'regulated-defense';
  /** One-line human summary of this client's profile. */
  summary: string;
  /** Named, discrete security posture (config-over-code — see SECURITY_POSTURES). */
  posture?: SecurityPosture;
  /** Compliance frameworks this client must satisfy (crew web-researched gradient). */
  complianceFrameworks?: string[];
  /** Security topology — recursive (multi-layer) with a depth, or flat. */
  topology?: { mode: 'recursive' | 'flat'; depth: number };
  /** Entitlement model — discrete tier ceiling (boundaries are named, never interpolated). */
  entitlementTier?: { max: number; extended: boolean };
}

/**
 * Named security postures — the discrete calibration points across the client gradient (per the
 * crew's gestalt ruling: "config-over-code; tier boundaries are discrete/named, not interpolated").
 * A client picks a posture; buildClientPolicy derives auth + WorfGate config from it. Any new
 * client between the poles selects the nearest posture rather than introducing a code branch.
 */
export type SecurityPosture = 'defense' | 'regulated' | 'industry-secret' | 'commercial';

export interface SecurityPostureConfig {
  scope: ClientScopeProfile['scope'];
  authProviders: string[];
  complianceFrameworks: string[];
  topology: { mode: 'recursive' | 'flat'; depth: number };
  entitlementTier: { max: number; extended: boolean };
  recursiveSecurity: boolean;
  controlledDataHardBlock: boolean;
  requireSsmSecrets: boolean;
  requireEntraIssuer: boolean;
}

export const SECURITY_POSTURES: Record<SecurityPosture, SecurityPostureConfig> = {
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
export function getSecurityPosture(name: SecurityPosture): SecurityPostureConfig {
  return SECURITY_POSTURES[name];
}

/** Default posture for a tier when none is specified. */
export function defaultPostureForTier(tier: SecurityTier): SecurityPosture {
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

export const CLIENT_SECURITY_POLICY: ClientSecurityPolicy = {
  clientId: 'client-int',
  clientName: 'Client AG (Internal)',
  tier: 'regulated',
  tierRationale:
    'Pharmaceutical enterprise with GDPR obligations, PHI-adjacent data, and mandatory Entra auth. ' +
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

export const DEFAULT_ENTERPRISE_POLICY: ClientSecurityPolicy = {
  clientId: '__enterprise_default__',
  clientName: 'Enterprise Client (Default)',
  tier: 'enterprise',
  tierRationale:
    'Enterprise client with strong auth requirements but without regulated-tier GDPR/PHI obligations.',

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

export const DEFAULT_STANDARD_POLICY: ClientSecurityPolicy = {
  clientId: '__standard_default__',
  clientName: 'Standard Client (Default)',
  tier: 'standard',
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

// ── CLIENT ONBOARDING (repeatable process) ────────────────────────────────────
//
// Every new client is built through buildClientPolicy() so the security floor is
// applied uniformly: WorfGate is ALWAYS enforced (hard), full audit + session
// isolation are on, and regulated tier additionally forces SSM secrets + a
// controlled-data hard block. You may raise the bar per client; you can never
// drop below this floor (Client remains the ceiling).

export interface ClientOnboardingSpec {
  clientId: string;
  clientName: string;
  tier: SecurityTier;
  /** GitHub org allowlisted for this client's outbound commits. */
  githubOrg: string;
  /** Parent client in the hierarchy (e.g. 'familiarcat'). null = top-level org. */
  parentClientId?: string | null;
  /** Extra controlled-data markers beyond the baseline set. */
  controlledMarkers?: string[];
  /** Force a hard block on controlled-data outbound (always true for regulated). */
  controlledDataHardBlock?: boolean;
  tierRationale?: string;
  /** Named security posture — derives auth + WorfGate config (config-over-code). Defaults by tier. */
  posture?: SecurityPosture;
  /** Explicit scope profile override (else derived from the posture). */
  profile?: ClientScopeProfile;
}

const BASELINE_CONTROLLED_MARKERS = ['confidential', 'internal use only', 'proprietary', 'secret', 'pii'];

/** Build a complete, floor-compliant ClientSecurityPolicy from a minimal spec. */
export function buildClientPolicy(spec: ClientOnboardingSpec): ClientSecurityPolicy {
  // Posture drives the discrete config (config-over-code). Pick the spec's posture, else default by tier.
  const posture = spec.posture ?? defaultPostureForTier(spec.tier);
  const pc = getSecurityPosture(posture);
  const regulated = spec.tier === 'regulated' || pc.requireSsmSecrets;
  const secretSource: 'ssm' | 'env' | 'either' = pc.requireSsmSecrets ? 'ssm' : 'either';
  const hardBlock = spec.controlledDataHardBlock ?? pc.controlledDataHardBlock;

  // Profile derived from the posture (explicit spec.profile overrides).
  const defaultProfile: ClientScopeProfile = {
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
    tier: spec.tier,
    parentClientId: spec.parentClientId ?? null,
    tierRationale:
      spec.tierRationale ??
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
const DYNAMIC_CLIENT_CACHE: Record<string, ClientSecurityPolicy> = {};

/** Put a policy into the in-memory cache (called after a DB hydrate or an onboard). */
export function cacheClientPolicy(policy: ClientSecurityPolicy): void {
  DYNAMIC_CLIENT_CACHE[policy.clientId.trim().toLowerCase()] = policy;
}

/** Clear the dynamic cache (e.g. before a fresh hydrate from the DB). */
export function clearDynamicClientCache(): void {
  for (const k of Object.keys(DYNAMIC_CLIENT_CACHE)) delete DYNAMIC_CLIENT_CACHE[k];
}

/** Look up a policy across the dynamic cache + static bootstrap, without falling back to a default. */
export function lookupClientPolicy(clientId: string): ClientSecurityPolicy | undefined {
  const k = clientId.trim().toLowerCase();
  return DYNAMIC_CLIENT_CACHE[k] ?? CLIENT_POLICY_REGISTRY[k];
}

// ── CLIENT REGISTRY ───────────────────────────────────────────────────────────

const CLIENT_POLICY_REGISTRY: Record<string, ClientSecurityPolicy> = {
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
    tierRationale:
      'React app tracking customer loyalty points and transaction history. ' +
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
export function resolveClientPolicy(clientId: string | null | undefined): ClientSecurityPolicy {
  if (!clientId) return DEFAULT_ENTERPRISE_POLICY;
  const normalized = clientId.trim().toLowerCase();
  // DB-hydrated/onboarded clients take precedence, then the code bootstrap, then the enterprise floor.
  return DYNAMIC_CLIENT_CACHE[normalized] ?? CLIENT_POLICY_REGISTRY[normalized] ?? DEFAULT_ENTERPRISE_POLICY;
}

/** All known client policies (code bootstrap + DB-hydrated). */
export function listClientPolicies(): ClientSecurityPolicy[] {
  const merged: Record<string, ClientSecurityPolicy> = { ...CLIENT_POLICY_REGISTRY, ...DYNAMIC_CLIENT_CACHE };
  return Object.values(merged);
}

/** Direct children of a client in the hierarchy. */
export function getClientChildren(clientId: string): ClientSecurityPolicy[] {
  const k = clientId.trim().toLowerCase();
  return listClientPolicies().filter(p => (p.parentClientId ?? null) === k);
}

export interface ClientHierarchyNode {
  clientId: string;
  clientName: string;
  tier: SecurityTier;
  worfGateEnforce: boolean;
  children: ClientHierarchyNode[];
}

/** The full client hierarchy as a tree (top-level orgs sit directly under the root admin). */
export function listClientHierarchy(): ClientHierarchyNode[] {
  const all = listClientPolicies();
  const build = (p: ClientSecurityPolicy): ClientHierarchyNode => ({
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
export function requiresEntraAuth(clientId: string | null | undefined): boolean {
  return resolveClientPolicy(clientId).auth.requireEntraIssuer;
}

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

export function validateClientCredentials(
  clientId: string | null | undefined,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): CredentialValidationReport {
  const policy = resolveClientPolicy(clientId);
  const missing: CredentialValidationReport['missingCredentials'] = [];

  for (const req of policy.requiredEnvVars) {
    const value = env[req.name];
    if (!value || value.trim() === '') {
      const ssmPath = policy.requiredSsmPaths?.find(p =>
        p.toLowerCase().includes(req.name.toLowerCase().replace('_', '-').replace(/_/g, '-')),
      );
      missing.push({ ...req, ssmPath });
    }
  }

  const allPresent = missing.length === 0;
  const lines = [
    `Client: ${policy.clientName} [${policy.tier}]`,
    allPresent
      ? '✅ All credentials present.'
      : `❌ ${missing.length} missing credential(s):`,
    ...missing.map(m =>
      `  - ${m.name} (${m.source}${m.ssmPath ? ` → SSM: ${m.ssmPath}` : ''}): ${m.description}`,
    ),
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
export function validateAllClientCredentials(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): CredentialValidationReport[] {
  return Object.keys(CLIENT_POLICY_REGISTRY).map(clientId =>
    validateClientCredentials(clientId, env),
  );
}
