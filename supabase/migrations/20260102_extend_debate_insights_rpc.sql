-- Migration: Extend match_debate_insights RPC for multi-context support
-- This allows semantic search for project and assignment contexts in addition to GitHub

-- Drop the original function with its exact signature
DROP FUNCTION IF EXISTS public.match_debate_insights(
  vector, uuid, uuid, double precision, integer
);

-- Create the function with additional parameters for multi-context support
CREATE FUNCTION match_debate_insights(
  query_embedding VECTOR(1536),
  p_repository_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_assignment_id UUID DEFAULT NULL,
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
  project_id UUID,
  assignment_id UUID,
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
    di.project_id,
    di.assignment_id,
    1 - (di.embedding <=> query_embedding) AS similarity
  FROM debate_insights di
  WHERE
    di.embedding IS NOT NULL
    AND 1 - (di.embedding <=> query_embedding) > match_threshold
    AND (
      -- Filter by the appropriate context type
      (p_repository_id IS NOT NULL AND di.repository_id = p_repository_id) OR
      (p_project_id IS NOT NULL AND di.project_id = p_project_id) OR
      (p_assignment_id IS NOT NULL AND di.assignment_id = p_assignment_id) OR
      -- Fallback to workspace-level if no specific context provided
      (p_repository_id IS NULL AND p_project_id IS NULL AND p_assignment_id IS NULL
       AND p_workspace_id IS NOT NULL AND di.workspace_id = p_workspace_id)
    )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION match_debate_insights IS
'Semantic search for debate insights using pgvector.
Supports filtering by repository_id (GitHub), project_id, or assignment_id.
Falls back to workspace_id if no specific context is provided.';
