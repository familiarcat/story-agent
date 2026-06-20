-- Migration: Add vector index table for documentation corpus
-- Applied: 2026-06-05
-- Purpose: Make phased docs retrievable by agents using semantic search.

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

CREATE TABLE IF NOT EXISTS public.sa_docs_knowledge_vectors (
  id              TEXT PRIMARY KEY,
  doc_id          TEXT NOT NULL,
  doc_path        TEXT NOT NULL,
  phase           TEXT NOT NULL,
  title           TEXT NOT NULL,
  heading         TEXT,
  chunk_index     INTEGER NOT NULL DEFAULT 0,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  content_hash    TEXT NOT NULL,
  content_text    TEXT NOT NULL,
  content_embedding VECTOR(64) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sa_docs_knowledge_vectors_doc_id_idx
  ON public.sa_docs_knowledge_vectors (doc_id, chunk_index);

CREATE INDEX IF NOT EXISTS sa_docs_knowledge_vectors_phase_idx
  ON public.sa_docs_knowledge_vectors (phase);

CREATE INDEX IF NOT EXISTS sa_docs_knowledge_vectors_tags_idx
  ON public.sa_docs_knowledge_vectors USING GIN (tags);

CREATE INDEX IF NOT EXISTS sa_docs_knowledge_vectors_embedding_idx
  ON public.sa_docs_knowledge_vectors
  USING ivfflat (content_embedding vector_cosine_ops)
  WITH (lists = 64);

ALTER TABLE public.sa_docs_knowledge_vectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access docs vectors" ON public.sa_docs_knowledge_vectors;
CREATE POLICY "Service role full access docs vectors"
ON public.sa_docs_knowledge_vectors
USING (auth.role() = 'service_role');

COMMENT ON TABLE public.sa_docs_knowledge_vectors IS
  'Vectorized documentation corpus for phased execution and agent retrieval.';
