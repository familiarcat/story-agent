CREATE TABLE sa_pm_tools (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  api_base_url TEXT NOT NULL,
  auth_type TEXT NOT NULL,
  config JSONB
);

CREATE TABLE sa_pm_clients (
  id SERIAL PRIMARY KEY,
  client_id TEXT NOT NULL,
  pm_tool_id INT REFERENCES sa_pm_tools(id),
  external_id TEXT NOT NULL,
  external_key TEXT NOT NULL
);

CREATE TABLE sa_pm_projects (
  id SERIAL PRIMARY KEY,
  client_id TEXT NOT NULL,
  pm_tool_id INT REFERENCES sa_pm_tools(id),
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  description TEXT
);

CREATE TABLE sa_pm_sprints (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES sa_pm_projects(id),
  pm_tool_id INT REFERENCES sa_pm_tools(id),
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  state TEXT NOT NULL
);

CREATE TABLE sa_pm_stories (
  id SERIAL PRIMARY KEY,
  sprint_id INT REFERENCES sa_pm_sprints(id),
  pm_tool_id INT REFERENCES sa_pm_tools(id),
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  story_points INT,
  status TEXT NOT NULL
);

CREATE TABLE sa_pm_tasks (
  id SERIAL PRIMARY KEY,
  story_id INT REFERENCES sa_pm_stories(id),
  pm_tool_id INT REFERENCES sa_pm_tools(id),
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  assignee TEXT,
  status TEXT NOT NULL,
  priority TEXT NOT NULL
);

CREATE TABLE sa_pm_field_mappings (
  id SERIAL PRIMARY KEY,
  tool_type TEXT NOT NULL,
  external_field TEXT NOT NULL,
  canonical_field TEXT NOT NULL
);
