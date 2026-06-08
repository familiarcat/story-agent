/**
 * Client Security Policy — Bayer is the Gold Standard
 *
 * Bayer (bayer-int) is the hardest security client we support.
 * All new clients are measured against Bayer's policy tier.
 * If you build something that passes Bayer's security requirements,
 * it works for every client we'll ever onboard.
 *
 * Security tiers:
 *  - 'regulated'  → Bayer tier: Entra auth, SSM secrets, WorfGate always on,
 *                   user-session isolation, full audit trail, no controlled data leak.
 *  - 'enterprise' → Strong auth required, WorfGate on, session isolation,
 *                   env-var secrets acceptable.
 *  - 'standard'   → Bearer token or API key acceptable, WorfGate advisory,
 *                   basic audit logging.
 */

export type SecurityTier = 'regulated' | 'enterprise' | 'standard';

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
  /** SSM parameter paths that must be populated (Bayer/regulated tier only) */
  requiredSsmPaths?: string[];
}

// ── BAYER — GOLD STANDARD (regulated tier) ───────────────────────────────────
//
// Bayer is a pharmaceutical / crop-science enterprise with:
//  - GDPR obligations (EU data, patient data, PHI adjacency)
//  - Internal Entra (Azure AD) for all service auth
//  - AWS SSM Parameter Store for secrets (no plaintext env vars in CI/CD)
//  - Strict outbound controls — no customer data to GitHub without clearance
//  - Every tool call audited with immutable trail
//
// Any security measure added for Bayer sets the ceiling. Future clients
// that need less can relax individual requirements, but Bayer's policy
// is the baseline test for the system's security posture.

export const BAYER_SECURITY_POLICY: ClientSecurityPolicy = {
  clientId: 'bayer-int',
  clientName: 'Bayer AG (Internal)',
  tier: 'regulated',
  tierRationale:
    'Pharmaceutical enterprise with GDPR obligations, PHI-adjacent data, and mandatory Entra auth. ' +
    'Bayer is the hardest security client — all other clients are measured against this profile.',

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
    allowedGithubOrgs: ['bayer-int'],
    controlledMarkers: [
      'bayer',
      'bayer-int',
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
      name: 'BAYER_ENTRA_TENANT_ID',
      description: 'Azure AD tenant ID for Bayer. Used to validate Bearer token issuer (iss claim).',
      source: 'ssm',
      sensitive: false,
    },
    {
      name: 'BAYER_ENTRA_AUDIENCE',
      description: 'Expected audience (aud claim) in Bayer Entra tokens — the app registration client ID.',
      source: 'ssm',
      sensitive: false,
    },
    {
      name: 'BAYER_ENTRA_JWKS_URI',
      description: 'JWKS URI for Bayer Entra tenant — used to verify token signatures without sharing secrets.',
      source: 'ssm',
      sensitive: false,
    },
    {
      name: 'WORFGATE_ENFORCE',
      description: 'Must be "true". WorfGate blocks all outbound controlled data. Hard requirement for Bayer tier.',
      source: 'env',
      sensitive: false,
    },
    {
      name: 'WORFGATE_ALLOWED_GITHUB_ORGS',
      description: 'Must include "bayer-int". Only commits targeting bayer-int repos are permitted.',
      source: 'env',
      sensitive: false,
    },
    {
      name: 'WORFGATE_ALLOW_CONTROLLED',
      description: 'Must be "false" for Bayer tier. Controlled data cannot leave the system.',
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
      description: 'GitHub PAT or GitHub App token scoped to bayer-int org. Required for branch/PR operations.',
      source: 'ssm',
      sensitive: true,
    },
  ],

  requiredSsmPaths: [
    '/story-agent/bayer/entra-tenant-id',
    '/story-agent/bayer/entra-audience',
    '/story-agent/bayer/entra-jwks-uri',
    '/story-agent/bayer/redis-url',
    '/story-agent/bayer/supabase-url',
    '/story-agent/bayer/supabase-key',
    '/story-agent/bayer/github-token',
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

// ── CLIENT REGISTRY ───────────────────────────────────────────────────────────

const CLIENT_POLICY_REGISTRY: Record<string, ClientSecurityPolicy> = {
  'bayer-int': BAYER_SECURITY_POLICY,

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
      'Enterprise tier is below Bayer gold standard but above standard tier.',

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

  // Add additional clients here. They are measured against BAYER_SECURITY_POLICY
  // as the gold standard. Never lower the bar below Bayer.
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
  return CLIENT_POLICY_REGISTRY[normalized] ?? DEFAULT_ENTERPRISE_POLICY;
}

/**
 * Check whether a client requires Entra-issued tokens specifically.
 * Bayer requires Entra. Others may use any OIDC provider.
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
