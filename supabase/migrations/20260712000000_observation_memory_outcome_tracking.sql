-- Add outcome tracking to observation memories
-- Allows crew to record success/failure of deliberations for learning and future reference

ALTER TABLE public.sa_observation_memories
ADD COLUMN outcome TEXT CHECK (outcome IN ('pending', 'success', 'partial', 'failed')) DEFAULT 'pending',
ADD COLUMN outcome_notes TEXT,
ADD COLUMN execution_completed_at TIMESTAMPTZ;

-- Index for querying outcomes (helps RAG find successes/failures for similar prompts)
CREATE INDEX IF NOT EXISTS sa_observation_memories_outcome_idx
  ON public.sa_observation_memories (outcome);

-- Index for finding recent outcomes
CREATE INDEX IF NOT EXISTS sa_observation_memories_outcome_completed_idx
  ON public.sa_observation_memories (outcome, execution_completed_at DESC);

-- Index for querying by story + outcome (helps correlate deliberation → execution)
CREATE INDEX IF NOT EXISTS sa_observation_memories_story_outcome_idx
  ON public.sa_observation_memories (story_id, outcome);
