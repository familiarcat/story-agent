-- Crew Personal Memory Storage
-- Each crew member can store personal memories, insights, and learnings
-- Separate from baseline crew memories (which are shared)

CREATE TABLE IF NOT EXISTS sa_crew_personal_memory (
  id BIGSERIAL PRIMARY KEY,
  crew_id TEXT NOT NULL, -- 'picard', 'data', 'worf', etc.
  memory_type TEXT NOT NULL, -- 'insight', 'lesson_learned', 'decision_note', 'reminder'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- Context about where/when this memory was created
  project_id TEXT, -- Which project this memory relates to
  task_id TEXT, -- Which task this memory relates to
  story_id TEXT, -- Which story this memory relates to
  domain_ids TEXT[], -- Related domains
  
  -- Metadata for searchability
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_searchable BOOLEAN DEFAULT TRUE,
  is_private BOOLEAN DEFAULT FALSE, -- Private to crew member only
  
  -- Relationships
  relates_to_crew TEXT[], -- Other crew members involved
  relatedMemoryIds BIGINT[], -- Other memories related to this one
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Vector embedding for semantic search
  embedding VECTOR(1536)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crew_personal_memory_crew_id ON sa_crew_personal_memory(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_personal_memory_type ON sa_crew_personal_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_crew_personal_memory_project ON sa_crew_personal_memory(project_id);
CREATE INDEX IF NOT EXISTS idx_crew_personal_memory_tags ON sa_crew_personal_memory USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_crew_personal_memory_searchable ON sa_crew_personal_memory(is_searchable);
CREATE INDEX IF NOT EXISTS idx_crew_personal_memory_created ON sa_crew_personal_memory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crew_personal_memory_embedding ON sa_crew_personal_memory 
  USING ivfflat (embedding VECTOR_COSINE_OPS);

-- Function to store crew personal memory
CREATE OR REPLACE FUNCTION store_crew_personal_memory(
  crew_id TEXT,
  memory_type TEXT,
  title TEXT,
  content TEXT,
  project_id TEXT DEFAULT NULL,
  task_id TEXT DEFAULT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  relates_to_crew TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS BIGINT AS $$
DECLARE
  memory_id BIGINT;
BEGIN
  INSERT INTO sa_crew_personal_memory (
    crew_id, memory_type, title, content,
    project_id, task_id, tags, relates_to_crew
  ) VALUES (
    crew_id, memory_type, title, content,
    project_id, task_id, tags, relates_to_crew
  )
  RETURNING id INTO memory_id;
  
  RETURN memory_id;
END;
$$ LANGUAGE plpgsql;

-- Function to retrieve crew personal memories
CREATE OR REPLACE FUNCTION get_crew_personal_memory(
  p_crew_id TEXT,
  memory_limit INT DEFAULT 10,
  include_private BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id BIGINT,
  crew_id TEXT,
  memory_type TEXT,
  title TEXT,
  content TEXT,
  project_id TEXT,
  task_id TEXT,
  tags TEXT[],
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.crew_id,
    m.memory_type,
    m.title,
    m.content,
    m.project_id,
    m.task_id,
    m.tags,
    m.created_at
  FROM sa_crew_personal_memory m
  WHERE
    m.crew_id = $1
    AND m.is_searchable = TRUE
    AND (include_private OR NOT m.is_private)
  ORDER BY m.created_at DESC
  LIMIT memory_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to search crew personal memories by text
CREATE OR REPLACE FUNCTION search_crew_personal_memory(
  p_crew_id TEXT,
  search_query TEXT,
  memory_limit INT DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  crew_id TEXT,
  memory_type TEXT,
  title TEXT,
  content TEXT,
  tags TEXT[],
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.crew_id,
    m.memory_type,
    m.title,
    m.content,
    m.tags,
    m.created_at
  FROM sa_crew_personal_memory m
  WHERE
    m.crew_id = $1
    AND m.is_searchable = TRUE
    AND (
      m.title ILIKE '%' || search_query || '%'
      OR m.content ILIKE '%' || search_query || '%'
      OR m.tags @> ARRAY[search_query]
    )
  ORDER BY m.created_at DESC
  LIMIT memory_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to search crew memories by semantic embedding
CREATE OR REPLACE FUNCTION search_crew_personal_memory_by_embedding(
  p_crew_id TEXT,
  embedding_vector VECTOR(1536),
  memory_limit INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id BIGINT,
  crew_id TEXT,
  memory_type TEXT,
  title TEXT,
  content TEXT,
  tags TEXT[],
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.crew_id,
    m.memory_type,
    m.title,
    m.content,
    m.tags,
    (1 - (m.embedding <=> embedding_vector))::FLOAT as similarity
  FROM sa_crew_personal_memory m
  WHERE
    m.crew_id = $1
    AND m.is_searchable = TRUE
    AND m.embedding IS NOT NULL
    AND (1 - (m.embedding <=> embedding_vector)) > similarity_threshold
  ORDER BY m.embedding <=> embedding_vector
  LIMIT memory_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get crew memories by project
CREATE OR REPLACE FUNCTION get_crew_memories_by_project(
  crew_id TEXT,
  project_id TEXT,
  memory_limit INT DEFAULT 20
)
RETURNS TABLE (
  id BIGINT,
  memory_type TEXT,
  title TEXT,
  content TEXT,
  tags TEXT[],
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.memory_type,
    m.title,
    m.content,
    m.tags,
    m.created_at
  FROM sa_crew_personal_memory m
  WHERE
    m.crew_id = $1
    AND m.project_id = $2
    AND m.is_searchable = TRUE
  ORDER BY m.created_at DESC
  LIMIT memory_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get crew memory statistics
CREATE OR REPLACE FUNCTION get_crew_memory_stats(crew_id TEXT)
RETURNS TABLE (
  total_memories INT,
  memory_by_type TEXT,
  projects_count INT,
  most_recent_memory TIMESTAMP,
  memory_count_by_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT as total_memories,
    memory_type as memory_by_type,
    COUNT(DISTINCT project_id)::INT as projects_count,
    MAX(created_at) as most_recent_memory,
    COUNT(*)::TEXT as memory_count_by_type
  FROM sa_crew_personal_memory
  WHERE crew_id = $1
  GROUP BY memory_type;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE sa_crew_personal_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Crew members can only see their own memories (unless shared)
DROP POLICY IF EXISTS "crew_can_view_own_memories" ON sa_crew_personal_memory;
CREATE POLICY "crew_can_view_own_memories" ON sa_crew_personal_memory
  FOR SELECT
  USING (crew_id = auth.jwt()->>'crew_id' OR is_private = FALSE);

-- Crew members can insert their own memories
DROP POLICY IF EXISTS "crew_can_insert_own_memories" ON sa_crew_personal_memory;
CREATE POLICY "crew_can_insert_own_memories" ON sa_crew_personal_memory
  FOR INSERT
  WITH CHECK (crew_id = auth.jwt()->>'crew_id');

-- Crew members can update their own memories
DROP POLICY IF EXISTS "crew_can_update_own_memories" ON sa_crew_personal_memory;
CREATE POLICY "crew_can_update_own_memories" ON sa_crew_personal_memory
  FOR UPDATE
  USING (crew_id = auth.jwt()->>'crew_id');

-- Crew members can delete their own memories
DROP POLICY IF EXISTS "crew_can_delete_own_memories" ON sa_crew_personal_memory;
CREATE POLICY "crew_can_delete_own_memories" ON sa_crew_personal_memory
  FOR DELETE
  USING (crew_id = auth.jwt()->>'crew_id');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_crew_personal_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_crew_personal_memory_updated_at ON sa_crew_personal_memory;
CREATE TRIGGER trigger_update_crew_personal_memory_updated_at
  BEFORE UPDATE ON sa_crew_personal_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_personal_memory_updated_at();
