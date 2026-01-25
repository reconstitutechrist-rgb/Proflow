-- Migration: Enable Semantic RAG using pgvector
-- Allows Proflow to perform semantic search over repository code chunks

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create table for code chunks and embeddings
CREATE TABLE IF NOT EXISTS repository_code_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_memory_id UUID NOT NULL REFERENCES repository_memories(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  start_line INTEGER,
  end_line INTEGER,
  embedding VECTOR(768), -- Embedding size for Gemini text-embedding-004
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create vector similarity search index (IVFFlat or HNSW)
-- Using HNSW for better performance on smaller datasets
CREATE INDEX IF NOT EXISTS idx_repository_code_chunks_embedding ON repository_code_chunks 
USING hnsw (embedding vector_cosine_ops);

-- 4. Enable RLS
ALTER TABLE repository_code_chunks ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (inherited from repository_memories access)
CREATE POLICY "repository_code_chunks_select" ON repository_code_chunks
    FOR SELECT USING (
        repository_memory_id IN (
            SELECT id FROM repository_memories
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
            )
        )
    );

-- 6. RPC function for semantic search
CREATE OR REPLACE FUNCTION match_code_chunks (
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INTEGER,
  filter_repo_memory_id UUID
)
RETURNS TABLE (
  id UUID,
  file_path TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    repository_code_chunks.id,
    repository_code_chunks.file_path,
    repository_code_chunks.content,
    1 - (repository_code_chunks.embedding <=> query_embedding) AS similarity
  FROM repository_code_chunks
  WHERE repository_code_chunks.repository_memory_id = filter_repo_memory_id
    AND 1 - (repository_code_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
