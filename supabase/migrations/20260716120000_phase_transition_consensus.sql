-- Phase Transition Consensus Guardrails Schema
-- Deployed: 2026-07-16
-- Owner: O'Brien (Engineering) + Worf (Security)
-- Purpose: Parallel crew validation with AUTO/YELLOW/RED gates

-- 1. Phase Transition Validation Results (Main Table)
-- Partitioned by decision_gate for horizontal scaling
-- NOTE: PRIMARY KEY must include partitioning column (decision_gate)
CREATE TABLE sa_phase_transition_validation (
  id UUID DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL,
  from_phase TEXT NOT NULL,
  to_phase TEXT NOT NULL,
  
  -- Consensus Gate Results
  decision_gate TEXT NOT NULL CHECK (decision_gate IN ('AUTO', 'YELLOW', 'RED')),
  consensus_pass_count INT NOT NULL DEFAULT 0,
  consensus_threshold INT NOT NULL DEFAULT 8, -- 8/11 crew members
  
  -- Per-Crew Validation Results (JSON for extensibility)
  -- Each includes: { pass: bool, veto: bool, reason: string, executionTimeMs: int }
  picard_result JSONB,
  data_result JSONB,
  worf_result JSONB,
  riker_result JSONB,
  geordi_result JSONB,
  obrien_result JSONB,
  yar_result JSONB,
  troi_result JSONB,
  crusher_result JSONB,
  uhura_result JSONB,
  quark_result JSONB,
  
  -- Veto Tracking
  critical_vetos JSONB DEFAULT '[]'::jsonb, -- Array of { crewMember, reason }
  has_critical_veto BOOLEAN DEFAULT FALSE,
  
  -- Execution State
  executed_at TIMESTAMP,
  rollback_triggered_at TIMESTAMP,
  rollback_reason TEXT,
  
  -- Metadata
  validated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Audit & Security
  worfgate_audit_id UUID,
  is_immutable BOOLEAN DEFAULT TRUE,
  
  -- Composite PK must include partitioning column
  PRIMARY KEY (id, decision_gate)
) PARTITION BY LIST (decision_gate);

-- Partitions for each gate type (for query optimization)
CREATE TABLE sa_phase_transition_auto PARTITION OF sa_phase_transition_validation FOR VALUES IN ('AUTO');
CREATE TABLE sa_phase_transition_yellow PARTITION OF sa_phase_transition_validation FOR VALUES IN ('YELLOW');
CREATE TABLE sa_phase_transition_red PARTITION OF sa_phase_transition_validation FOR VALUES IN ('RED');

-- Enable RLS
ALTER TABLE sa_phase_transition_validation ENABLE ROW LEVEL SECURITY;

-- 2. Immutable Audit Trail (Blockchain-style append-only log)
CREATE TABLE sa_phase_validation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_result_id UUID NOT NULL,
  validation_decision_gate TEXT NOT NULL,
  
  -- Foreign key to composite primary key (id, decision_gate)
  CONSTRAINT fk_validation_result 
    FOREIGN KEY (validation_result_id, validation_decision_gate) 
    REFERENCES sa_phase_transition_validation(id, decision_gate) 
    ON DELETE RESTRICT,
  
  -- Crew Validation Entry
  crew_member TEXT NOT NULL,
  vote_pass BOOLEAN NOT NULL,
  veto_triggered BOOLEAN DEFAULT FALSE,
  veto_type TEXT CHECK (veto_type IS NULL OR veto_type IN ('hard', 'soft')),
  veto_reason TEXT,
  criticality TEXT,
  
  -- Execution Metrics
  execution_time_ms INT,
  validation_timestamp TIMESTAMP NOT NULL,
  
  -- Immutability Hash (prevents tampering)
  content_hash TEXT NOT NULL, -- SHA-256 of all fields
  previous_hash TEXT, -- Link to prior entry (blockchain-style)
  
  -- Security & Compliance
  worfgate_clearance BOOLEAN DEFAULT FALSE,
  security_context JSONB, -- Encryption key reference, not the key itself
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  -- No update allowed — immutable by design
  
  CONSTRAINT immutable_no_update CHECK (created_at IS NOT NULL)
) WITH (fillfactor = 70); -- Optimize for append-only pattern

-- Enable RLS on audit table
ALTER TABLE sa_phase_validation_audit ENABLE ROW LEVEL SECURITY;

-- 3. Decision Authority History (Tracks AUTO gate usage patterns)
CREATE TABLE sa_phase_gate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL,
  validation_id UUID NOT NULL,
  validation_decision_gate TEXT NOT NULL,
  
  -- Foreign key to composite primary key
  CONSTRAINT fk_validation_history
    FOREIGN KEY (validation_id, validation_decision_gate)
    REFERENCES sa_phase_transition_validation(id, decision_gate),
  
  -- Gate Decision
  consensus_percentage NUMERIC(5, 2),
  veto_count INT DEFAULT 0,
  
  -- Authority Chain
  decided_by TEXT, -- 'crew' for AUTO, 'riker' for YELLOW, 'admiral' for RED
  decided_at TIMESTAMP NOT NULL,
  
  -- Outcome
  transition_allowed BOOLEAN,
  transition_executed_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enable RLS on gate history table
ALTER TABLE sa_phase_gate_history ENABLE ROW LEVEL SECURITY;

-- 4. Real-Time Monitoring Snapshots (5-minute samples per Quark's cost control)
CREATE TABLE sa_phase_validation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Window (5-minute intervals)
  metric_window_start TIMESTAMP NOT NULL,
  metric_window_end TIMESTAMP NOT NULL,
  
  -- Aggregates (sampled, not continuous)
  total_transitions INT DEFAULT 0,
  auto_gate_count INT DEFAULT 0,
  yellow_gate_count INT DEFAULT 0,
  red_gate_count INT DEFAULT 0,
  
  -- Performance
  avg_validation_time_ms NUMERIC(10, 2),
  max_validation_time_ms INT,
  min_validation_time_ms INT,
  
  -- Safety
  veto_count INT DEFAULT 0,
  post_transition_vetos INT DEFAULT 0, -- False consensus detection
  rollback_count INT DEFAULT 0,
  
  -- Crew Health
  crew_participation_rate NUMERIC(5, 2), -- % of crew who participated
  crew_consensus_quality NUMERIC(5, 2), -- Variance in votes
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. Indexes for Performance
CREATE INDEX idx_phase_validation_story ON sa_phase_transition_validation(story_id, validated_at DESC);
CREATE INDEX idx_phase_validation_gate ON sa_phase_transition_validation(decision_gate, validated_at DESC);
CREATE INDEX idx_phase_validation_time ON sa_phase_transition_validation(validated_at DESC);
CREATE INDEX idx_audit_validation ON sa_phase_validation_audit(validation_result_id);
CREATE INDEX idx_audit_crew ON sa_phase_validation_audit(crew_member, created_at DESC);
CREATE INDEX idx_audit_time ON sa_phase_validation_audit(validation_timestamp DESC);
CREATE INDEX idx_gate_history_story ON sa_phase_gate_history(story_id, decided_at DESC);
CREATE INDEX idx_metrics_window ON sa_phase_validation_metrics(metric_window_start DESC);

-- Partial indexes for query optimization
CREATE INDEX idx_phase_auto_incomplete ON sa_phase_transition_auto(story_id) WHERE executed_at IS NULL;
CREATE INDEX idx_phase_yellow_pending ON sa_phase_transition_yellow(story_id) WHERE executed_at IS NULL;
CREATE INDEX idx_phase_red_critical ON sa_phase_transition_red(story_id) WHERE executed_at IS NULL;

-- 6. RLS Policies (Simplified for compatibility)

-- Policy 1: All authenticated users can view validation results
CREATE POLICY "view_validation" ON sa_phase_transition_validation
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 2: Only system roles can modify validation records
CREATE POLICY "system_modify_validation" ON sa_phase_transition_validation
  FOR UPDATE USING (auth.role() IN ('service_role', 'system'));

-- Policy 3: Audit trail is append-only (view only)
CREATE POLICY "view_audit" ON sa_phase_validation_audit
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "append_audit" ON sa_phase_validation_audit
  FOR INSERT WITH CHECK (auth.role() IN ('service_role', 'system'));

-- Policy 4: Gate history visible to all authenticated users
CREATE POLICY "view_gate_history" ON sa_phase_gate_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- 7. Triggers

-- Prevent modifications to audit table
CREATE OR REPLACE FUNCTION prevent_audit_modification() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit trail is immutable — no modifications allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_immutable_trigger
  BEFORE UPDATE OR DELETE ON sa_phase_validation_audit
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- 8. Helper Functions

-- Calculate consensus percentage
CREATE OR REPLACE FUNCTION calculate_consensus_percentage(
  p_pass_count INT,
  p_total_crew INT DEFAULT 11
) RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND((100.0 * p_pass_count / p_total_crew)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Detect false consensus (post-transition veto)
CREATE OR REPLACE FUNCTION detect_false_consensus(
  p_validation_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_false_consensus BOOLEAN;
BEGIN
  SELECT (
    SELECT COUNT(*) FROM sa_phase_validation_audit 
    WHERE validation_result_id = p_validation_id 
    AND veto_triggered = TRUE 
    AND created_at > (
      SELECT executed_at FROM sa_phase_transition_validation 
      WHERE id = p_validation_id
    )
  ) > 0 INTO v_false_consensus;
  
  RETURN COALESCE(v_false_consensus, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Get real-time AUTO gate percentage (last 7 days)
CREATE OR REPLACE FUNCTION get_auto_gate_percentage_7d()
RETURNS TABLE(auto_percentage NUMERIC, total_transitions INT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(100.0 * COUNT(CASE WHEN decision_gate = 'AUTO' THEN 1 END) / COUNT(*)::NUMERIC, 2),
    COUNT(*)::INT
  FROM sa_phase_transition_validation
  WHERE validated_at >= NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
