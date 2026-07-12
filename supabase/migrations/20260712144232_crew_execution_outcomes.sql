-- crew_execution_outcomes: Real-time execution status tracking for crew tasks
-- Records every crew task execution attempt with outcome, duration, and performance metrics.
-- Used for live status display + RAG outcome memory.

CREATE TABLE IF NOT EXISTS public.crew_execution_outcomes (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id           TEXT        NOT NULL,
  attempt_id        TEXT        NOT NULL,
  task_description  TEXT        NOT NULL,
  status            TEXT        NOT NULL CHECK (status IN ('success', 'blocked', 'retry', 'failed')),
  duration_seconds  INTEGER     NOT NULL,
  confidence_level  TEXT        CHECK (confidence_level IN ('high', 'medium', 'low', 'unknown')),
  error_message     TEXT,
  files_touched     JSONB       DEFAULT '[]'::jsonb,
  recovery_attempts INTEGER     DEFAULT 0,
  complexity_estimate TEXT,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite primary key for unique task attempt tracking
CREATE UNIQUE INDEX IF NOT EXISTS crew_execution_outcomes_crew_attempt_idx
  ON public.crew_execution_outcomes (crew_id, attempt_id);

-- Indexes for querying active + recent outcomes
CREATE INDEX IF NOT EXISTS crew_execution_outcomes_timestamp_idx
  ON public.crew_execution_outcomes (timestamp DESC);

CREATE INDEX IF NOT EXISTS crew_execution_outcomes_status_timestamp_idx
  ON public.crew_execution_outcomes (status, timestamp DESC);

CREATE INDEX IF NOT EXISTS crew_execution_outcomes_crew_id_idx
  ON public.crew_execution_outcomes (crew_id);

CREATE INDEX IF NOT EXISTS crew_execution_outcomes_crew_timestamp_idx
  ON public.crew_execution_outcomes (crew_id, timestamp DESC);

-- RLS: Service role only (crew server + Next.js routes)
ALTER TABLE public.crew_execution_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.crew_execution_outcomes;
CREATE POLICY "Service role full access" ON public.crew_execution_outcomes
  USING (auth.role() = 'service_role');
