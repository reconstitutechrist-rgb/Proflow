-- Migration: Create project_memories table for persistent AI context per project
-- This enables Ask AI to have accumulated knowledge for each project

-- ============================================
-- Step 1: Create the project_memories table
-- ============================================

CREATE TABLE IF NOT EXISTS project_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  project_id UUID NOT NULL,

  -- Core memory content (stored as text, parsed as JSON in application)
  summary TEXT,                    -- Executive summary of project state
  key_insights TEXT,               -- JSON array of important findings
  technical_decisions TEXT,        -- JSON array of decisions with rationale
  document_summaries TEXT,         -- JSON array of document summaries
  accumulated_context TEXT,        -- Full accumulated context for AI

  -- Metadata
  conversation_count INTEGER DEFAULT 0,
  document_count INTEGER DEFAULT 0,
  last_chat_session_id UUID,

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one memory bank per project
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'project_memories_project_id_unique'
    ) THEN
        ALTER TABLE project_memories ADD CONSTRAINT project_memories_project_id_unique UNIQUE (project_id);
    END IF;
END $$;

-- Index for fast lookup by project
CREATE INDEX IF NOT EXISTS idx_project_memories_project ON project_memories(project_id);
CREATE INDEX IF NOT EXISTS idx_project_memories_workspace ON project_memories(workspace_id);

-- ============================================
-- Step 2: Enable RLS
-- ============================================

ALTER TABLE project_memories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 3: Drop any existing policies (clean slate)
-- ============================================

DROP POLICY IF EXISTS "project_memories_select" ON project_memories;
DROP POLICY IF EXISTS "project_memories_insert" ON project_memories;
DROP POLICY IF EXISTS "project_memories_update" ON project_memories;
DROP POLICY IF EXISTS "project_memories_delete" ON project_memories;

-- ============================================
-- Step 4: Create RLS policies using user email from JWT
-- ============================================

-- SELECT: Users can view project memories for workspaces they are members of
CREATE POLICY "project_memories_select" ON project_memories
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM workspaces
            WHERE LOWER(auth.jwt()->>'email') = ANY(
                SELECT LOWER(jsonb_array_elements_text(members))
            )
        )
    );

-- INSERT: Users can create project memories for workspaces they are members of
CREATE POLICY "project_memories_insert" ON project_memories
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces
            WHERE LOWER(auth.jwt()->>'email') = ANY(
                SELECT LOWER(jsonb_array_elements_text(members))
            )
        )
    );

-- UPDATE: Users can update project memories for workspaces they are members of
CREATE POLICY "project_memories_update" ON project_memories
    FOR UPDATE USING (
        workspace_id IN (
            SELECT id FROM workspaces
            WHERE LOWER(auth.jwt()->>'email') = ANY(
                SELECT LOWER(jsonb_array_elements_text(members))
            )
        )
    );

-- DELETE: Users can delete project memories for workspaces they are members of
CREATE POLICY "project_memories_delete" ON project_memories
    FOR DELETE USING (
        workspace_id IN (
            SELECT id FROM workspaces
            WHERE LOWER(auth.jwt()->>'email') = ANY(
                SELECT LOWER(jsonb_array_elements_text(members))
            )
        )
    );
