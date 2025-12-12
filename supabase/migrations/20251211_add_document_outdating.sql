-- Migration: Add document outdating support
-- Description: Adds columns to track outdated documents and their replacement relationships

-- Add outdating columns to documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS is_outdated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS outdated_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS outdated_by TEXT,
  ADD COLUMN IF NOT EXISTS replaced_by UUID,
  ADD COLUMN IF NOT EXISTS replacement_reason TEXT,
  ADD COLUMN IF NOT EXISTS outdated_from_folder TEXT;

-- Create index for efficient filtering of outdated documents
CREATE INDEX IF NOT EXISTS idx_documents_is_outdated ON documents(is_outdated);

-- Create index for finding replacement relationships
CREATE INDEX IF NOT EXISTS idx_documents_replaced_by ON documents(replaced_by);

-- Add comment for documentation
COMMENT ON COLUMN documents.is_outdated IS 'Whether this document has been marked as outdated by a newer version';
COMMENT ON COLUMN documents.outdated_date IS 'Timestamp when the document was marked as outdated';
COMMENT ON COLUMN documents.outdated_by IS 'Email of user who marked the document as outdated';
COMMENT ON COLUMN documents.replaced_by IS 'UUID of the document that replaced this one';
COMMENT ON COLUMN documents.replacement_reason IS 'AI-generated or user-provided reason for why this document was outdated';
COMMENT ON COLUMN documents.outdated_from_folder IS 'Original folder_path before being moved to /Outdated folder';
