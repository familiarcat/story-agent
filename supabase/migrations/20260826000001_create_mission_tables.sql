-- supabase/migrations/20260826000001_create_mission_tables.sql
-- 
-- Create mission system tables:
-- - sa_missions: Core mission records
-- - sa_mission_execution_stream: Real-time execution logs
-- - sa_mission_findings: Parsed findings from crew analysis
-- 
-- All tables:
-- - Prefixed with sa_ (Story Agent)
-- - Use JSONB for flexible data (findings, escalation options)
-- - Include indexes for common queries
-- - Support multi-tenant (tenant_id column)
-- - Have audit timestamps (created_at, updated_at)

-- ============================================================================
-- TABLE: sa_missions
-- Core mission records, one per user request
-- ============================================================================

CREATE TABLE IF NOT EXISTS sa_missions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'story-agent',
  
  -- User intent
  user_input TEXT NOT NULL,
  
  -- Auto-classification
  category VARCHAR(3) NOT NULL, -- 'A1', 'A2', 'B1', 'B2', 'B3'
  infra_type VARCHAR(20) NOT NULL, -- 'ephemeral', 'persistent'
  classification_confidence DECIMAL(3, 2) NOT NULL,
  classification_reasoning TEXT,
  
  -- Crew assignment
  assigned_crew TEXT[] NOT NULL, -- ARRAY['data', 'geordi', ...]
  primary_owner VARCHAR(32),
  
  -- Execution state
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Cost tracking
  estimated_cost_usd DECIMAL(8, 5),
  actual_cost_usd DECIMAL(8, 5),
  model_tier VARCHAR(20), -- 'frugal', 'standard', 'frontier'
  cost_breakdown JSONB, -- { 'data': 0.001, 'picard': 0.002 }
  tokens_used INTEGER,
  
  -- Results
  findings JSONB, -- Array of { id, issue, file, line, fix, owner, effort, severity }
  stakeholder_impact TEXT,
  
  -- Escalation (if crew needs decision)
  escalation_needed BOOLEAN DEFAULT FALSE,
  escalation_options JSONB, -- Array of { id, label, approach, cost, timeline, risk, recommendation }
  escalation_choice VARCHAR(32),
  
  -- Follow-up suggestions
  suggested_next_missions JSONB, -- Array of { category, description, reasoning, impact }
  
  -- Error tracking
  error_message TEXT,
  
  -- Audit
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'escalation_needed', 'complete', 'failed')),
  CONSTRAINT valid_category CHECK (category IN ('A1', 'A2', 'B1', 'B2', 'B3')),
  CONSTRAINT valid_infra_type CHECK (infra_type IN ('ephemeral', 'persistent')),
  CONSTRAINT valid_model_tier CHECK (model_tier IS NULL OR model_tier IN ('frugal', 'standard', 'frontier'))
);

-- Indexes for common queries
CREATE INDEX idx_sa_missions_tenant_status ON sa_missions(tenant_id, status);
CREATE INDEX idx_sa_missions_category ON sa_missions(category);
CREATE INDEX idx_sa_missions_created_at ON sa_missions(created_at DESC);
CREATE INDEX idx_sa_missions_status ON sa_missions(status);
CREATE INDEX idx_sa_missions_tenant_category ON sa_missions(tenant_id, category);

-- ============================================================================
-- TABLE: sa_mission_execution_stream
-- Real-time execution logs, many per mission
-- Streamed to clients via WebSocket for live feed
-- ============================================================================

CREATE TABLE IF NOT EXISTS sa_mission_execution_stream (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES sa_missions(id) ON DELETE CASCADE,
  
  crew_id VARCHAR(32) NOT NULL, -- 'data', 'picard', 'troi', 'geordi', etc.
  domain VARCHAR(32), -- 'architecture', 'infrastructure', 'stakeholder', etc.
  
  -- Log level (UI filters to show only 'info', 'action', 'escalation')
  level VARCHAR(20) NOT NULL, -- 'debug', 'info', 'action', 'escalation'
  
  -- Natural language narration from crew
  text TEXT NOT NULL,
  emoji VARCHAR(10),
  
  -- Additional data
  metadata JSONB,
  file_references JSONB, -- Array of { file, line }
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_level CHECK (level IN ('debug', 'info', 'action', 'escalation'))
);

-- Indexes for streaming queries
CREATE INDEX idx_sa_mission_exec_mission_id ON sa_mission_execution_stream(mission_id);
CREATE INDEX idx_sa_mission_exec_level ON sa_mission_execution_stream(level);
CREATE INDEX idx_sa_mission_exec_crew_id ON sa_mission_execution_stream(crew_id);
CREATE INDEX idx_sa_mission_exec_created_at ON sa_mission_execution_stream(created_at DESC);

-- Composite index for common real-time query (mission + time)
CREATE INDEX idx_sa_mission_exec_mission_time ON sa_mission_execution_stream(mission_id, created_at DESC);

-- ============================================================================
-- TABLE: sa_mission_findings
-- Parsed findings from crew analysis (denormalized from sa_missions.findings JSONB)
-- Allows efficient filtering/aggregation of individual issues
-- ============================================================================

CREATE TABLE IF NOT EXISTS sa_mission_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES sa_missions(id) ON DELETE CASCADE,
  
  issue TEXT NOT NULL, -- "Missing return type annotation"
  file TEXT NOT NULL, -- "src/utils/helpers.ts"
  line INTEGER, -- Line number or NULL if not applicable
  suggested_fix TEXT,
  owner TEXT, -- "Frontend team" or crew member name
  effort_minutes INTEGER,
  severity VARCHAR(20), -- 'low', 'medium', 'high'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high'))
);

-- Indexes for finding queries
CREATE INDEX idx_sa_mission_findings_mission_id ON sa_mission_findings(mission_id);
CREATE INDEX idx_sa_mission_findings_severity ON sa_mission_findings(severity);
CREATE INDEX idx_sa_mission_findings_owner ON sa_mission_findings(owner);
CREATE INDEX idx_sa_mission_findings_file ON sa_mission_findings(file);

-- Composite index for efficient filtering
CREATE INDEX idx_sa_mission_findings_mission_severity ON sa_mission_findings(mission_id, severity);

-- ============================================================================
-- TABLE: sa_mission_follow_ups (Optional, for future expansion)
-- Stores user choices on follow-up suggestions
-- Allows tracking of mission chains and user behavior
-- ============================================================================

CREATE TABLE IF NOT EXISTS sa_mission_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_mission_id UUID NOT NULL REFERENCES sa_missions(id) ON DELETE CASCADE,
  child_mission_id UUID REFERENCES sa_missions(id) ON DELETE SET NULL,
  
  -- Original suggestion data
  category VARCHAR(3) NOT NULL,
  description TEXT NOT NULL,
  reasoning TEXT,
  impact TEXT,
  
  -- User action
  user_clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_category CHECK (category IN ('A1', 'A2', 'B1', 'B2', 'B3'))
);

-- Indexes for follow-up tracking
CREATE INDEX idx_sa_mission_follow_ups_parent ON sa_mission_follow_ups(parent_mission_id);
CREATE INDEX idx_sa_mission_follow_ups_clicked ON sa_mission_follow_ups(user_clicked);

-- ============================================================================
-- HELPER FUNCTIONS (PL/pgSQL)
-- ============================================================================

-- Update updated_at timestamp on sa_missions
CREATE OR REPLACE FUNCTION update_sa_missions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sa_missions_updated_at
BEFORE UPDATE ON sa_missions
FOR EACH ROW
EXECUTE FUNCTION update_sa_missions_updated_at();

-- ============================================================================
-- ROLE-BASED ACCESS CONTROL (RLS)
-- Note: These policies assume a multi-tenant setup.
-- Adjust based on your Supabase authentication scheme.
-- ============================================================================

-- Enable RLS on all mission tables
ALTER TABLE sa_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_mission_execution_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_mission_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_mission_follow_ups ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write their tenant's missions
-- (Adjust this policy based on your actual tenant model)
CREATE POLICY "Allow authenticated users to manage their missions"
  ON sa_missions
  FOR ALL
  USING (
    auth.role() = 'authenticated' 
    AND tenant_id = 'story-agent'
  );

CREATE POLICY "Allow authenticated users to read execution logs"
  ON sa_mission_execution_stream
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM sa_missions
      WHERE sa_missions.id = sa_mission_execution_stream.mission_id
      AND sa_missions.tenant_id = 'story-agent'
    )
  );

CREATE POLICY "Allow crew to write execution logs"
  ON sa_mission_execution_stream
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM sa_missions
      WHERE sa_missions.id = sa_mission_execution_stream.mission_id
      AND sa_missions.tenant_id = 'story-agent'
    )
  );

CREATE POLICY "Allow users to read findings for their missions"
  ON sa_mission_findings
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM sa_missions
      WHERE sa_missions.id = sa_mission_findings.mission_id
      AND sa_missions.tenant_id = 'story-agent'
    )
  );

CREATE POLICY "Allow crew to write findings"
  ON sa_mission_findings
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM sa_missions
      WHERE sa_missions.id = sa_mission_findings.mission_id
      AND sa_missions.tenant_id = 'story-agent'
    )
  );

-- ============================================================================
-- SEED DATA (OPTIONAL - for testing)
-- ============================================================================

-- Uncomment to seed sample mission for testing
-- INSERT INTO sa_missions (
--   user_input,
--   category,
--   infra_type,
--   classification_confidence,
--   classification_reasoning,
--   assigned_crew,
--   primary_owner,
--   status,
--   estimated_cost_usd,
--   model_tier
-- ) VALUES (
--   'Audit TypeScript strict mode across repo',
--   'A1',
--   'ephemeral',
--   0.95,
--   'Matched to A1 (deterministic linter task)',
--   ARRAY['data'],
--   'picard',
--   'pending',
--   0.002,
--   'frugal'
-- );

