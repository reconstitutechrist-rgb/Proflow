-- Add AI processing tracking fields to documents table
-- These fields track whether a document has been processed for AI embeddings
-- and when/how that processing occurred

-- Add AI processing columns
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_processed_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_processed_model TEXT;

-- Create index for efficient filtering of unprocessed documents
CREATE INDEX IF NOT EXISTS idx_documents_ai_processed ON documents(ai_processed);

-- Add comments for documentation
COMMENT ON COLUMN documents.ai_processed IS 'Whether this document has been processed for AI embeddings';
COMMENT ON COLUMN documents.ai_processed_date IS 'Timestamp when embeddings were last generated';
COMMENT ON COLUMN documents.ai_processed_model IS 'The embedding model used (e.g., text-embedding-ada-002)';

-- Backfill existing documents that have embedding_cache as already processed
UPDATE documents
SET
  ai_processed = TRUE,
  ai_processed_date = COALESCE(updated_date, created_date),
  ai_processed_model = embedding_cache->>'model'
WHERE embedding_cache IS NOT NULL
  AND embedding_cache != 'null'::jsonb
  AND ai_processed IS NOT TRUE;
