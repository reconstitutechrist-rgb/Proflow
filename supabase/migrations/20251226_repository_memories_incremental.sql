-- Migration: Add incremental analysis support to repository_memories
-- Enables updating repository memory with only changed files instead of full re-analysis

-- ============================================
-- Add columns for incremental analysis tracking
-- ============================================

ALTER TABLE repository_memories
  ADD COLUMN IF NOT EXISTS delta_context TEXT,
  ADD COLUMN IF NOT EXISTS last_incremental_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commits_since_full_analysis INTEGER DEFAULT 0;

-- ============================================
-- Add comment for documentation
-- ============================================

COMMENT ON COLUMN repository_memories.delta_context IS 'Context about recent changes since last full analysis';
COMMENT ON COLUMN repository_memories.last_incremental_at IS 'Timestamp of last incremental analysis';
COMMENT ON COLUMN repository_memories.commits_since_full_analysis IS 'Number of commits processed since last full analysis';
