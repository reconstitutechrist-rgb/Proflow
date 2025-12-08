-- Migration: Fix RLS policies for case-insensitive email matching on ALL tables
-- This extends the case-sensitivity fix to projects, assignments, tasks, and ai_research_chats

-- ============================================
-- Step 1: Fix PROJECTS policies
-- ============================================

DROP POLICY IF EXISTS "projects_select" ON projects;
CREATE POLICY "projects_select" ON projects
    FOR SELECT USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "projects_insert" ON projects;
CREATE POLICY "projects_insert" ON projects
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects
    FOR UPDATE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "projects_delete" ON projects;
CREATE POLICY "projects_delete" ON projects
    FOR DELETE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

-- ============================================
-- Step 2: Fix ASSIGNMENTS policies
-- ============================================

DROP POLICY IF EXISTS "assignments_select" ON assignments;
CREATE POLICY "assignments_select" ON assignments
    FOR SELECT USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "assignments_insert" ON assignments;
CREATE POLICY "assignments_insert" ON assignments
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "assignments_update" ON assignments;
CREATE POLICY "assignments_update" ON assignments
    FOR UPDATE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "assignments_delete" ON assignments;
CREATE POLICY "assignments_delete" ON assignments
    FOR DELETE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

-- ============================================
-- Step 3: Fix TASKS policies
-- ============================================

DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks
    FOR SELECT USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "tasks_insert" ON tasks;
CREATE POLICY "tasks_insert" ON tasks
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "tasks_update" ON tasks;
CREATE POLICY "tasks_update" ON tasks
    FOR UPDATE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "tasks_delete" ON tasks;
CREATE POLICY "tasks_delete" ON tasks
    FOR DELETE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

-- ============================================
-- Step 4: Fix AI_RESEARCH_CHATS policies
-- ============================================

DROP POLICY IF EXISTS "ai_research_chats_select" ON ai_research_chats;
CREATE POLICY "ai_research_chats_select" ON ai_research_chats
    FOR SELECT USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "ai_research_chats_insert" ON ai_research_chats;
CREATE POLICY "ai_research_chats_insert" ON ai_research_chats
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "ai_research_chats_update" ON ai_research_chats;
CREATE POLICY "ai_research_chats_update" ON ai_research_chats
    FOR UPDATE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "ai_research_chats_delete" ON ai_research_chats;
CREATE POLICY "ai_research_chats_delete" ON ai_research_chats
    FOR DELETE USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

-- ============================================
-- Step 5: Fix NOTES policies (if table exists)
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
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
                        WHERE lower(user_email) = lower(auth.jwt()->>''email'')
                    )
                );
        ';

        EXECUTE '
            CREATE POLICY "notes_insert" ON notes
                FOR INSERT WITH CHECK (
                    workspace_id IN (
                        SELECT workspace_id FROM workspace_members
                        WHERE lower(user_email) = lower(auth.jwt()->>''email'')
                    )
                );
        ';

        EXECUTE '
            CREATE POLICY "notes_update" ON notes
                FOR UPDATE USING (
                    workspace_id IS NULL
                    OR workspace_id IN (
                        SELECT workspace_id FROM workspace_members
                        WHERE lower(user_email) = lower(auth.jwt()->>''email'')
                    )
                );
        ';

        EXECUTE '
            CREATE POLICY "notes_delete" ON notes
                FOR DELETE USING (
                    workspace_id IS NULL
                    OR workspace_id IN (
                        SELECT workspace_id FROM workspace_members
                        WHERE lower(user_email) = lower(auth.jwt()->>''email'')
                    )
                );
        ';
    END IF;
END $$;

-- ============================================
-- Step 6: Fix FOLDERS policies (if table exists)
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'folders') THEN
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
                        WHERE lower(user_email) = lower(auth.jwt()->>''email'')
                    )
                );
        ';

        EXECUTE '
            CREATE POLICY "folders_insert" ON folders
                FOR INSERT WITH CHECK (
                    workspace_id IN (
                        SELECT workspace_id FROM workspace_members
                        WHERE lower(user_email) = lower(auth.jwt()->>''email'')
                    )
                );
        ';

        EXECUTE '
            CREATE POLICY "folders_update" ON folders
                FOR UPDATE USING (
                    workspace_id IS NULL
                    OR workspace_id IN (
                        SELECT workspace_id FROM workspace_members
                        WHERE lower(user_email) = lower(auth.jwt()->>''email'')
                    )
                );
        ';

        EXECUTE '
            CREATE POLICY "folders_delete" ON folders
                FOR DELETE USING (
                    workspace_id IS NULL
                    OR workspace_id IN (
                        SELECT workspace_id FROM workspace_members
                        WHERE lower(user_email) = lower(auth.jwt()->>''email'')
                    )
                );
        ';
    END IF;
END $$;

-- ============================================
-- Done! All RLS policies now use case-insensitive email matching
-- ============================================
