-- Create PDF extraction cache table
CREATE TABLE IF NOT EXISTS sa_pdf_extraction_cache (
  pdf_hash TEXT PRIMARY KEY,
  extracted_text TEXT NOT NULL,
  page_count INT NOT NULL,
  has_embedded_text BOOLEAN DEFAULT true,
  ocr_pages INT[] DEFAULT ARRAY[]::INT[],
  processing_time_ms INT,
  confidence FLOAT,
  original_filename TEXT,
  file_size INT,
  client_id TEXT DEFAULT 'familiarcat',
  created_at TIMESTAMP DEFAULT NOW(),
  accessed_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days',
  created_by TEXT,
  access_count INT DEFAULT 0
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_pdf_hash_client ON sa_pdf_extraction_cache(pdf_hash, client_id);
CREATE INDEX IF NOT EXISTS idx_client_id ON sa_pdf_extraction_cache(client_id);
CREATE INDEX IF NOT EXISTS idx_expires_at ON sa_pdf_extraction_cache(expires_at);

-- RLS Policies (enable row-level security)
ALTER TABLE sa_pdf_extraction_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Client isolation (can only see own records)
CREATE POLICY "Client isolation - read own" ON sa_pdf_extraction_cache
  FOR SELECT
  USING (client_id = COALESCE(current_setting('app.current_client_id', true), 'familiarcat'));

-- Policy: Allow authenticated inserts
CREATE POLICY "Insert own records" ON sa_pdf_extraction_cache
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow updates to own records
CREATE POLICY "Update own records" ON sa_pdf_extraction_cache
  FOR UPDATE
  USING (client_id = COALESCE(current_setting('app.current_client_id', true), 'familiarcat'));

-- Cleanup function (for manual or scheduled cleanup)
CREATE OR REPLACE FUNCTION cleanup_expired_pdf_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM sa_pdf_extraction_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON TABLE sa_pdf_extraction_cache IS 'Stores extracted PDF text results for caching and reuse. Expires after 30 days.';
COMMENT ON COLUMN sa_pdf_extraction_cache.pdf_hash IS 'SHA-256 hash of PDF content (cache key)';
COMMENT ON COLUMN sa_pdf_extraction_cache.client_id IS 'Per-client isolation for multi-tenant safety';
