-- Velocity Tracking System — Supabase Schema
-- Created: 2026-07-16
-- Stores crew velocity metrics, sprint forecasts, and historical trends

-- 1. Velocity Snapshots (Primary storage for metrics)
CREATE TABLE IF NOT EXISTS sa_velocity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Context
  sprint_id TEXT NOT NULL,
  release_id TEXT,
  crew_member_id TEXT, -- NULL = sprint-level aggregate
  feature_type TEXT CHECK (feature_type IN ('infrastructure', 'logic', 'ui', 'security', 'testing', NULL)),
  
  -- Completion Metrics
  story_points_completed INTEGER NOT NULL DEFAULT 0,
  cycle_time_hours NUMERIC,
  completion_rate NUMERIC CHECK (completion_rate >= 0 AND completion_rate <= 1),
  blocked_hours NUMERIC DEFAULT 0,
  
  -- Velocity
  current_velocity_points_per_hour NUMERIC,
  
  -- Forecast
  remaining_points INTEGER,
  forecast_hours_to_completion NUMERIC,
  forecast_completion_date DATE,
  confidence_50_date DATE,
  confidence_80_date DATE,
  confidence_95_date DATE,
  
  -- Risk Assessment
  identified_blockers JSONB, -- Array of blocker descriptions
  scope_creep_delta INTEGER DEFAULT 0,
  quality_rework_estimate NUMERIC DEFAULT 0,
  
  -- Full snapshot (for reconstruction)
  metrics_json JSONB NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_velocity_sprint_crew 
  ON sa_velocity_snapshots(sprint_id, crew_member_id, snapshot_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_velocity_sprint_timestamp 
  ON sa_velocity_snapshots(sprint_id, snapshot_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_velocity_feature_type 
  ON sa_velocity_snapshots(feature_type, snapshot_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_velocity_crew_member 
  ON sa_velocity_snapshots(crew_member_id, snapshot_timestamp DESC);

-- 2. Story Complexity Tracking (derived from cost ledger)
CREATE TABLE IF NOT EXISTS sa_story_complexity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL UNIQUE,
  story_reference TEXT, -- e.g., "PROD-30"
  
  -- Complexity signals
  estimated_tokens INTEGER,
  complexity_level TEXT CHECK (complexity_level IN ('low', 'medium', 'high')),
  feature_type TEXT CHECK (feature_type IN ('infrastructure', 'logic', 'ui', 'security', 'testing', NULL)),
  
  -- Derived
  cost_per_story_point NUMERIC,
  average_cycle_hours NUMERIC,
  
  -- Metadata
  first_observed TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  sample_count INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_story_complexity_level 
  ON sa_story_complexity(complexity_level);
CREATE INDEX IF NOT EXISTS idx_story_complexity_feature 
  ON sa_story_complexity(feature_type);

-- 3. Story Risk Flags (real-time alerting)
CREATE TABLE IF NOT EXISTS sa_story_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL,
  story_reference TEXT, -- e.g., "PROD-30"
  
  -- Risk assessment
  time_percentage INTEGER, -- % of estimated time elapsed
  estimated_progress INTEGER, -- % complete (0-100)
  risk_level TEXT CHECK (risk_level IN ('warning', 'critical')),
  recommendation TEXT,
  
  -- Escalation
  escalated_to TEXT, -- Crew member ID
  escalated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_risks_level 
  ON sa_story_risks(risk_level, resolved_at);
CREATE INDEX IF NOT EXISTS idx_story_risks_story 
  ON sa_story_risks(story_id, resolved_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_risks_escalated_to 
  ON sa_story_risks(escalated_to, resolved_at DESC);

-- 4. Crew Reallocation Recommendations
CREATE TABLE IF NOT EXISTS sa_crew_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id TEXT NOT NULL,
  release_id TEXT,
  
  -- Recommendation details
  recommendation_type TEXT CHECK (recommendation_type IN ('reallocation', 'adjustment', 'risk-mitigation')),
  bottleneck_type TEXT, -- e.g., "ui", "infrastructure"
  bottleneck_crew TEXT, -- Crew member behind schedule
  
  -- Suggested action
  action TEXT,
  affected_stories JSONB, -- Array of story IDs
  estimated_impact NUMERIC, -- Estimated days saved
  
  -- Status
  status TEXT CHECK (status IN ('open', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recommendations_sprint 
  ON sa_crew_recommendations(sprint_id, status);
CREATE INDEX IF NOT EXISTS idx_recommendations_type 
  ON sa_crew_recommendations(recommendation_type, status);

-- 5. Velocity Adjustments (auto-learned improvements)
CREATE TABLE IF NOT EXISTS sa_velocity_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was adjusted
  feature_type TEXT CHECK (feature_type IN ('infrastructure', 'logic', 'ui', 'security', 'testing')),
  
  -- Before / After
  baseline_before NUMERIC,
  baseline_after NUMERIC,
  adjustment_percent NUMERIC,
  
  -- Why
  reason TEXT,
  data_points_used INTEGER,
  variance_observed NUMERIC,
  
  -- Metadata
  adjusted_by TEXT, -- Crew member or 'auto'
  created_at TIMESTAMP DEFAULT NOW(),
  effective_sprint TEXT -- Sprint this takes effect in
);

CREATE INDEX IF NOT EXISTS idx_velocity_adjustments_feature 
  ON sa_velocity_adjustments(feature_type, created_at DESC);

-- 6. Crew Hours Tracking (mirrors cost ledger, cached for queries)
CREATE TABLE IF NOT EXISTS sa_crew_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  crew_member_id TEXT NOT NULL,
  sprint_id TEXT,
  
  -- Hours & Cost
  total_hours NUMERIC,
  total_cost_usd NUMERIC,
  total_tokens INTEGER,
  
  -- Efficiency
  hours_productive NUMERIC, -- Excluding meetings/admin
  blocked_hours NUMERIC,
  context_switch_overhead NUMERIC,
  
  -- Metadata
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crew_hours_member 
  ON sa_crew_hours(crew_member_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_crew_hours_sprint 
  ON sa_crew_hours(sprint_id, crew_member_id);

-- 7. Sprint Summary (rolled-up view)
CREATE TABLE IF NOT EXISTS sa_sprint_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  sprint_id TEXT NOT NULL UNIQUE,
  release_id TEXT,
  
  -- Planned vs Actual
  story_points_planned INTEGER,
  story_points_completed INTEGER,
  completion_rate NUMERIC,
  
  -- Velocity trend
  average_cycle_time NUMERIC,
  median_cycle_time NUMERIC,
  velocity_points_per_hour NUMERIC,
  
  -- Quality
  rework_rate NUMERIC,
  defect_rate NUMERIC,
  
  -- Risk Assessment
  total_blockers INTEGER,
  blocker_hours NUMERIC,
  risk_score NUMERIC,
  scope_creep_delta INTEGER,
  
  -- Timeline
  forecast_completion_date DATE,
  confidence_80_date DATE,
  confidence_95_date DATE,
  actual_completion_date DATE,
  
  -- Retrospective
  accuracy_percent NUMERIC, -- |forecast - actual| / actual
  lessons_learned JSONB,
  
  -- Metadata
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sprint_summary_dates 
  ON sa_sprint_summary(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_sprint_summary_release 
  ON sa_sprint_summary(release_id);

-- 8. Velocity Baseline History (for trend analysis)
CREATE TABLE IF NOT EXISTS sa_velocity_baseline_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  snapshot_date DATE NOT NULL,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('infrastructure', 'logic', 'ui', 'security', 'testing')),
  
  -- Baseline metrics
  avg_story_points_per_hour NUMERIC,
  avg_cycle_time_hours NUMERIC,
  variance NUMERIC,
  
  -- Sample
  stories_completed INTEGER,
  data_quality TEXT CHECK (data_quality IN ('low', 'medium', 'high')),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baseline_history_feature 
  ON sa_velocity_baseline_history(feature_type, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_baseline_history_date 
  ON sa_velocity_baseline_history(snapshot_date DESC);

-- 9. Estimation Accuracy Tracking (for model refinement)
CREATE TABLE IF NOT EXISTS sa_estimation_accuracy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  story_id TEXT NOT NULL,
  story_reference TEXT,
  
  -- Estimate vs Actual
  estimated_story_points INTEGER,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  
  -- Accuracy
  error_percent NUMERIC, -- |estimated - actual| / actual * 100
  feature_type TEXT,
  complexity_level TEXT,
  
  -- Context
  assigned_crew TEXT,
  sprint_id TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimation_accuracy_error 
  ON sa_estimation_accuracy(error_percent DESC);
CREATE INDEX IF NOT EXISTS idx_estimation_accuracy_feature 
  ON sa_estimation_accuracy(feature_type, error_percent DESC);
CREATE INDEX IF NOT EXISTS idx_estimation_accuracy_crew 
  ON sa_estimation_accuracy(assigned_crew, error_percent DESC);

-- Grants (for public access if needed)
ALTER TABLE sa_velocity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_story_complexity ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_story_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_crew_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_velocity_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_crew_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_sprint_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_velocity_baseline_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_estimation_accuracy ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be configured per client/auth model
-- For now, policies are comment-placeholders

/*
-- Example RLS Policy: Allow crew members to see their own metrics
CREATE POLICY "crew_can_read_own_velocity"
  ON sa_velocity_snapshots
  FOR SELECT
  USING (auth.uid()::text = crew_member_id OR crew_member_id IS NULL);

-- Example RLS Policy: Only Picard (epic lead) can mark stories as risk
CREATE POLICY "picard_manage_risks"
  ON sa_story_risks
  FOR ALL
  USING (current_setting('request.jwt.claims'::text)::jsonb->>'sub' = 'picard');
*/
