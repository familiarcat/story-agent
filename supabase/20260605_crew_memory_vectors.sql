-- Migration: Add crew observation lounge memory vector store
-- Applied: 2026-06-05
-- Purpose: Store and retrieve debate transcripts as vector-backed shared memory

-- Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- Create observation lounge memory table with vector embedding
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

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS sa_observation_memories_story_id_idx
  ON public.sa_observation_memories (story_id);

CREATE INDEX IF NOT EXISTS sa_observation_memories_created_at_idx
  ON public.sa_observation_memories (created_at DESC);

-- Vector similarity index using IVFFlat for approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS sa_observation_memories_embedding_idx
  ON public.sa_observation_memories
  USING ivfflat (memory_embedding vector_cosine_ops)
  WITH (lists = 64);

-- Enable row-level security
ALTER TABLE public.sa_observation_memories ENABLE ROW LEVEL SECURITY;

-- Grant service role full access
DROP POLICY IF EXISTS "Service role full access" ON public.sa_observation_memories;
CREATE POLICY "Service role full access" ON public.sa_observation_memories
  USING (auth.role() = 'service_role');

-- Add comment documenting the table
COMMENT ON TABLE public.sa_observation_memories IS 
  'Stores crew observation lounge debate transcripts as vector-backed shared memory for cross-mission learning. Supports semantic similarity search across prior debates.';

COMMENT ON COLUMN public.sa_observation_memories.memory_embedding IS 
  'Vector representation of transcript for semantic similarity search. 64-dimensional embedding generated from transcript text.';

-- Verify the extension and table
SELECT 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'sa_observation_memories') as table_exists,
  EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as vector_enabled;
