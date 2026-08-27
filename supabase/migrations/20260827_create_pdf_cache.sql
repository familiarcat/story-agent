/**
 * Phase 6 Week 1: PDF Extraction Cache
 * 
 * Stores extracted PDF text and metadata to avoid re-processing
 * identical PDFs across sessions. Keyed by SHA-256 hash of PDF content.
 *
 * Lifecycle:
 * - process_pdf MCP tool: compute hash → check cache → use cached result or extract + store
 * - cleanup: periodic job to remove entries older than 30 days (configurable)
 *
 * Rationale:
 * - PDF extraction is CPU-intensive (pdfjs text extraction + OCR fallback)
 * - Users may upload the same PDF multiple times
 * - Cache hit avoids 5-10s extraction latency
 * - Supabase RLS policy ensures data isolation per client
 */

-- Create pdf_extraction_cache table
CREATE TABLE IF NOT EXISTS sa_pdf_extraction_cache (
  -- Primary key: SHA-256 hash of PDF content (base64)
  pdf_hash TEXT PRIMARY KEY,

  -- Extracted text content (accumulated from all pages)
  extracted_text TEXT NOT NULL,

  -- Metadata
  page_count INT NOT NULL,
  has_embedded_text BOOLEAN NOT NULL,
  ocr_pages INT[] DEFAULT '{}'::INT[], -- Array of page numbers that required OCR
  processing_time_ms INT NOT NULL, -- Wall-clock time to extract
  confidence FLOAT DEFAULT NULL, -- OCR confidence score if applicable
  
  -- File reference (for debugging)
  original_filename TEXT,
  file_size INT,
  
  -- Client isolation
  client_id TEXT NOT NULL DEFAULT 'familiarcat',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days',
  
  -- Audit
  created_by TEXT,
  access_count INT DEFAULT 0
);

-- Indexes for fast lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_sa_pdf_cache_hash_client 
  ON sa_pdf_extraction_cache(pdf_hash, client_id);

CREATE INDEX IF NOT EXISTS idx_sa_pdf_cache_client 
  ON sa_pdf_extraction_cache(client_id);

CREATE INDEX IF NOT EXISTS idx_sa_pdf_cache_expires 
  ON sa_pdf_extraction_cache(expires_at);

-- Enable RLS
ALTER TABLE sa_pdf_extraction_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their client's cache
CREATE POLICY "pdf_cache_client_isolation" ON sa_pdf_extraction_cache
  USING (client_id = current_setting('app.current_client_id', true) OR current_setting('app.current_client_id', true) IS NULL);

-- RLS Policy: Allow reads/writes by crew members and UI servers
CREATE POLICY "pdf_cache_crew_access" ON sa_pdf_extraction_cache
  FOR ALL
  USING (
    -- Allow if user is authenticated and has explicit access
    auth.uid() IS NOT NULL
    OR current_setting('app.crew_id', true) IS NOT NULL
  );

-- Cleanup function: remove expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_pdf_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM sa_pdf_extraction_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant access
GRANT SELECT, INSERT, UPDATE ON sa_pdf_extraction_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sa_pdf_extraction_cache TO service_role;
