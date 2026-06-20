-- Create sa_documentation table for RAG (Retrieval Augmented Generation)
-- Stores markdown documentation files for crew access during task execution
-- Supports semantic search via pgvector embeddings

CREATE TABLE IF NOT EXISTS sa_documentation (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'setup', 'crew', 'domain-driven', 'automation', 'testing'
  source_path TEXT NOT NULL, -- docs/category/filename.md (uniqueness is composite with chunk_index)
  filename TEXT NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0, -- For documents split into chunks
  chunk_count INT NOT NULL DEFAULT 1, -- Total chunks for this document
  chunk_content TEXT NOT NULL, -- The actual content (chunked for optimal search)
  content_hash TEXT, -- For change detection
  tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- Searchable tags
  is_searchable BOOLEAN DEFAULT TRUE,
  embedding VECTOR(1536), -- OpenAI embeddings for semantic search
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  ingested_at TIMESTAMP,
  
  -- Composite unique constraint: same doc can't be ingested twice with same path
  CONSTRAINT unique_documentation_source UNIQUE (source_path, chunk_index)
);

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_documentation_category ON sa_documentation(category);
CREATE INDEX IF NOT EXISTS idx_documentation_tags ON sa_documentation USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documentation_title ON sa_documentation(title);
CREATE INDEX IF NOT EXISTS idx_documentation_searchable ON sa_documentation(is_searchable);
CREATE INDEX IF NOT EXISTS idx_documentation_ingested ON sa_documentation(ingested_at DESC);

-- Vector index for semantic search (requires pgvector extension)
CREATE INDEX IF NOT EXISTS idx_documentation_embedding ON sa_documentation 
  USING ivfflat (embedding VECTOR_COSINE_OPS);

-- Function to search documentation by text
CREATE OR REPLACE FUNCTION search_documentation_by_text(
  search_query TEXT,
  category_filter TEXT DEFAULT NULL,
  max_results INT DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  category TEXT,
  source_path TEXT,
  chunk_content TEXT,
  chunk_index INT,
  chunk_count INT,
  tags TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.category,
    d.source_path,
    d.chunk_content,
    d.chunk_index,
    d.chunk_count,
    d.tags
  FROM sa_documentation d
  WHERE
    d.is_searchable = TRUE
    AND (category_filter IS NULL OR d.category = category_filter)
    AND (
      d.title ILIKE '%' || search_query || '%'
      OR d.chunk_content ILIKE '%' || search_query || '%'
      OR d.tags @> ARRAY[search_query]
    )
  ORDER BY
    CASE
      WHEN d.title ILIKE '%' || search_query || '%' THEN 1
      ELSE 2
    END,
    d.chunk_index,
    d.ingested_at DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to search documentation by semantic embedding
CREATE OR REPLACE FUNCTION search_documentation_by_embedding(
  embedding_vector VECTOR(1536),
  category_filter TEXT DEFAULT NULL,
  max_results INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  category TEXT,
  source_path TEXT,
  chunk_content TEXT,
  chunk_index INT,
  chunk_count INT,
  tags TEXT[],
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.category,
    d.source_path,
    d.chunk_content,
    d.chunk_index,
    d.chunk_count,
    d.tags,
    (1 - (d.embedding <=> embedding_vector))::FLOAT as similarity
  FROM sa_documentation d
  WHERE
    d.is_searchable = TRUE
    AND d.embedding IS NOT NULL
    AND (category_filter IS NULL OR d.category = category_filter)
    AND (1 - (d.embedding <=> embedding_vector)) > similarity_threshold
  ORDER BY d.embedding <=> embedding_vector
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get documentation by category
CREATE OR REPLACE FUNCTION get_documentation_by_category(
  category_name TEXT
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  source_path TEXT,
  filename TEXT,
  chunk_count INT,
  tags TEXT[],
  ingested_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    d.id,
    d.title,
    d.source_path,
    d.filename,
    d.chunk_count,
    d.tags,
    d.ingested_at
  FROM sa_documentation d
  WHERE
    d.is_searchable = TRUE
    AND d.category = category_name
    AND d.chunk_index = 0  -- Only return first chunk to avoid duplicates
  ORDER BY d.ingested_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all available documentation categories
CREATE OR REPLACE FUNCTION get_documentation_categories()
RETURNS TABLE (
  category TEXT,
  count INT,
  last_updated TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.category,
    COUNT(DISTINCT d.source_path)::INT as count,
    MAX(d.ingested_at) as last_updated
  FROM sa_documentation d
  WHERE d.is_searchable = TRUE AND d.chunk_index = 0
  GROUP BY d.category
  ORDER BY d.category;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable row-level security
ALTER TABLE sa_documentation ENABLE ROW LEVEL SECURITY;

-- RLS policies: documentation is readable by all authenticated users
DROP POLICY IF EXISTS "documentation_readable_by_all" ON sa_documentation;
CREATE POLICY "documentation_readable_by_all" ON sa_documentation
  FOR SELECT
  USING (is_searchable = TRUE);

-- Only service role can insert/update/delete documentation
DROP POLICY IF EXISTS "documentation_write_by_service" ON sa_documentation;
CREATE POLICY "documentation_write_by_service" ON sa_documentation
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "documentation_update_by_service" ON sa_documentation;
CREATE POLICY "documentation_update_by_service" ON sa_documentation
  FOR UPDATE
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "documentation_delete_by_service" ON sa_documentation;
CREATE POLICY "documentation_delete_by_service" ON sa_documentation
  FOR DELETE
  USING (auth.role() = 'service_role');

-- Create materialized view of all documentation metadata (for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_documentation_index AS
SELECT
  d.id,
  d.title,
  d.category,
  d.source_path,
  d.filename,
  d.chunk_count,
  COUNT(*) FILTER (WHERE d.is_searchable) as searchable_chunks,
  d.tags,
  d.created_at,
  d.ingested_at
FROM sa_documentation d
WHERE d.chunk_index = 0 -- Only metadata from first chunk
GROUP BY d.id, d.title, d.category, d.source_path, d.filename, d.chunk_count, d.tags, d.created_at, d.ingested_at;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_documentation_category ON mv_documentation_index(category);
CREATE INDEX IF NOT EXISTS idx_mv_documentation_title ON mv_documentation_index(title);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documentation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_documentation_updated_at ON sa_documentation;
CREATE TRIGGER trigger_update_documentation_updated_at
  BEFORE UPDATE ON sa_documentation
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();
