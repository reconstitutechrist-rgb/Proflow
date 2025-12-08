-- Fix workspace_members RLS to allow bootstrapping
-- New users need to be able to:
-- 1. SELECT their own records (to check if they exist)
-- 2. INSERT themselves into a workspace

-- Drop existing policies
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;

-- SELECT: Users can see their own records OR records in workspaces they belong to
CREATE POLICY "workspace_members_select" ON workspace_members
    FOR SELECT USING (
        -- User can always see their own membership records
        lower(user_email) = lower(auth.jwt()->>'email')
        OR
        -- User can see all members of workspaces they belong to
        workspace_id IN (
            SELECT wm.workspace_id FROM workspace_members wm
            WHERE lower(wm.user_email) = lower(auth.jwt()->>'email')
        )
    );

-- INSERT: Users can add themselves, or owners can add others
CREATE POLICY "workspace_members_insert" ON workspace_members
    FOR INSERT WITH CHECK (
        -- Users can always insert themselves
        lower(user_email) = lower(auth.jwt()->>'email')
        OR
        -- Owners can add others to their workspaces
        workspace_id IN (
            SELECT wm.workspace_id FROM workspace_members wm
            WHERE lower(wm.user_email) = lower(auth.jwt()->>'email') AND wm.role = 'owner'
        )
    );

-- Also fix workspaces table to allow creating workspaces
-- First check if RLS is enabled on workspaces
DO $$
BEGIN
    -- Enable RLS on workspaces if not already
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'workspaces'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Allow authenticated users to create workspaces
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
CREATE POLICY "workspaces_insert" ON workspaces
    FOR INSERT WITH CHECK (
        -- Anyone authenticated can create a workspace
        auth.jwt()->>'email' IS NOT NULL
    );

-- Allow users to see workspaces they own or are members of
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces
    FOR SELECT USING (
        -- Owner can see their workspaces
        lower(owner_email) = lower(auth.jwt()->>'email')
        OR
        -- Members can see workspaces they belong to
        id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
        OR
        -- Legacy: workspaces without proper owner_email
        owner_email IS NULL
    );

-- Allow owners to update their workspaces
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
CREATE POLICY "workspaces_update" ON workspaces
    FOR UPDATE USING (
        lower(owner_email) = lower(auth.jwt()->>'email')
        OR
        id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email') AND role = 'owner'
        )
    );

-- Allow owners to delete their workspaces
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;
CREATE POLICY "workspaces_delete" ON workspaces
    FOR DELETE USING (
        lower(owner_email) = lower(auth.jwt()->>'email')
        OR
        id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email') AND role = 'owner'
        )
    );
