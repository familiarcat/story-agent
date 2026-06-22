-- ============================================================================
-- Client Security Policies & Mission Debrief Audit Trail
-- ============================================================================
-- Run after 20260606_crew_starship_tables.sql
--
-- This migration:
--  1. Creates sa_client_security_policies — Client is the seed row (gold standard)
--  2. Creates sa_mission_debriefs — full audit trail of crew missions
--  3. Adds client_tier + initiated_by_project columns to sa_stories
--
-- Client AG is the hardest security client (regulated tier).
-- All other clients are measured against Client's policy profile.

-- ── Client Security Policies ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sa_client_security_policies (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id       TEXT NOT NULL UNIQUE,
  client_name     TEXT NOT NULL,
  -- Security tier: 'regulated' | 'enterprise' | 'standard'
  -- Client is 'regulated'. New clients default to 'enterprise', never 'standard'.
  tier            TEXT NOT NULL DEFAULT 'enterprise'
    CHECK (tier IN ('regulated', 'enterprise', 'standard')),
  tier_rationale  TEXT NOT NULL,

  -- Auth requirements (JSONB — mirrors ClientAuthRequirements TS type)
  auth_requirements JSONB NOT NULL DEFAULT '{
    "requireBearerToken": true,
    "requireEntraIssuer": false,
    "requireSessionIsolation": true,
    "requireFullAuditTrail": true,
    "worfGateEnforce": true,
    "controlledDataHardBlock": false,
    "requireSsmSecrets": false,
    "sessionTtlSeconds": 7200
  }'::jsonb,

  -- WorfGate policy (JSONB — mirrors ClientWorfGatePolicy TS type)
  worf_gate_policy JSONB NOT NULL DEFAULT '{
    "enforceMode": "hard",
    "allowedGithubOrgs": [],
    "controlledMarkers": ["confidential","secret","proprietary","pii","customer data"],
    "allowControlledOutbound": false
  }'::jsonb,

  -- Required credentials documentation (JSONB array)
  required_credentials JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- SSM paths for secrets (regulated tier only)
  required_ssm_paths TEXT[] DEFAULT '{}',

  -- Who set this policy and when
  created_by   TEXT DEFAULT 'crew-integrity-system',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sa_client_security_policies_tier
  ON sa_client_security_policies(tier);

ALTER TABLE sa_client_security_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON sa_client_security_policies;
CREATE POLICY "Service role full access" ON sa_client_security_policies
  USING (auth.role() = 'service_role');

-- ── Client AG — Gold Standard Seed Row ────────────────────────────────────────
-- This row is the canonical definition of the regulated tier.
-- Do NOT lower any requirement in this row without security review.

INSERT INTO sa_client_security_policies (
  client_id,
  client_name,
  tier,
  tier_rationale,
  auth_requirements,
  worf_gate_policy,
  required_credentials,
  required_ssm_paths
) VALUES (
  'client-int',
  'Client AG (Internal)',
  'regulated',
  'Pharmaceutical enterprise with GDPR obligations, PHI-adjacent data, and mandatory Entra auth. ' ||
  'Client is the hardest security client — all other clients are measured against this profile.',
  '{
    "requireBearerToken": true,
    "requireEntraIssuer": true,
    "requireSessionIsolation": true,
    "requireFullAuditTrail": true,
    "worfGateEnforce": true,
    "controlledDataHardBlock": true,
    "requireSsmSecrets": true,
    "sessionTtlSeconds": 3600
  }'::jsonb,
  '{
    "enforceMode": "hard",
    "allowedGithubOrgs": ["client-int"],
    "controlledMarkers": [
      "client", "client-int", "confidential", "internal use only", "regulated",
      "customer data", "patient", "phi", "pii", "secret", "proprietary",
      "pharmaceutical", "crop science", "gdpr", "restricted"
    ],
    "allowControlledOutbound": false
  }'::jsonb,
  '[
    {"name": "CLIENT_ENTRA_TENANT_ID",  "description": "Azure AD tenant ID for Client", "source": "ssm", "sensitive": false},
    {"name": "CLIENT_ENTRA_AUDIENCE",   "description": "Expected aud claim in Client Entra tokens", "source": "ssm", "sensitive": false},
    {"name": "CLIENT_ENTRA_JWKS_URI",   "description": "JWKS URI for Client Entra tenant signature verification", "source": "ssm", "sensitive": false},
    {"name": "WORFGATE_ENFORCE",       "description": "Must be true — WorfGate hard enforcement", "source": "env", "sensitive": false},
    {"name": "WORFGATE_ALLOWED_GITHUB_ORGS", "description": "Must include client-int", "source": "env", "sensitive": false},
    {"name": "WORFGATE_ALLOW_CONTROLLED",    "description": "Must be false — controlled data blocked", "source": "env", "sensitive": false},
    {"name": "REDIS_URL",              "description": "Redis for per-session state isolation", "source": "ssm", "sensitive": true},
    {"name": "SUPABASE_URL",           "description": "Supabase project URL", "source": "ssm", "sensitive": false},
    {"name": "SUPABASE_KEY",           "description": "Supabase service role key", "source": "ssm", "sensitive": true},
    {"name": "GITHUB_TOKEN",           "description": "GitHub PAT scoped to client-int org", "source": "ssm", "sensitive": true}
  ]'::jsonb,
  ARRAY[
    '/story-agent/client/entra-tenant-id',
    '/story-agent/client/entra-audience',
    '/story-agent/client/entra-jwks-uri',
    '/story-agent/client/redis-url',
    '/story-agent/client/supabase-url',
    '/story-agent/client/supabase-key',
    '/story-agent/client/github-token'
  ]
) ON CONFLICT (client_id) DO NOTHING;

-- ── Mission Debriefs ──────────────────────────────────────────────────────────
-- Full audit trail of every crew mission execution.
-- Captures: which client, which project, what decision, which crew members ran,
-- and whether WorfGate cleared the mission.

CREATE TABLE IF NOT EXISTS sa_mission_debriefs (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id              TEXT NOT NULL,
  story_title           TEXT,
  -- Which client triggered this mission
  client_id             TEXT REFERENCES sa_client_security_policies(client_id),
  -- Which system initiated: 'story-agent' | 'cs-p3-material-investigation-agent' | 'ai-enterprise-os' | 'ui' | 'direct'
  initiated_by_project  TEXT NOT NULL DEFAULT 'story-agent'
    CHECK (initiated_by_project IN (
      'story-agent',
      'cs-p3-material-investigation-agent',
      'ai-enterprise-os',
      'ui',
      'direct'
    )),
  -- Security tier at execution time (denormalized from client policy for audit immutability)
  security_tier         TEXT NOT NULL DEFAULT 'enterprise'
    CHECK (security_tier IN ('regulated', 'enterprise', 'standard')),
  -- Session that triggered the mission (for user-session-id isolation auditing)
  session_id            TEXT,
  -- Crew that participated (subset or full 11)
  crew_participants     TEXT[] NOT NULL DEFAULT '{}',
  -- Fast mode: only critical crew (picard/data/worf) vs full 11
  fast_mode             BOOLEAN NOT NULL DEFAULT TRUE,
  -- WorfGate outcome
  worfgate_cleared      BOOLEAN NOT NULL DEFAULT FALSE,
  worfgate_veto_reason  TEXT,
  -- Mission outcome
  final_decision        TEXT,  -- 'proceed' | 'hold' | 'blocked' | 'needs_info'
  consensus_summary     TEXT,
  unresolved_risks      TEXT[] DEFAULT '{}',
  action_items          TEXT[] DEFAULT '{}',
  -- Phase tracking
  phase                 INTEGER NOT NULL DEFAULT 1
    CHECK (phase IN (1, 2)),
  -- Repo context
  repo_full_name        TEXT,
  branch                TEXT,
  pr_number             INTEGER,
  -- Timing
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  duration_ms           INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reconcile schema: sa_mission_debriefs may already exist from an earlier migration
-- (20260606_crew_starship_tables.sql) with a different column set, in which case the
-- CREATE TABLE IF NOT EXISTS above is a no-op. Converge to the security-aware schema so
-- the indexes/policies below succeed regardless of which migration created the table.
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS story_id              TEXT;
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS story_title           TEXT;
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS client_id             TEXT REFERENCES sa_client_security_policies(client_id);
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS initiated_by_project  TEXT DEFAULT 'story-agent';
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS security_tier         TEXT DEFAULT 'enterprise';
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS session_id            TEXT;
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS crew_participants     TEXT[] DEFAULT '{}';
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS fast_mode             BOOLEAN DEFAULT TRUE;
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS worfgate_cleared      BOOLEAN DEFAULT FALSE;
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS worfgate_veto_reason  TEXT;
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS final_decision        TEXT;
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS consensus_summary     TEXT;
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS unresolved_risks      TEXT[] DEFAULT '{}';
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS action_items          TEXT[] DEFAULT '{}';
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS phase                 INTEGER DEFAULT 1;
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS repo_full_name        TEXT;
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS branch                TEXT;
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS pr_number             INTEGER;
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS started_at            TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS completed_at          TIMESTAMPTZ;
ALTER TABLE sa_mission_debriefs ADD COLUMN IF NOT EXISTS duration_ms           INTEGER;

CREATE INDEX IF NOT EXISTS idx_sa_mission_debriefs_story_id
  ON sa_mission_debriefs(story_id);
CREATE INDEX IF NOT EXISTS idx_sa_mission_debriefs_client_id
  ON sa_mission_debriefs(client_id);
CREATE INDEX IF NOT EXISTS idx_sa_mission_debriefs_initiated_by
  ON sa_mission_debriefs(initiated_by_project);
CREATE INDEX IF NOT EXISTS idx_sa_mission_debriefs_created_at
  ON sa_mission_debriefs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sa_mission_debriefs_security_tier
  ON sa_mission_debriefs(security_tier);

ALTER TABLE sa_mission_debriefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON sa_mission_debriefs;
CREATE POLICY "Service role full access" ON sa_mission_debriefs
  USING (auth.role() = 'service_role');

-- ── Extend sa_stories with client tier ───────────────────────────────────────
-- Tracks which client tier governs each story (immutable once set).

ALTER TABLE sa_stories
  ADD COLUMN IF NOT EXISTS security_tier TEXT
    CHECK (security_tier IN ('regulated', 'enterprise', 'standard')),
  ADD COLUMN IF NOT EXISTS initiated_by_project TEXT DEFAULT 'story-agent';

COMMENT ON COLUMN sa_stories.security_tier IS
  'Security tier of the client that owns this story. regulated = Client gold standard.';
COMMENT ON COLUMN sa_stories.initiated_by_project IS
  'Which project created this story record: story-agent, cs-p3-material-investigation-agent, ai-enterprise-os, etc.';

-- ── HTTP Auth Audit Log ───────────────────────────────────────────────────────
-- Persistent audit log for HTTP MCP endpoint access decisions.
-- In-memory log in http-auth-middleware.ts is for hot path; this is the durable trail.

CREATE TABLE IF NOT EXISTS sa_http_auth_audit (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operation    TEXT NOT NULL,
  client_id    TEXT,
  session_id   TEXT,
  token_hash   TEXT,  -- SHA-256 of bearer token — never the token itself
  tier         TEXT,
  allowed      BOOLEAN NOT NULL,
  reason       TEXT NOT NULL,
  remote_addr  TEXT
);

CREATE INDEX IF NOT EXISTS idx_sa_http_auth_audit_timestamp
  ON sa_http_auth_audit(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sa_http_auth_audit_client_id
  ON sa_http_auth_audit(client_id);
CREATE INDEX IF NOT EXISTS idx_sa_http_auth_audit_allowed
  ON sa_http_auth_audit(allowed);

ALTER TABLE sa_http_auth_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON sa_http_auth_audit;
CREATE POLICY "Service role full access" ON sa_http_auth_audit
  USING (auth.role() = 'service_role');
