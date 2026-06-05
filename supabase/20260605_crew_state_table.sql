-- Crew State Persistence Table
-- Stores real-time crew execution state for archival and audit
-- Created: 2026-06-05

CREATE TABLE IF NOT EXISTS public.sa_crew_state (
  -- Primary key
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  
  -- Story reference
  story_ref TEXT NOT NULL,
  
  -- Execution phase
  phase TEXT NOT NULL CHECK (phase IN (
    'not_started',
    'phase_1_execution',
    'phase_2_revision',
    'complete'
  )),
  
  -- Overall status
  status TEXT NOT NULL CHECK (status IN (
    'pending',
    'in_progress',
    'blocked',
    'complete'
  )),
  
  -- Crew execution details (JSONB array)
  crew_executions JSONB NOT NULL DEFAULT '[]'::JSONB,
  
  -- Active crew members (TEXT array)
  active_crew_members TEXT[] NOT NULL DEFAULT '{}',
  
  -- Next step (human-readable)
  next_step TEXT NOT NULL,
  
  -- Any blockers
  blockers TEXT[] DEFAULT '{}',
  
  -- Aggregated metrics
  total_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  total_execution_time_ms INTEGER NOT NULL DEFAULT 0,
  broadcast_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Metadata
  project_id TEXT,
  user_id TEXT
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_sa_crew_state_story_ref 
  ON public.sa_crew_state(story_ref);

CREATE INDEX IF NOT EXISTS idx_sa_crew_state_status 
  ON public.sa_crew_state(status);

CREATE INDEX IF NOT EXISTS idx_sa_crew_state_phase 
  ON public.sa_crew_state(phase);

CREATE INDEX IF NOT EXISTS idx_sa_crew_state_updated_at 
  ON public.sa_crew_state(updated_at DESC);

-- Enable real-time broadcasts for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sa_crew_state;

-- Row-level security
ALTER TABLE public.sa_crew_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users"
  ON public.sa_crew_state
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users"
  ON public.sa_crew_state
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for story owners"
  ON public.sa_crew_state
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- JSON structure documentation for crew_executions JSONB:
-- [
--   {
--     "crewId": "captain",
--     "crewName": "Picard",
--     "specialty": "Strategic Decomposition",
--     "status": "complete|pending|executing|vetoed|error",
--     "findings": "string",
--     "recommendations": ["string"],
--     "confidence": 0-100,
--     "isVeto": boolean,
--     "costUsd": 0.0042,
--     "executedAt": "ISO8601",
--     "durationMs": 1240
--   }
-- ]
