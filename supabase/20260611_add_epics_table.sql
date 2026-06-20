-- Create epics table for tiered hierarchy
CREATE TABLE IF NOT EXISTS public.epics (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES public.clients(id),
    project_id TEXT REFERENCES public.sa_projects(id),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planned',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update stories to link to epics
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS epic_id TEXT REFERENCES public.epics(id);

COMMENT ON TABLE public.epics IS 'Large bodies of work that can be broken down into smaller stories.';