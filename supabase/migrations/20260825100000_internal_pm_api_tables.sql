-- Create internal PM tables with conflict detection (version/etag)
-- These tables store internal project management data with multi-tenant support

-- sa_pm_sprints: Sprint tracking with state machine
CREATE TABLE IF NOT EXISTS sa_pm_sprints (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT,
  name TEXT NOT NULL,
  capacity INT,
  state TEXT NOT NULL DEFAULT 'planning' CHECK (state IN ('planning', 'in_progress', 'closed', 'archived')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 0,
  etag VARCHAR(32),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sa_pm_stories: Story tracking with state machine
CREATE TABLE IF NOT EXISTS sa_pm_stories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT,
  sprint_id TEXT REFERENCES sa_pm_sprints(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  acceptance_criteria TEXT,
  state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'in_progress', 'review', 'closed', 'archived')),
  story_points INT,
  assigned_to TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  etag VARCHAR(32),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sa_pm_tasks: Task tracking with state machine and dependency support
CREATE TABLE IF NOT EXISTS sa_pm_tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT,
  story_id TEXT REFERENCES sa_pm_stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  state TEXT NOT NULL DEFAULT 'todo' CHECK (state IN ('todo', 'in_progress', 'done', 'archived')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to TEXT,
  blocked_by TEXT[],
  version INTEGER NOT NULL DEFAULT 0,
  etag VARCHAR(32),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns exist (for backwards compatibility)
-- sa_pm_sprints columns
ALTER TABLE IF EXISTS sa_pm_sprints ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE IF EXISTS sa_pm_sprints ADD COLUMN IF NOT EXISTS capacity INT;
ALTER TABLE IF EXISTS sa_pm_sprints ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'planning';
ALTER TABLE IF EXISTS sa_pm_sprints ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE IF EXISTS sa_pm_sprints ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE IF EXISTS sa_pm_sprints ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS sa_pm_sprints ADD COLUMN IF NOT EXISTS etag VARCHAR(32);
ALTER TABLE IF EXISTS sa_pm_sprints ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE IF EXISTS sa_pm_sprints ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE IF EXISTS sa_pm_sprints ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE IF EXISTS sa_pm_sprints ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- sa_pm_stories columns
ALTER TABLE IF EXISTS sa_pm_stories ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE IF EXISTS sa_pm_stories ADD COLUMN IF NOT EXISTS sprint_id TEXT;
ALTER TABLE IF EXISTS sa_pm_stories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS sa_pm_stories ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT;
ALTER TABLE IF EXISTS sa_pm_stories ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'open';
ALTER TABLE IF EXISTS sa_pm_stories ADD COLUMN IF NOT EXISTS story_points INT;
ALTER TABLE IF EXISTS sa_pm_stories ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE IF EXISTS sa_pm_stories ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS sa_pm_stories ADD COLUMN IF NOT EXISTS etag VARCHAR(32);
ALTER TABLE IF EXISTS sa_pm_stories ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE IF EXISTS sa_pm_stories ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE IF EXISTS sa_pm_stories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE IF EXISTS sa_pm_stories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- sa_pm_tasks columns
ALTER TABLE IF EXISTS sa_pm_tasks ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE IF EXISTS sa_pm_tasks ADD COLUMN IF NOT EXISTS story_id TEXT;
ALTER TABLE IF EXISTS sa_pm_tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS sa_pm_tasks ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'todo';
ALTER TABLE IF EXISTS sa_pm_tasks ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE IF EXISTS sa_pm_tasks ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE IF EXISTS sa_pm_tasks ADD COLUMN IF NOT EXISTS blocked_by TEXT[];
ALTER TABLE IF EXISTS sa_pm_tasks ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS sa_pm_tasks ADD COLUMN IF NOT EXISTS etag VARCHAR(32);
ALTER TABLE IF EXISTS sa_pm_tasks ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE IF EXISTS sa_pm_tasks ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE IF EXISTS sa_pm_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE IF EXISTS sa_pm_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sa_pm_sprints_tenant ON sa_pm_sprints(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sa_pm_sprints_state ON sa_pm_sprints(state);
CREATE INDEX IF NOT EXISTS idx_sa_pm_sprints_created_by ON sa_pm_sprints(created_by);
CREATE INDEX IF NOT EXISTS idx_sa_pm_sprints_start_date ON sa_pm_sprints(start_date);

CREATE INDEX IF NOT EXISTS idx_sa_pm_stories_tenant ON sa_pm_stories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sa_pm_stories_sprint_id ON sa_pm_stories(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sa_pm_stories_state ON sa_pm_stories(state);
CREATE INDEX IF NOT EXISTS idx_sa_pm_stories_created_by ON sa_pm_stories(created_by);

CREATE INDEX IF NOT EXISTS idx_sa_pm_tasks_tenant ON sa_pm_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sa_pm_tasks_story_id ON sa_pm_tasks(story_id);
CREATE INDEX IF NOT EXISTS idx_sa_pm_tasks_state ON sa_pm_tasks(state);
CREATE INDEX IF NOT EXISTS idx_sa_pm_tasks_assigned_to ON sa_pm_tasks(assigned_to);
