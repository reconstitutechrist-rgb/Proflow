-- Migration: Update all RLS policies from user_id to user_email
-- This must be run BEFORE dropping the user_id column

-- ============================================
-- Step 1: Drop existing policies that use user_id
-- ============================================

-- workspace_members policies
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;

-- conversation_threads policies
DROP POLICY IF EXISTS "Users can access conversation threads in their workspaces" ON conversation_threads;

-- documents policies
DROP POLICY IF EXISTS "Users can read workspace documents" ON documents;
DROP POLICY IF EXISTS "Users can create workspace documents" ON documents;
DROP POLICY IF EXISTS "Users can update workspace documents" ON documents;
DROP POLICY IF EXISTS "Users can delete workspace documents" ON documents;

-- realtime.messages policies (if they exist)
DROP POLICY IF EXISTS "room_members_can_read" ON realtime.messages;
DROP POLICY IF EXISTS "room_members_can_write" ON realtime.messages;

-- ============================================
-- Step 2: Recreate workspace_members policies using user_email
-- ============================================

-- SELECT policy - users can view members of workspaces they belong to
CREATE POLICY "workspace_members_select" ON workspace_members
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

-- INSERT policy - users can add themselves or owners can add others
CREATE POLICY "workspace_members_insert" ON workspace_members
    FOR INSERT WITH CHECK (
        user_email = auth.jwt()->>'email'
        OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email' AND role = 'owner'
        )
    );

-- UPDATE policy - owners can update member records
CREATE POLICY "workspace_members_update" ON workspace_members
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email' AND role = 'owner'
        )
    );

-- DELETE policy - owners can remove members, users can remove themselves
CREATE POLICY "workspace_members_delete" ON workspace_members
    FOR DELETE USING (
        user_email = auth.jwt()->>'email'
        OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email' AND role = 'owner'
        )
    );

-- ============================================
-- Step 3: Recreate conversation_threads policies using user_email
-- ============================================

CREATE POLICY "Users can access conversation threads in their workspaces" ON conversation_threads
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

-- ============================================
-- Step 4: Recreate documents policies using user_email
-- ============================================

CREATE POLICY "Users can read workspace documents" ON documents
    FOR SELECT USING (
        workspace_id IN (
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
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "Users can delete workspace documents" ON documents
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

-- ============================================
-- Step 5: Recreate realtime.messages policies using user_email (if table exists)
-- ============================================

-- Note: These may fail if the realtime.messages table doesn't exist or has different structure
-- You may need to adjust based on your actual realtime setup

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'realtime' AND table_name = 'messages') THEN
        EXECUTE '
            CREATE POLICY "room_members_can_read" ON realtime.messages
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM workspace_members
                        WHERE user_email = auth.jwt()->>''email''
                    )
                );
        ';

        EXECUTE '
            CREATE POLICY "room_members_can_write" ON realtime.messages
                FOR INSERT WITH CHECK (
                    EXISTS (
                        SELECT 1 FROM workspace_members
                        WHERE user_email = auth.jwt()->>''email''
                    )
                );
        ';
    END IF;
END $$;

-- ============================================
-- Step 6: Now safe to drop user_id column
-- ============================================

ALTER TABLE workspace_members DROP COLUMN IF EXISTS user_id;

-- ============================================
-- Step 7: Make user_email NOT NULL and add unique constraint
-- ============================================

ALTER TABLE workspace_members ALTER COLUMN user_email SET NOT NULL;

-- Add unique constraint on workspace_id + user_email
ALTER TABLE workspace_members
    ADD CONSTRAINT workspace_members_workspace_email_unique
    UNIQUE (workspace_id, user_email);

-- ============================================
-- Done! All policies now use user_email
-- ============================================
