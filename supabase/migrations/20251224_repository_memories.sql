-- Migration: Create repository_memories table for persistent GitHub repository knowledge
-- This enables AI debates to have deep, verified knowledge of connected repositories

-- ============================================
-- Step 1: Create the repository_memories table
-- ============================================

CREATE TABLE IF NOT EXISTS repository_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  repository_id UUID NOT NULL,

  -- Analysis Status
  analysis_status TEXT DEFAULT 'pending',     -- pending|analyzing|completed|failed|stale
  analysis_started_at TIMESTAMPTZ,
  analysis_completed_at TIMESTAMPTZ,
  analysis_error TEXT,

  -- Code Architecture
  file_structure TEXT,                        -- JSON: folder purposes, organization
  architecture_summary TEXT,                  -- LLM-generated architecture overview

  -- Functions & Classes
  exported_apis TEXT,                         -- JSON: [{name, signature, purpose, file}]
  key_classes TEXT,                           -- JSON: [{name, extends, purpose, file}]
  entry_points TEXT,                          -- JSON: main files, index files

  -- Dependencies
  internal_dependencies TEXT,                 -- JSON: module dependency graph
  external_packages TEXT,                     -- JSON: [{name, version, purpose}]
  api_integrations TEXT,                      -- JSON: external APIs used

  -- Patterns
  coding_patterns TEXT,                       -- JSON: detected patterns with examples
  naming_conventions TEXT,                    -- JSON: naming patterns
  file_organization TEXT,                     -- JSON: organization pattern

  -- Documentation
  readme_content TEXT,
  documentation_summary TEXT,

  -- Accumulated Context (for AI prompts)
  accumulated_context TEXT,                   -- Full narrative for AI (max 15000 chars)
  key_insights TEXT,                          -- JSON: key findings

  -- Metadata
  files_analyzed INTEGER DEFAULT 0,
  total_files INTEGER DEFAULT 0,
  last_commit_sha TEXT,
  languages_breakdown TEXT,                   -- JSON: {language: percentage}

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one memory per repository
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'repository_memories_repository_id_unique'
    ) THEN
        ALTER TABLE repository_memories ADD CONSTRAINT repository_memories_repository_id_unique UNIQUE (repository_id);
    END IF;
END $$;

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_repository_memories_repository ON repository_memories(repository_id);
CREATE INDEX IF NOT EXISTS idx_repository_memories_workspace ON repository_memories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_repository_memories_status ON repository_memories(analysis_status);

-- ============================================
-- Step 2: Enable RLS
-- ============================================

ALTER TABLE repository_memories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 3: Drop any existing policies (clean slate)
-- ============================================

DROP POLICY IF EXISTS "repository_memories_select" ON repository_memories;
DROP POLICY IF EXISTS "repository_memories_insert" ON repository_memories;
DROP POLICY IF EXISTS "repository_memories_update" ON repository_memories;
DROP POLICY IF EXISTS "repository_memories_delete" ON repository_memories;

-- ============================================
-- Step 4: Create RLS policies using user email from JWT
-- ============================================

-- SELECT: Users can view repository memories for workspaces they are members of
CREATE POLICY "repository_memories_select" ON repository_memories
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
        )
    );

-- INSERT: Users can create repository memories for workspaces they are members of
CREATE POLICY "repository_memories_insert" ON repository_memories
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
        )
    );

-- UPDATE: Users can update repository memories for workspaces they are members of
CREATE POLICY "repository_memories_update" ON repository_memories
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
        )
    );

-- DELETE: Users can delete repository memories for workspaces they are members of
CREATE POLICY "repository_memories_delete" ON repository_memories
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
        )
    );
