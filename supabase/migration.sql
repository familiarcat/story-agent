-- story-agent Supabase migration
-- Run once against the shared Supabase instance (same project as ai-enterprise-os)
-- Tables are prefixed sa_ to avoid collisions with existing sovereign-factory tables.

-- ── Projects ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sa_projects (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  repo_full_name TEXT NOT NULL UNIQUE,
  aha_project_id TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sa_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.sa_projects USING (auth.role() = 'service_role');

-- ── Stories ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sa_stories (
  id             TEXT PRIMARY KEY,
  story_id       TEXT NOT NULL UNIQUE,
  story_title    TEXT NOT NULL,
  story_url      TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  branch         TEXT NOT NULL,
  base_branch    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  pr_number      INTEGER,
  pr_url         TEXT,
  pr_status      TEXT,
  phase          INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes          TEXT
);

CREATE INDEX IF NOT EXISTS sa_stories_status_idx    ON public.sa_stories (status);
CREATE INDEX IF NOT EXISTS sa_stories_updated_at_idx ON public.sa_stories (updated_at DESC);

ALTER TABLE public.sa_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.sa_stories USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_sa_stories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sa_stories_updated_at
  BEFORE UPDATE ON public.sa_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_sa_stories_updated_at();

-- ── PR Comments ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sa_pr_comments (
  id         TEXT PRIMARY KEY,
  story_id   TEXT NOT NULL REFERENCES public.sa_stories(story_id) ON DELETE CASCADE,
  pr_number  INTEGER NOT NULL,
  author     TEXT NOT NULL,
  body       TEXT NOT NULL,
  path       TEXT,
  line       INTEGER,
  state      TEXT NOT NULL DEFAULT 'SUBMITTED',
  created_at TIMESTAMPTZ NOT NULL,
  url        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sa_pr_comments_story_id_idx ON public.sa_pr_comments (story_id);

ALTER TABLE public.sa_pr_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.sa_pr_comments USING (auth.role() = 'service_role');

-- ── Revision Cycles ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sa_revision_cycles (
  id                  TEXT PRIMARY KEY,
  story_id            TEXT NOT NULL REFERENCES public.sa_stories(story_id) ON DELETE CASCADE,
  cycle_number        INTEGER NOT NULL,
  comments_addressed  TEXT[] NOT NULL DEFAULT '{}',
  files_changed       TEXT[] NOT NULL DEFAULT '{}',
  test_evidence       TEXT NOT NULL DEFAULT '',
  commit_sha          TEXT,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sa_revision_cycles_story_id_idx ON public.sa_revision_cycles (story_id);

ALTER TABLE public.sa_revision_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.sa_revision_cycles USING (auth.role() = 'service_role');

-- ── Observation Lounge Shared Memory (Vector Store) ─────────────────────────

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

CREATE TABLE IF NOT EXISTS public.sa_observation_memories (
  id              TEXT PRIMARY KEY,
  story_id        TEXT NOT NULL,
  source          TEXT NOT NULL,
  transcript_hash TEXT NOT NULL UNIQUE,
  transcript_text TEXT NOT NULL,
  transcript      JSONB NOT NULL,
  mission_ref     TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  memory_embedding VECTOR(64) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sa_observation_memories_story_id_idx
  ON public.sa_observation_memories (story_id);

CREATE INDEX IF NOT EXISTS sa_observation_memories_created_at_idx
  ON public.sa_observation_memories (created_at DESC);

CREATE INDEX IF NOT EXISTS sa_observation_memories_embedding_idx
  ON public.sa_observation_memories
  USING ivfflat (memory_embedding vector_cosine_ops)
  WITH (lists = 64);

ALTER TABLE public.sa_observation_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.sa_observation_memories USING (auth.role() = 'service_role');
