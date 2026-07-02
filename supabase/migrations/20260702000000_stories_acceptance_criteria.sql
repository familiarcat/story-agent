-- Fix: 500 on POST /api/stories/import + garbage dashboard reads.
-- ROOT CAUSE: db.ts delivery functions (upsertStory/getStory/listStories) targeted the WRONG table
-- `stories` (the agile/PM table: sprint_id, story_points, personas) instead of the delivery table
-- `sa_stories` (story_url, repo_full_name, branch, pr_*, phase, notes). The code now targets
-- sa_stories; this migration adds the hierarchy/client columns sa_stories was missing but the code
-- writes/filters on. Additive + idempotent (IF NOT EXISTS) → safe, non-destructive.
-- Crew-ruled GO (Observation Lounge). See RAG mem 131 + follow-up.

ALTER TABLE public.sa_stories ADD COLUMN IF NOT EXISTS client_id           TEXT;
ALTER TABLE public.sa_stories ADD COLUMN IF NOT EXISTS project_id          TEXT;
ALTER TABLE public.sa_stories ADD COLUMN IF NOT EXISTS epic_id             TEXT;
ALTER TABLE public.sa_stories ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT;

CREATE INDEX IF NOT EXISTS sa_stories_client_id_idx ON public.sa_stories (client_id);

-- Reload PostgREST's schema cache so the new columns are visible to the REST layer immediately.
NOTIFY pgrst, 'reload schema';
