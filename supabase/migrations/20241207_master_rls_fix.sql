-- ============================================
-- MASTER RLS FIX - Run this LAST to ensure all policies are correct
-- This migration consolidates all RLS fixes for case-insensitive email matching
-- ============================================

-- ============================================
-- WORKSPACE_MEMBERS - The foundation table for all RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can join workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Users can update their membership" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage workspace members" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;

CREATE POLICY "workspace_members_select" ON workspace_members
    FOR SELECT USING (
        workspace_id IN (
            SELECT wm.workspace_id FROM workspace_members wm
            WHERE lower(wm.user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "workspace_members_insert" ON workspace_members
    FOR INSERT WITH CHECK (
        lower(user_email) = lower(auth.jwt()->>'email')
        OR workspace_id IN (
            SELECT wm.workspace_id FROM workspace_members wm
            WHERE lower(wm.user_email) = lower(auth.jwt()->>'email') AND wm.role = 'owner'
        )
    );

CREATE POLICY "workspace_members_update" ON workspace_members
    FOR UPDATE USING (
        lower(user_email) = lower(auth.jwt()->>'email')
        OR workspace_id IN (
            SELECT wm.workspace_id FROM workspace_members wm
            WHERE lower(wm.user_email) = lower(auth.jwt()->>'email') AND wm.role = 'owner'
        )
    );

CREATE POLICY "workspace_members_delete" ON workspace_members
    FOR DELETE USING (
        lower(user_email) = lower(auth.jwt()->>'email')
        OR workspace_id IN (
            SELECT wm.workspace_id FROM workspace_members wm
            WHERE lower(wm.user_email) = lower(auth.jwt()->>'email') AND wm.role = 'owner'
        )
    );

-- ============================================
-- PROJECTS
-- ============================================

DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;

CREATE POLICY "projects_select" ON projects
    FOR SELECT USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "projects_insert" ON projects
    FOR INSERT WITH CHECK (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "projects_update" ON projects
    FOR UPDATE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "projects_delete" ON projects
    FOR DELETE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

-- ============================================
-- ASSIGNMENTS
-- ============================================

DROP POLICY IF EXISTS "assignments_select" ON assignments;
DROP POLICY IF EXISTS "assignments_insert" ON assignments;
DROP POLICY IF EXISTS "assignments_update" ON assignments;
DROP POLICY IF EXISTS "assignments_delete" ON assignments;

CREATE POLICY "assignments_select" ON assignments
    FOR SELECT USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "assignments_insert" ON assignments
    FOR INSERT WITH CHECK (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "assignments_update" ON assignments
    FOR UPDATE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "assignments_delete" ON assignments
    FOR DELETE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

-- ============================================
-- TASKS
-- ============================================

DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

CREATE POLICY "tasks_select" ON tasks
    FOR SELECT USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "tasks_insert" ON tasks
    FOR INSERT WITH CHECK (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "tasks_update" ON tasks
    FOR UPDATE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "tasks_delete" ON tasks
    FOR DELETE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

-- ============================================
-- DOCUMENTS
-- ============================================

DROP POLICY IF EXISTS "Users can read workspace documents" ON documents;
DROP POLICY IF EXISTS "Users can create workspace documents" ON documents;
DROP POLICY IF EXISTS "Users can update workspace documents" ON documents;
DROP POLICY IF EXISTS "Users can delete workspace documents" ON documents;
DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_insert" ON documents;
DROP POLICY IF EXISTS "documents_update" ON documents;
DROP POLICY IF EXISTS "documents_delete" ON documents;

CREATE POLICY "documents_select" ON documents
    FOR SELECT USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "documents_insert" ON documents
    FOR INSERT WITH CHECK (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "documents_update" ON documents
    FOR UPDATE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "documents_delete" ON documents
    FOR DELETE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

-- ============================================
-- AI_RESEARCH_CHATS
-- ============================================

DROP POLICY IF EXISTS "ai_research_chats_select" ON ai_research_chats;
DROP POLICY IF EXISTS "ai_research_chats_insert" ON ai_research_chats;
DROP POLICY IF EXISTS "ai_research_chats_update" ON ai_research_chats;
DROP POLICY IF EXISTS "ai_research_chats_delete" ON ai_research_chats;

CREATE POLICY "ai_research_chats_select" ON ai_research_chats
    FOR SELECT USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "ai_research_chats_insert" ON ai_research_chats
    FOR INSERT WITH CHECK (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "ai_research_chats_update" ON ai_research_chats
    FOR UPDATE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "ai_research_chats_delete" ON ai_research_chats
    FOR DELETE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

-- ============================================
-- TEAM_CHATS
-- ============================================

DROP POLICY IF EXISTS "Users can view team chats in their workspace" ON team_chats;
DROP POLICY IF EXISTS "Users can create team chats in their workspace" ON team_chats;
DROP POLICY IF EXISTS "Users can update team chats in their workspace" ON team_chats;
DROP POLICY IF EXISTS "Users can delete team chats they created" ON team_chats;

CREATE POLICY "team_chats_select" ON team_chats
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "team_chats_insert" ON team_chats
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "team_chats_update" ON team_chats
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "team_chats_delete" ON team_chats
    FOR DELETE USING (
        lower(created_by) = lower(auth.jwt()->>'email')
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email') AND role = 'owner'
        )
    );

-- ============================================
-- TEAM_CHAT_MESSAGES
-- ============================================

DROP POLICY IF EXISTS "Users can view messages in their workspace chats" ON team_chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their workspace chats" ON team_chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON team_chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON team_chat_messages;

CREATE POLICY "team_chat_messages_select" ON team_chat_messages
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "team_chat_messages_insert" ON team_chat_messages
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

CREATE POLICY "team_chat_messages_update" ON team_chat_messages
    FOR UPDATE USING (
        lower(author_email) = lower(auth.jwt()->>'email')
    );

CREATE POLICY "team_chat_messages_delete" ON team_chat_messages
    FOR DELETE USING (
        lower(author_email) = lower(auth.jwt()->>'email')
    );

-- ============================================
-- CONVERSATION_THREADS
-- ============================================

DROP POLICY IF EXISTS "Users can access conversation threads in their workspaces" ON conversation_threads;

CREATE POLICY "conversation_threads_all" ON conversation_threads
    FOR ALL USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

-- ============================================
-- NOTES (if exists)
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
        DROP POLICY IF EXISTS "notes_select" ON notes;
        DROP POLICY IF EXISTS "notes_insert" ON notes;
        DROP POLICY IF EXISTS "notes_update" ON notes;
        DROP POLICY IF EXISTS "notes_delete" ON notes;

        EXECUTE 'CREATE POLICY "notes_select" ON notes FOR SELECT USING (workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE lower(user_email) = lower(auth.jwt()->>''email'')))';
        EXECUTE 'CREATE POLICY "notes_insert" ON notes FOR INSERT WITH CHECK (workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE lower(user_email) = lower(auth.jwt()->>''email'')))';
        EXECUTE 'CREATE POLICY "notes_update" ON notes FOR UPDATE USING (workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE lower(user_email) = lower(auth.jwt()->>''email'')))';
        EXECUTE 'CREATE POLICY "notes_delete" ON notes FOR DELETE USING (workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE lower(user_email) = lower(auth.jwt()->>''email'')))';
    END IF;
END $$;

-- ============================================
-- FOLDERS (if exists)
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'folders') THEN
        DROP POLICY IF EXISTS "folders_select" ON folders;
        DROP POLICY IF EXISTS "folders_insert" ON folders;
        DROP POLICY IF EXISTS "folders_update" ON folders;
        DROP POLICY IF EXISTS "folders_delete" ON folders;

        EXECUTE 'CREATE POLICY "folders_select" ON folders FOR SELECT USING (workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE lower(user_email) = lower(auth.jwt()->>''email'')))';
        EXECUTE 'CREATE POLICY "folders_insert" ON folders FOR INSERT WITH CHECK (workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE lower(user_email) = lower(auth.jwt()->>''email'')))';
        EXECUTE 'CREATE POLICY "folders_update" ON folders FOR UPDATE USING (workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE lower(user_email) = lower(auth.jwt()->>''email'')))';
        EXECUTE 'CREATE POLICY "folders_delete" ON folders FOR DELETE USING (workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE lower(user_email) = lower(auth.jwt()->>''email'')))';
    END IF;
END $$;

-- ============================================
-- DATA NORMALIZATION - Lowercase all emails
-- ============================================

UPDATE workspace_members SET user_email = lower(user_email) WHERE user_email IS NOT NULL AND user_email != lower(user_email);
UPDATE team_chats SET created_by = lower(created_by) WHERE created_by IS NOT NULL AND created_by != lower(created_by);
UPDATE team_chat_messages SET author_email = lower(author_email) WHERE author_email IS NOT NULL AND author_email != lower(author_email);

-- ============================================
-- BACKFILL WORKSPACE_MEMBERS - Ensure all workspace owners are in the table
-- ============================================

INSERT INTO workspace_members (workspace_id, user_email, role, created_at)
SELECT
    w.id as workspace_id,
    lower(w.owner_email) as user_email,
    'owner' as role,
    COALESCE(w.created_date, now()) as created_at
FROM workspaces w
WHERE w.owner_email IS NOT NULL
  AND w.owner_email != ''
  AND NOT EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = w.id
      AND lower(wm.user_email) = lower(w.owner_email)
  )
ON CONFLICT (workspace_id, user_email) DO UPDATE SET role = 'owner';

-- Backfill from workspace members arrays
INSERT INTO workspace_members (workspace_id, user_email, role, created_at)
SELECT
    w.id as workspace_id,
    lower(member_email) as user_email,
    'member' as role,
    COALESCE(w.created_date, now()) as created_at
FROM workspaces w,
     unnest(w.members) as member_email
WHERE w.members IS NOT NULL
  AND array_length(w.members, 1) > 0
  AND member_email IS NOT NULL
  AND member_email != ''
  AND NOT EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = w.id
      AND lower(wm.user_email) = lower(member_email)
  )
ON CONFLICT (workspace_id, user_email) DO NOTHING;

-- ============================================
-- DONE - All RLS policies now use case-insensitive email matching
-- ============================================
