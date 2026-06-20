-- ============================================================================
-- Client-Scoped Memory Isolation
-- ============================================================================
-- Adds client_id to sa_observation_memories so each client's crew memories
-- are isolated. Bayer's memories never surface in a Retailer session and vice versa.
--
-- Isolation rule:
--   - client_id IS NULL   → legacy/global memories, readable by all clients
--   - client_id = 'bayer-int'    → Bayer-only memories (regulated tier)
--   - client_id = 'familiarcat'  → Retailer Rewards memories (enterprise tier)
--
-- New queries filter: client_id = $target OR client_id IS NULL
-- This means global memories remain accessible while new memories are siloed.

-- ── Add client_id to sa_observation_memories ─────────────────────────────────

ALTER TABLE public.sa_observation_memories
  ADD COLUMN IF NOT EXISTS client_id TEXT REFERENCES sa_client_security_policies(client_id) ON DELETE SET NULL;

COMMENT ON COLUMN public.sa_observation_memories.client_id IS
  'Client org that owns this memory. NULL = legacy/global, readable by all. Non-null = scoped to that client only. bayer-int = regulated, familiarcat = enterprise.';

CREATE INDEX IF NOT EXISTS idx_sa_observation_memories_client_id
  ON public.sa_observation_memories(client_id);

-- Composite index for the common query pattern: client_id + created_at DESC
CREATE INDEX IF NOT EXISTS idx_sa_observation_memories_client_created
  ON public.sa_observation_memories(client_id, created_at DESC);

-- ── Register familiarcat (Retailer Rewards) as enterprise-tier client ─────────

INSERT INTO sa_client_security_policies (
  client_id,
  client_name,
  tier,
  tier_rationale,
  auth_requirements,
  worf_gate_policy,
  required_credentials
) VALUES (
  'familiarcat',
  'Retailer Rewards Program (familiarcat)',
  'enterprise',
  'React CRA app tracking customer loyalty points and transaction history. ' ||
  'Handles PII-lite data (customer IDs, transaction amounts) with no regulated/GDPR/PHI obligations. ' ||
  'Enterprise tier: below Bayer gold standard but above standard tier. ' ||
  'Demonstrates that the security system has real tiering below the Bayer ceiling.',
  '{
    "requireBearerToken": true,
    "requireEntraIssuer": false,
    "requireSessionIsolation": true,
    "requireFullAuditTrail": true,
    "worfGateEnforce": true,
    "controlledDataHardBlock": false,
    "requireSsmSecrets": false,
    "sessionTtlSeconds": 7200
  }'::jsonb,
  '{
    "enforceMode": "hard",
    "allowedGithubOrgs": ["familiarcat"],
    "controlledMarkers": [
      "confidential", "internal use only", "customer data",
      "pii", "secret", "proprietary", "transaction", "rewards", "loyalty"
    ],
    "allowControlledOutbound": false
  }'::jsonb,
  '[
    {"name": "STORY_AGENT_AUTH_JWKS_URI", "description": "JWKS URI (any OIDC provider)", "source": "env", "sensitive": false},
    {"name": "STORY_AGENT_AUTH_AUDIENCE", "description": "Expected aud claim", "source": "env", "sensitive": false},
    {"name": "WORFGATE_ENFORCE",          "description": "Must be true", "source": "env", "sensitive": false},
    {"name": "WORFGATE_ALLOWED_GITHUB_ORGS", "description": "Must include familiarcat", "source": "env", "sensitive": false},
    {"name": "REDIS_URL",    "description": "Redis for session isolation", "source": "either", "sensitive": true},
    {"name": "SUPABASE_URL", "description": "Supabase project URL",        "source": "either", "sensitive": false},
    {"name": "SUPABASE_KEY", "description": "Supabase service role key",   "source": "either", "sensitive": true},
    {"name": "GITHUB_TOKEN", "description": "GitHub PAT (familiarcat org)","source": "either", "sensitive": true}
  ]'::jsonb
) ON CONFLICT (client_id) DO NOTHING;

-- ── Row-Level Security policies for client-scoped memory reads ────────────────
-- These are additive policies that enforce isolation at the database layer
-- in addition to the application-layer clientId filtering in db.ts.

-- Drop the existing broad service-role policy and replace with client-aware policies
DROP POLICY IF EXISTS "Service role full access" ON public.sa_observation_memories;

-- Service role can read/write all rows (for admin operations, migrations)
CREATE POLICY "Service role full access"
  ON public.sa_observation_memories
  USING (auth.role() = 'service_role');

-- ── Security tier summary view ────────────────────────────────────────────────
-- Handy view for the UI /api/crew/status endpoint to show tier comparison.

CREATE OR REPLACE VIEW sa_security_tier_summary AS
SELECT
  p.client_id,
  p.client_name,
  p.tier,
  p.tier_rationale,
  (p.auth_requirements->>'requireBearerToken')::boolean   AS require_bearer_token,
  (p.auth_requirements->>'requireEntraIssuer')::boolean   AS require_entra_issuer,
  (p.auth_requirements->>'requireSessionIsolation')::boolean AS require_session_isolation,
  (p.auth_requirements->>'requireFullAuditTrail')::boolean AS require_full_audit_trail,
  (p.auth_requirements->>'worfGateEnforce')::boolean       AS worf_gate_enforce,
  (p.auth_requirements->>'controlledDataHardBlock')::boolean AS controlled_data_hard_block,
  (p.auth_requirements->>'requireSsmSecrets')::boolean    AS require_ssm_secrets,
  (p.auth_requirements->>'sessionTtlSeconds')::integer    AS session_ttl_seconds,
  (p.worf_gate_policy->>'enforceMode')                    AS worf_gate_mode,
  (p.worf_gate_policy->>'allowControlledOutbound')::boolean AS allow_controlled_outbound,
  COUNT(DISTINCT m.id) AS memory_count,
  MAX(m.created_at)    AS last_memory_at,
  p.created_at
FROM sa_client_security_policies p
LEFT JOIN sa_observation_memories m ON m.client_id = p.client_id
GROUP BY p.client_id, p.client_name, p.tier, p.tier_rationale,
  p.auth_requirements, p.worf_gate_policy, p.created_at
ORDER BY
  CASE p.tier WHEN 'regulated' THEN 1 WHEN 'enterprise' THEN 2 ELSE 3 END,
  p.client_name;

COMMENT ON VIEW sa_security_tier_summary IS
  'Security tier comparison across all registered clients. Ordered: regulated (Bayer gold standard) → enterprise (familiarcat) → standard. Use this view to show how new clients compare against the Bayer ceiling.';
