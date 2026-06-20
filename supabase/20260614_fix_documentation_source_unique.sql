-- Fix: sa_documentation had BOTH a single-column UNIQUE on source_path
-- (sa_documentation_source_path_key) and the correct composite UNIQUE
-- (source_path, chunk_index). The single-column one blocks multi-chunk documents
-- and code files (only chunk 0 inserts). Drop it; keep the composite.
ALTER TABLE public.sa_documentation DROP CONSTRAINT IF EXISTS sa_documentation_source_path_key;
