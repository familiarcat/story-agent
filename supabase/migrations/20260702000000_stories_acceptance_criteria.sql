-- Fix: 500 on POST /api/stories/import — PGRST204 "Could not find the 'acceptance_criteria'
-- column of 'stories'". Schema drift: db.ts upsertStory writes columns the live `stories` table
-- lacks. Additive + idempotent (IF NOT EXISTS) → safe, non-destructive, no data loss.
-- Crew-ruled GO (Observation Lounge): additive-only, WorfGate-governed, then reload PostgREST cache.

ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS epic_id TEXT;

-- Reload PostgREST's schema cache so the new columns are visible to the REST layer immediately.
NOTIFY pgrst, 'reload schema';
