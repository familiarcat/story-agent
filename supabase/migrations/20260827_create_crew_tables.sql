CREATE TABLE IF NOT EXISTS sa_crew_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  crew_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  domain VARCHAR(100) NOT NULL,
  bio TEXT,
  capability_tier INT DEFAULT 3,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES auth.tenants(id)
);
CREATE INDEX IF NOT EXISTS idx_crew_personas_tenant ON sa_crew_personas(tenant_id);

CREATE TABLE IF NOT EXISTS sa_crew_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  crew_id VARCHAR(50) NOT NULL,
  skill_name VARCHAR(100) NOT NULL,
  proficiency_level INT DEFAULT 3,
  manifest_id VARCHAR(100) NOT NULL,
  manifest_hash VARCHAR(64),
  validation_errors JSONB DEFAULT NULL,
  validated_at TIMESTAMP,
  learned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES auth.tenants(id),
  UNIQUE(crew_id, skill_name, manifest_id)
);
CREATE INDEX IF NOT EXISTS idx_crew_skills_tenant ON sa_crew_skills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crew_skills_crew_id ON sa_crew_skills(crew_id);

CREATE TABLE IF NOT EXISTS sa_tool_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  tool_name VARCHAR(255) NOT NULL,
  mcp_server VARCHAR(100),
  category VARCHAR(50),
  description TEXT,
  capability_tier INT,
  cost_per_call DECIMAL(10, 6),
  evaluated_by VARCHAR(50),
  evaluation_result VARCHAR(50),
  skill_theory_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES auth.tenants(id),
  UNIQUE(tenant_id, tool_name)
);
CREATE INDEX IF NOT EXISTS idx_tool_registry_tenant ON sa_tool_registry(tenant_id);

CREATE TABLE IF NOT EXISTS sa_mission_debriefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  mission_id VARCHAR(100) NOT NULL,
  mission_title TEXT,
  story_id VARCHAR(100),
  crew_members JSONB,
  execution_phase VARCHAR(50),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  duration_seconds INT,
  status VARCHAR(50),
  findings JSONB,
  learnings JSONB,
  crew_skills_updated JSONB,
  debrief_transcript TEXT,
  stored_to_rag BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES auth.tenants(id)
);
CREATE INDEX IF NOT EXISTS idx_mission_debriefs_tenant ON sa_mission_debriefs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mission_debriefs_mission_id ON sa_mission_debriefs(mission_id);

ALTER TABLE sa_crew_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_crew_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_tool_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_mission_debriefs ENABLE ROW LEVEL SECURITY;

-- WorfGate policies: Simplified for compatibility
-- Allow all authenticated users to read crew tables
-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS sa_crew_personas_tenant_isolation ON sa_crew_personas;
DROP POLICY IF EXISTS sa_crew_skills_tenant_isolation ON sa_crew_skills;
DROP POLICY IF EXISTS sa_tool_registry_tenant_isolation ON sa_tool_registry;
DROP POLICY IF EXISTS sa_mission_debriefs_tenant_isolation ON sa_mission_debriefs;

-- Create new policies
CREATE POLICY sa_crew_personas_tenant_isolation ON sa_crew_personas
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY sa_crew_skills_tenant_isolation ON sa_crew_skills
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY sa_tool_registry_tenant_isolation ON sa_tool_registry
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY sa_mission_debriefs_tenant_isolation ON sa_mission_debriefs
  FOR SELECT USING (auth.role() = 'authenticated');

INSERT INTO sa_clients (tenant_id, client_name, client_code, tier, active, created_at)
VALUES (
  gen_random_uuid(),
  'Story Agent',
  'story-agent',
  'enterprise',
  true,
  NOW()
)
ON CONFLICT DO NOTHING;