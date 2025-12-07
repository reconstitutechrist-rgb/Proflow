-- Migration: Add RLS policies to projects, assignments, tasks, and other workspace entities
-- These tables were missing RLS policies, causing documents to appear disconnected

-- ============================================
-- Step 1: Enable RLS on all workspace-scoped tables (only if they exist)
-- ============================================

DO $$
BEGIN
    -- Enable RLS on projects if exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
        ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Enable RLS on assignments if exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignments') THEN
        ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Enable RLS on tasks if exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Enable RLS on ai_research_chats if exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_research_chats') THEN
        ALTER TABLE ai_research_chats ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Enable RLS on notes if exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
        ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Enable RLS on folders if exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'folders') THEN
        ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================
-- Step 2: Drop any existing policies (clean slate)
-- ============================================

DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;

DROP POLICY IF EXISTS "assignments_select" ON assignments;
DROP POLICY IF EXISTS "assignments_insert" ON assignments;
DROP POLICY IF EXISTS "assignments_update" ON assignments;
DROP POLICY IF EXISTS "assignments_delete" ON assignments;

DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

DROP POLICY IF EXISTS "ai_research_chats_select" ON ai_research_chats;
DROP POLICY IF EXISTS "ai_research_chats_insert" ON ai_research_chats;
DROP POLICY IF EXISTS "ai_research_chats_update" ON ai_research_chats;
DROP POLICY IF EXISTS "ai_research_chats_delete" ON ai_research_chats;

-- Notes and folders policies are dropped conditionally in their respective DO blocks below

-- ============================================
-- Step 3: Create PROJECTS policies
-- ============================================

CREATE POLICY "projects_select" ON projects
    FOR SELECT USING (
        workspace_id IS NULL  -- Allow legacy projects without workspace
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "projects_insert" ON projects
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "projects_update" ON projects
    FOR UPDATE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "projects_delete" ON projects
    FOR DELETE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

-- ============================================
-- Step 4: Create ASSIGNMENTS policies
-- ============================================

CREATE POLICY "assignments_select" ON assignments
    FOR SELECT USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "assignments_insert" ON assignments
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "assignments_update" ON assignments
    FOR UPDATE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "assignments_delete" ON assignments
    FOR DELETE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

-- ============================================
-- Step 5: Create TASKS policies
-- ============================================

CREATE POLICY "tasks_select" ON tasks
    FOR SELECT USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "tasks_insert" ON tasks
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "tasks_update" ON tasks
    FOR UPDATE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "tasks_delete" ON tasks
    FOR DELETE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

-- ============================================
-- Step 6: Create AI_RESEARCH_CHATS policies
-- ============================================

CREATE POLICY "ai_research_chats_select" ON ai_research_chats
    FOR SELECT USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "ai_research_chats_insert" ON ai_research_chats
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "ai_research_chats_update" ON ai_research_chats
    FOR UPDATE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "ai_research_chats_delete" ON ai_research_chats
    FOR DELETE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

-- ============================================
-- Step 7: Create NOTES policies (if table exists)
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
        -- Drop existing policies first
        DROP POLICY IF EXISTS "notes_select" ON notes;
        DROP POLICY IF EXISTS "notes_insert" ON notes;
        DROP POLICY IF EXISTS "notes_update" ON notes;
        DROP POLICY IF EXISTS "notes_delete" ON notes;

        EXECUTE '
            CREATE POLICY "notes_select" ON notes
                FOR SELECT USING (
                    workspace_id IS NULL
                    OR workspace_id IN (
                        SELECT workspace_id FROM workspace_members
                        WHERE user_email = auth.jwt()->>''email''
                    )
                );
        ';

        EXECUTE '
            CREATE POLICY "notes_insert" ON notes
                FOR INSERT WITH CHECK (
                    workspace_id IN (
                        SELECT workspace_id FROM workspace_members
                        WHERE user_email = auth.jwt()->>''email''
                    )
                );
        ';

        EXECUTE '
            CREATE POLICY "notes_update" ON notes
                FOR UPDATE USING (
                    workspace_id IS NULL
                    OR workspace_id IN (
                        SELECT workspace_id FROM workspace_members
                        WHERE user_email = auth.jwt()->>''email''
                    )
                );
        ';

        EXECUTE '
            CREATE POLICY "notes_delete" ON notes
                FOR DELETE USING (
                    workspace_id IS NULL
                    OR workspace_id IN (
                        SELECT workspace_id FROM workspace_members
                        WHERE user_email = auth.jwt()->>''email''
                    )
                );
        ';
    END IF;
END $$;

-- ============================================
-- Step 8: Create FOLDERS policies (if table exists)
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'folders') THEN
        -- Drop existing policies first
        DROP POLICY IF EXISTS "folders_select" ON folders;
        DROP POLICY IF EXISTS "folders_insert" ON folders;
        DROP POLICY IF EXISTS "folders_update" ON folders;
        DROP POLICY IF EXISTS "folders_delete" ON folders;

        EXECUTE '
            CREATE POLICY "folders_select" ON folders
                FOR SELECT USING (
                    workspace_id IS NULL
                    OR workspace_id IN (
                        SELECT workspace_id FROM workspace_members
                        WHERE user_email = auth.jwt()->>''email''
                    )
                );
        ';

        EXECUTE '
            CREATE POLICY "folders_insert" ON folders
                FOR INSERT WITH CHECK (
                    workspace_id IN (
                        SELECT workspace_id FROM workspace_members
                        WHERE user_email = auth.jwt()->>''email''
                    )
                );
        ';

        EXECUTE '
            CREATE POLICY "folders_update" ON folders
                FOR UPDATE USING (
                    workspace_id IS NULL
                    OR workspace_id IN (
                        SELECT workspace_id FROM workspace_members
                        WHERE user_email = auth.jwt()->>''email''
                    )
                );
        ';

        EXECUTE '
            CREATE POLICY "folders_delete" ON folders
                FOR DELETE USING (
                    workspace_id IS NULL
                    OR workspace_id IN (
                        SELECT workspace_id FROM workspace_members
                        WHERE user_email = auth.jwt()->>''email''
                    )
                );
        ';
    END IF;
END $$;

-- ============================================
-- Step 9: Update DOCUMENTS policy to allow legacy docs
-- ============================================

-- Drop and recreate documents policies to allow legacy documents without workspace_id
DROP POLICY IF EXISTS "Users can read workspace documents" ON documents;
DROP POLICY IF EXISTS "Users can create workspace documents" ON documents;
DROP POLICY IF EXISTS "Users can update workspace documents" ON documents;
DROP POLICY IF EXISTS "Users can delete workspace documents" ON documents;

CREATE POLICY "Users can read workspace documents" ON documents
    FOR SELECT USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "Users can create workspace documents" ON documents
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "Users can update workspace documents" ON documents
    FOR UPDATE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "Users can delete workspace documents" ON documents
    FOR DELETE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

-- ============================================
-- Done! All workspace entities now have RLS policies
-- ============================================
