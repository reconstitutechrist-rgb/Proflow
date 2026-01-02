-- Migration: Create generalized debate tables for multi-context AI debates
-- Supports: No context, Proflow projects/assignments, and GitHub repositories

-- ============================================
-- Step 1: Create debate_sessions table
-- ============================================

CREATE TABLE IF NOT EXISTS debate_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,

  -- Context type and references
  context_type TEXT NOT NULL DEFAULT 'none',  -- 'none', 'project', 'assignment', 'github'
  project_id UUID,                             -- For project context
  assignment_id UUID,                          -- For assignment context
  repository_id UUID,                          -- For github context (references workspace_repositories)

  -- Core session data
  user_query TEXT NOT NULL,
  topic_summary TEXT,                          -- For no-context debates, summarize topic

  -- Debate state
  status TEXT DEFAULT 'active',                -- active, paused, consensus, stopped, max_rounds, error
  current_round INTEGER DEFAULT 0,
  max_rounds INTEGER DEFAULT 5,
  consensus_score DECIMAL(5,2) DEFAULT 0,

  -- Results
  agreed_points JSONB DEFAULT '[]'::JSONB,
  contested_points JSONB DEFAULT '[]'::JSONB,
  context_summary JSONB DEFAULT '{}'::JSONB,
  final_response TEXT,
  saved_to_project_at TIMESTAMPTZ,

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Step 2: Create debate_messages table
-- ============================================

CREATE TABLE IF NOT EXISTS debate_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,

  round_number INTEGER NOT NULL,
  model_role TEXT NOT NULL,                    -- 'analyst' or 'critic'
  content TEXT NOT NULL,
  key_points JSONB DEFAULT '[]'::JSONB,
  agrees_with_previous BOOLEAN DEFAULT false,
  token_usage JSONB,

  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Step 3: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_debate_sessions_workspace ON debate_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_debate_sessions_context_type ON debate_sessions(context_type);
CREATE INDEX IF NOT EXISTS idx_debate_sessions_project ON debate_sessions(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_debate_sessions_assignment ON debate_sessions(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_debate_sessions_repository ON debate_sessions(repository_id) WHERE repository_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_debate_sessions_status ON debate_sessions(status);
CREATE INDEX IF NOT EXISTS idx_debate_messages_session ON debate_messages(session_id);

-- ============================================
-- Step 4: Enable RLS
-- ============================================

ALTER TABLE debate_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 5: Drop any existing policies (clean slate)
-- ============================================

DROP POLICY IF EXISTS "debate_sessions_select" ON debate_sessions;
DROP POLICY IF EXISTS "debate_sessions_insert" ON debate_sessions;
DROP POLICY IF EXISTS "debate_sessions_update" ON debate_sessions;
DROP POLICY IF EXISTS "debate_sessions_delete" ON debate_sessions;

DROP POLICY IF EXISTS "debate_messages_select" ON debate_messages;
DROP POLICY IF EXISTS "debate_messages_insert" ON debate_messages;
DROP POLICY IF EXISTS "debate_messages_update" ON debate_messages;
DROP POLICY IF EXISTS "debate_messages_delete" ON debate_messages;

-- ============================================
-- Step 6: Create RLS policies for debate_sessions
-- ============================================

CREATE POLICY "debate_sessions_select" ON debate_sessions
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
        )
    );

CREATE POLICY "debate_sessions_insert" ON debate_sessions
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
        )
    );

CREATE POLICY "debate_sessions_update" ON debate_sessions
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
        )
    );

CREATE POLICY "debate_sessions_delete" ON debate_sessions
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
        )
    );

-- ============================================
-- Step 7: Create RLS policies for debate_messages
-- ============================================

CREATE POLICY "debate_messages_select" ON debate_messages
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM debate_sessions
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
            )
        )
    );

CREATE POLICY "debate_messages_insert" ON debate_messages
    FOR INSERT WITH CHECK (
        session_id IN (
            SELECT id FROM debate_sessions
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
            )
        )
    );

CREATE POLICY "debate_messages_update" ON debate_messages
    FOR UPDATE USING (
        session_id IN (
            SELECT id FROM debate_sessions
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
            )
        )
    );

CREATE POLICY "debate_messages_delete" ON debate_messages
    FOR DELETE USING (
        session_id IN (
            SELECT id FROM debate_sessions
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE LOWER(user_email) = LOWER(auth.jwt()->>'email')
            )
        )
    );

-- ============================================
-- Step 8: Extend debate_insights to support all context types
-- ============================================

-- Make repository_id nullable and add new context columns
ALTER TABLE debate_insights
  ADD COLUMN IF NOT EXISTS context_type TEXT DEFAULT 'github',
  ADD COLUMN IF NOT EXISTS project_id UUID,
  ADD COLUMN IF NOT EXISTS assignment_id UUID;

-- Update existing rows to have context_type = 'github'
UPDATE debate_insights SET context_type = 'github' WHERE context_type IS NULL;

-- Make repository_id nullable for non-github contexts
ALTER TABLE debate_insights ALTER COLUMN repository_id DROP NOT NULL;
