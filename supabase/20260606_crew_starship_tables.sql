-- ============================================================================
-- Sovereign Factory Starship — Autonomous Crew System Tables
-- ============================================================================
-- Run after migration.sql
-- All tables prefixed sa_ per project convention

-- Crew persona records (Memory Alpha canonical baseline)
-- Tracks what version of canonical persona data we've scraped
CREATE TABLE IF NOT EXISTS sa_crew_personas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  crew_id TEXT NOT NULL,
  -- SHA-256 hash of Memory Alpha source content — change detection
  canonical_hash TEXT NOT NULL,
  -- Extracted from Memory Alpha
  personality_descriptors JSONB,
  defining_moments JSONB,
  canonical_quotes JSONB,
  domain_specialties JSONB,
  collaborative_context JSONB,
  -- Where we scraped it from
  source_url TEXT,
  last_scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sa_crew_personas_crew_id ON sa_crew_personas(crew_id);

-- Crew skill manifests — versioned, improvable prompt templates per crew member
-- Each row is a version snapshot; latest version is the active manifest
CREATE TABLE IF NOT EXISTS sa_crew_skills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  crew_id TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  -- SHA-256 of persona source that seeded this manifest
  canonical_persona_hash TEXT NOT NULL DEFAULT 'memory-alpha-seed-v1',
  -- The actual prompt content (all TEXT, not JSONB — these are prompt strings)
  base_system_prompt TEXT NOT NULL,
  domain_system_prompt TEXT NOT NULL,
  mission_context_template TEXT NOT NULL,
  -- JSONB for structured data
  tool_usage_examples JSONB DEFAULT '[]'::jsonb,
  self_improvement_notes JSONB DEFAULT '[]'::jsonb,
  -- Audit trail
  improvement_source TEXT DEFAULT 'initial_seed'
    CHECK (improvement_source IN ('mission_debrief', 'human_review', 'peer_feedback', 'initial_seed')),
  last_improved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sa_crew_skills_crew_id ON sa_crew_skills(crew_id);
CREATE INDEX IF NOT EXISTS idx_sa_crew_skills_created_at ON sa_crew_skills(created_at DESC);

-- MCP tool registry — crew-evaluated external tools
-- Tools go through: proposed → under_evaluation → approved/rejected/deprecated
CREATE TABLE IF NOT EXISTS sa_tool_registry (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  capabilities JSONB DEFAULT '[]'::jsonb,
  endpoint TEXT,
  source_reference TEXT,
  quality_score FLOAT DEFAULT 0,
  cost_profile TEXT DEFAULT 'free'
    CHECK (cost_profile IN ('free', 'paid', 'self-hosted')),
  security_clearance TEXT DEFAULT 'review'
    CHECK (security_clearance IN ('approved', 'review', 'blocked')),
  status TEXT DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'under_evaluation', 'approved', 'rejected', 'deprecated')),
  -- Worf veto — if true, tool is blocked regardless of other votes
  worf_veto BOOLEAN DEFAULT FALSE,
  worf_veto_reason TEXT,
  -- Per-crew vote records
  crew_votes JSONB DEFAULT '{}'::jsonb,
  crew_evaluation_notes JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sa_tool_registry_status ON sa_tool_registry(status);
CREATE INDEX IF NOT EXISTS idx_sa_tool_registry_category ON sa_tool_registry(category);
CREATE INDEX IF NOT EXISTS idx_sa_tool_registry_security_clearance ON sa_tool_registry(security_clearance);

-- Mission debrief records — the self-learning feedback loop
-- Each debrief generates improvement proposals per crew member
CREATE TABLE IF NOT EXISTS sa_mission_debriefs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mission_id TEXT NOT NULL,
  crew_id TEXT NOT NULL,
  -- Structured findings from the debrief
  findings JSONB,           -- what worked, what didn't
  proposed_improvements JSONB,  -- improvement proposals with confidence scores
  approved_improvements JSONB,  -- improvements that passed validation and were applied
  -- Audit trail
  worf_reviewed BOOLEAN DEFAULT FALSE,
  data_validated BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sa_mission_debriefs_mission_id ON sa_mission_debriefs(mission_id);
CREATE INDEX IF NOT EXISTS idx_sa_mission_debriefs_crew_id ON sa_mission_debriefs(crew_id);
