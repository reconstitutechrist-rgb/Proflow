-- Migration: Create debate_insights table for persistent AI debate knowledge
-- This enables debates to remember and build upon past insights using semantic search

-- ============================================
-- Step 1: Enable pgvector extension
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Step 2: Create the debate_insights table
-- ============================================

CREATE TABLE IF NOT EXISTS debate_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  repository_id UUID NOT NULL,

  -- Core insight data
  insight_type TEXT NOT NULL,                 -- 'architecture', 'pattern', 'issue', 'recommendation', 'decision'
  insight_text TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.80, -- 0.00 to 1.00

  -- Source tracking
  source_session_id UUID,                     -- References github_debate_sessions(id)
  source_round INTEGER,
  agreed_by_both_ais BOOLEAN DEFAULT false,

  -- Embedding for semantic search (1536 dims for OpenAI text-embedding-3-small)
  embedding VECTOR(1536),

  -- Usage tracking
  times_retrieved INTEGER DEFAULT 0,
  last_retrieved_at TIMESTAMPTZ,

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Step 3: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_debate_insights_repo ON debate_insights(repository_id);
CREATE INDEX IF NOT EXISTS idx_debate_insights_workspace ON debate_insights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_debate_insights_type ON debate_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_debate_insights_agreed ON debate_insights(agreed_by_both_ais) WHERE agreed_by_both_ais = true;

-- IVFFlat index for vector similarity search
-- Note: Requires at least some data to build properly.
-- For small datasets, exact search via <=> operator works without this index.
-- CREATE INDEX IF NOT EXISTS idx_debate_insights_embedding ON debate_insights
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- Step 4: Enable RLS
-- ============================================

ALTER TABLE debate_insights ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 5: Drop any existing policies (clean slate)
-- ============================================

DROP POLICY IF EXISTS "debate_insights_select" ON debate_insights;
DROP POLICY IF EXISTS "debate_insights_insert" ON debate_insights;
DROP POLICY IF EXISTS "debate_insights_update" ON debate_insights;
DROP POLICY IF EXISTS "debate_insights_delete" ON debate_insights;

-- ============================================
-- Step 6: Create RLS policies using user email from JWT
-- ============================================

-- SELECT: Users can view debate insights for workspaces they are members of
CREATE POLICY "debate_insights_select" ON debate_insights
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
        )
    );

-- INSERT: Users can create debate insights for workspaces they are members of
CREATE POLICY "debate_insights_insert" ON debate_insights
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
        )
    );

-- UPDATE: Users can update debate insights for workspaces they are members of
CREATE POLICY "debate_insights_update" ON debate_insights
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
        )
    );

-- DELETE: Users can delete debate insights for workspaces they are members of
CREATE POLICY "debate_insights_delete" ON debate_insights
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
        )
    );

-- ============================================
-- Step 7: Create semantic search function
-- ============================================

CREATE OR REPLACE FUNCTION match_debate_insights(
  query_embedding VECTOR(1536),
  p_repository_id UUID,
  p_workspace_id UUID DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  insight_type TEXT,
  insight_text TEXT,
  confidence_score DECIMAL,
  agreed_by_both_ais BOOLEAN,
  times_retrieved INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    di.id,
    di.insight_type,
    di.insight_text,
    di.confidence_score,
    di.agreed_by_both_ais,
    di.times_retrieved,
    1 - (di.embedding <=> query_embedding) AS similarity
  FROM debate_insights di
  WHERE di.repository_id = p_repository_id
    AND (p_workspace_id IS NULL OR di.workspace_id = p_workspace_id)
    AND di.embedding IS NOT NULL
    AND 1 - (di.embedding <=> query_embedding) > match_threshold
  ORDER BY di.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- Step 8: Create function to get established insights (no embedding needed)
-- ============================================

CREATE OR REPLACE FUNCTION get_established_insights(
  p_repository_id UUID,
  min_confidence FLOAT DEFAULT 0.85
)
RETURNS TABLE (
  id UUID,
  insight_type TEXT,
  insight_text TEXT,
  confidence_score DECIMAL,
  times_retrieved INTEGER,
  created_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    di.id,
    di.insight_type,
    di.insight_text,
    di.confidence_score,
    di.times_retrieved,
    di.created_date
  FROM debate_insights di
  WHERE di.repository_id = p_repository_id
    AND di.agreed_by_both_ais = true
    AND di.confidence_score >= min_confidence
  ORDER BY di.confidence_score DESC, di.times_retrieved DESC
  LIMIT 20;
END;
$$;

-- ============================================
-- Step 9: Create function to increment retrieval stats atomically
-- ============================================

CREATE OR REPLACE FUNCTION increment_insight_retrieval(
  insight_ids UUID[],
  retrieved_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE debate_insights
  SET
    times_retrieved = times_retrieved + 1,
    last_retrieved_at = retrieved_at,
    updated_date = NOW()
  WHERE id = ANY(insight_ids);
END;
$$;
