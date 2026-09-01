-- Native PM System Schema
-- Phase 1: Core Engine
-- Created: 2026-09-01
-- Leads: Data (schema), Geordi (infrastructure)

-- Projects (tenant-level container)
CREATE TABLE IF NOT EXISTS sa_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Workflow type: scrum | kanban | hybrid
  workflow_type VARCHAR(50) NOT NULL DEFAULT 'scrum',
  
  -- Visibility: private | team | public
  visibility VARCHAR(50) NOT NULL DEFAULT 'team',
  
  -- Status: planning | active | archived
  status VARCHAR(50) NOT NULL DEFAULT 'planning',
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT sa_projects_client_name_unique UNIQUE(client_id, name)
);

CREATE INDEX idx_sa_projects_client_id ON sa_projects(client_id);
CREATE INDEX idx_sa_projects_status ON sa_projects(status);

-- Sprints (time-bounded work cycles)
CREATE TABLE IF NOT EXISTS sa_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES sa_projects(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- State machine: planning | active | review | complete
  state VARCHAR(50) NOT NULL DEFAULT 'planning',
  
  -- Dates
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  
  -- Optional capacity (story points or hours)
  capacity INTEGER,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT sa_sprints_project_name_unique UNIQUE(project_id, name),
  CONSTRAINT sa_sprints_dates_valid CHECK(start_date < end_date OR (start_date IS NULL OR end_date IS NULL))
);

CREATE INDEX idx_sa_sprints_project_id ON sa_sprints(project_id);
CREATE INDEX idx_sa_sprints_state ON sa_sprints(state);
CREATE INDEX idx_sa_sprints_dates ON sa_sprints(start_date, end_date);

-- Stories (user-facing features/requirements)
CREATE TABLE IF NOT EXISTS sa_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES sa_projects(id) ON DELETE CASCADE,
  sprint_id UUID REFERENCES sa_sprints(id) ON DELETE SET NULL,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- State machine: open | in_progress | review | done | blocked | archived
  state VARCHAR(50) NOT NULL DEFAULT 'open',
  
  -- Assignment
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Optional: story points (Scrum) or size category (Kanban)
  story_points INTEGER,
  size_category VARCHAR(50), -- xs | sm | md | lg | xl
  
  -- Priority
  priority VARCHAR(50) DEFAULT 'medium', -- low | medium | high | critical
  
  -- Blocked state
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  blocked_by UUID REFERENCES sa_stories(id) ON DELETE SET NULL,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT sa_stories_title_not_empty CHECK(TRIM(title) != '')
);

CREATE INDEX idx_sa_stories_project_id ON sa_stories(project_id);
CREATE INDEX idx_sa_stories_sprint_id ON sa_stories(sprint_id);
CREATE INDEX idx_sa_stories_assignee_id ON sa_stories(assignee_id);
CREATE INDEX idx_sa_stories_state ON sa_stories(state);
CREATE INDEX idx_sa_stories_is_blocked ON sa_stories(is_blocked);

-- Tasks (implementation work units)
CREATE TABLE IF NOT EXISTS sa_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES sa_stories(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- State machine: open | in_progress | done | blocked
  state VARCHAR(50) NOT NULL DEFAULT 'open',
  
  -- Assignment
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Optional: effort hours
  effort_hours DECIMAL(5,1),
  
  -- Priority
  priority VARCHAR(50) DEFAULT 'medium',
  
  -- Blocked state
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_by UUID REFERENCES sa_tasks(id) ON DELETE SET NULL,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT sa_tasks_title_not_empty CHECK(TRIM(title) != ''),
  CONSTRAINT sa_tasks_no_cycles CHECK(blocked_by != id)
);

CREATE INDEX idx_sa_tasks_story_id ON sa_tasks(story_id);
CREATE INDEX idx_sa_tasks_assignee_id ON sa_tasks(assignee_id);
CREATE INDEX idx_sa_tasks_state ON sa_tasks(state);
CREATE INDEX idx_sa_tasks_is_blocked ON sa_tasks(is_blocked);

-- Audit log (track all state changes)
CREATE TABLE IF NOT EXISTS sa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What changed
  entity_type VARCHAR(50) NOT NULL, -- project | sprint | story | task
  entity_id UUID NOT NULL,
  
  -- Action: create | update | delete | state_change | assign
  action VARCHAR(50) NOT NULL,
  
  -- Who, when
  actor_id UUID NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Before/after values
  before_state JSONB,
  after_state JSONB,
  
  -- Change reason/comment
  reason TEXT,
  
  -- Context
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_sa_audit_log_entity ON sa_audit_log(entity_type, entity_id);
CREATE INDEX idx_sa_audit_log_actor ON sa_audit_log(actor_id);
CREATE INDEX idx_sa_audit_log_timestamp ON sa_audit_log(timestamp);

-- Attachments/references (future use)
CREATE TABLE IF NOT EXISTS sa_story_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES sa_stories(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  type VARCHAR(50), -- link | image | document | etc
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT sa_story_attachments_url_unique UNIQUE(story_id, url)
);

CREATE INDEX idx_sa_story_attachments_story_id ON sa_story_attachments(story_id);

-- Comments (future use)
CREATE TABLE IF NOT EXISTS sa_story_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES sa_stories(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sa_story_comments_story_id ON sa_story_comments(story_id);

-- Enable RLS (Row-Level Security) for multi-tenant isolation
ALTER TABLE sa_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see projects in their client
CREATE POLICY sa_projects_client_isolation ON sa_projects
  FOR ALL USING (
    client_id = (SELECT client_id FROM auth.users WHERE id = auth.uid())
  );

-- RLS Policy: Sprints inherit project isolation
CREATE POLICY sa_sprints_client_isolation ON sa_sprints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sa_projects 
      WHERE id = sa_sprints.project_id 
      AND client_id = (SELECT client_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- RLS Policy: Stories inherit project isolation
CREATE POLICY sa_stories_client_isolation ON sa_stories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sa_projects 
      WHERE id = sa_stories.project_id 
      AND client_id = (SELECT client_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- RLS Policy: Tasks inherit story/project isolation
CREATE POLICY sa_tasks_client_isolation ON sa_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sa_projects 
      WHERE id = (SELECT project_id FROM sa_stories WHERE id = sa_tasks.story_id)
      AND client_id = (SELECT client_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- Comment for migration tracking
COMMENT ON TABLE sa_projects IS 'Phase 1 Native PM Engine - Project container (tenant-level)';
COMMENT ON TABLE sa_sprints IS 'Phase 1 Native PM Engine - Sprint (time-bounded work cycle)';
COMMENT ON TABLE sa_stories IS 'Phase 1 Native PM Engine - Story (user-facing feature)';
COMMENT ON TABLE sa_tasks IS 'Phase 1 Native PM Engine - Task (implementation unit)';
COMMENT ON TABLE sa_audit_log IS 'Phase 1 Native PM Engine - Audit trail for all changes';
