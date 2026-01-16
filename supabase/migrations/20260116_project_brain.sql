-- Migration: Create Project Brain tables for verbatim recall
-- Stores every chat message and document chunk with vector embeddings
-- Enables semantic search to find exact relevant content

-- ============================================
-- Step 1: Enable pgvector extension (if not already)
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Step 2: Create project_chat_history table
-- Stores every message from every chat session
-- ============================================

CREATE TABLE IF NOT EXISTS project_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  project_id UUID NOT NULL,
  session_id UUID,

  -- The actual message content (verbatim)
  message_type TEXT NOT NULL,        -- 'user' or 'assistant'
  message_content TEXT NOT NULL,     -- FULL message text, not summarized

  -- Vector embedding for semantic search (1536 dims for text-embedding-3-small)
  embedding VECTOR(1536),

  -- Metadata
  created_by TEXT,                   -- User email who sent the message
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Step 3: Create project_document_chunks table
-- Stores every chunk of every document linked to project
-- ============================================

CREATE TABLE IF NOT EXISTS project_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  project_id UUID NOT NULL,
  document_id UUID NOT NULL,

  -- The actual content (verbatim)
  chunk_index INTEGER,
  chunk_text TEXT NOT NULL,          -- FULL paragraph/section text

  -- Vector embedding for semantic search
  embedding VECTOR(1536),

  -- Metadata
  document_name TEXT,
  content_hash TEXT,                 -- For deduplication
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Step 4: Create indexes
-- ============================================

-- Chat history indexes
CREATE INDEX IF NOT EXISTS idx_pch_project ON project_chat_history(project_id);
CREATE INDEX IF NOT EXISTS idx_pch_session ON project_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_pch_workspace ON project_chat_history(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pch_created ON project_chat_history(created_date DESC);

-- Document chunks indexes
CREATE INDEX IF NOT EXISTS idx_pdc_project ON project_document_chunks(project_id);
CREATE INDEX IF NOT EXISTS idx_pdc_document ON project_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_pdc_workspace ON project_document_chunks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pdc_hash ON project_document_chunks(content_hash);

-- ============================================
-- Vector indexes (optional - add when data volume justifies)
-- Uncomment when you have 10k+ embeddings for better performance
-- ============================================
-- CREATE INDEX IF NOT EXISTS idx_pch_embedding ON project_chat_history
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX IF NOT EXISTS idx_pdc_embedding ON project_document_chunks
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- Step 5: Enable RLS
-- ============================================

ALTER TABLE project_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_document_chunks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 6: Drop existing policies (clean slate)
-- ============================================

DROP POLICY IF EXISTS "pch_select" ON project_chat_history;
DROP POLICY IF EXISTS "pch_insert" ON project_chat_history;
DROP POLICY IF EXISTS "pch_update" ON project_chat_history;
DROP POLICY IF EXISTS "pch_delete" ON project_chat_history;

DROP POLICY IF EXISTS "pdc_select" ON project_document_chunks;
DROP POLICY IF EXISTS "pdc_insert" ON project_document_chunks;
DROP POLICY IF EXISTS "pdc_update" ON project_document_chunks;
DROP POLICY IF EXISTS "pdc_delete" ON project_document_chunks;

-- ============================================
-- Step 7: Create RLS policies (workspace-scoped)
-- ============================================

-- Project Chat History policies
CREATE POLICY "pch_select" ON project_chat_history
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
    )
  );

CREATE POLICY "pch_insert" ON project_chat_history
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
    )
  );

CREATE POLICY "pch_update" ON project_chat_history
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
    )
  );

CREATE POLICY "pch_delete" ON project_chat_history
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
    )
  );

-- Project Document Chunks policies
CREATE POLICY "pdc_select" ON project_document_chunks
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
    )
  );

CREATE POLICY "pdc_insert" ON project_document_chunks
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
    )
  );

CREATE POLICY "pdc_update" ON project_document_chunks
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
    )
  );

CREATE POLICY "pdc_delete" ON project_document_chunks
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
    )
  );

-- ============================================
-- Step 8: Create semantic search function for chat history
-- ============================================

CREATE OR REPLACE FUNCTION search_project_chat(
  query_embedding VECTOR(1536),
  p_project_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  message_type TEXT,
  message_content TEXT,
  created_by TEXT,
  created_date TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pch.id,
    pch.message_type,
    pch.message_content,
    pch.created_by,
    pch.created_date,
    1 - (pch.embedding <=> query_embedding) AS similarity
  FROM project_chat_history pch
  WHERE pch.project_id = p_project_id
    AND pch.embedding IS NOT NULL
    AND 1 - (pch.embedding <=> query_embedding) > match_threshold
  ORDER BY pch.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- Step 9: Create semantic search function for document chunks
-- ============================================

CREATE OR REPLACE FUNCTION search_project_documents(
  query_embedding VECTOR(1536),
  p_project_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  document_name TEXT,
  chunk_text TEXT,
  chunk_index INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pdc.id,
    pdc.document_id,
    pdc.document_name,
    pdc.chunk_text,
    pdc.chunk_index,
    1 - (pdc.embedding <=> query_embedding) AS similarity
  FROM project_document_chunks pdc
  WHERE pdc.project_id = p_project_id
    AND pdc.embedding IS NOT NULL
    AND 1 - (pdc.embedding <=> query_embedding) > match_threshold
  ORDER BY pdc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- Step 10: Create combined search function (optional)
-- Searches both chat and documents in parallel
-- ============================================

CREATE OR REPLACE FUNCTION search_project_brain(
  query_embedding VECTOR(1536),
  p_project_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  chat_limit INT DEFAULT 20,
  doc_limit INT DEFAULT 15
)
RETURNS TABLE (
  source_type TEXT,
  content_id UUID,
  content_text TEXT,
  source_name TEXT,
  created_date TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Chat messages
  SELECT
    'chat'::TEXT AS source_type,
    pch.id AS content_id,
    pch.message_type || ': ' || pch.message_content AS content_text,
    COALESCE(pch.created_by, 'Assistant') AS source_name,
    pch.created_date,
    1 - (pch.embedding <=> query_embedding) AS similarity
  FROM project_chat_history pch
  WHERE pch.project_id = p_project_id
    AND pch.embedding IS NOT NULL
    AND 1 - (pch.embedding <=> query_embedding) > match_threshold

  UNION ALL

  -- Document chunks
  SELECT
    'document'::TEXT AS source_type,
    pdc.id AS content_id,
    pdc.chunk_text AS content_text,
    pdc.document_name AS source_name,
    pdc.created_date,
    1 - (pdc.embedding <=> query_embedding) AS similarity
  FROM project_document_chunks pdc
  WHERE pdc.project_id = p_project_id
    AND pdc.embedding IS NOT NULL
    AND 1 - (pdc.embedding <=> query_embedding) > match_threshold

  ORDER BY similarity DESC
  LIMIT (chat_limit + doc_limit);
END;
$$;
