-- Fix infinite recursion in workspace_members RLS policies
-- The previous policy queried workspace_members within the policy itself, causing recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;

-- Simple SELECT: Users can see records where their email matches
-- This avoids recursion by not querying workspace_members in the policy
CREATE POLICY "workspace_members_select" ON workspace_members
    FOR SELECT USING (
        lower(user_email) = lower(auth.jwt()->>'email')
    );

-- INSERT: Users can only insert records with their own email
CREATE POLICY "workspace_members_insert" ON workspace_members
    FOR INSERT WITH CHECK (
        lower(user_email) = lower(auth.jwt()->>'email')
    );

-- UPDATE: Users can only update their own records
CREATE POLICY "workspace_members_update" ON workspace_members
    FOR UPDATE USING (
        lower(user_email) = lower(auth.jwt()->>'email')
    );

-- DELETE: Users can only delete their own records
CREATE POLICY "workspace_members_delete" ON workspace_members
    FOR DELETE USING (
        lower(user_email) = lower(auth.jwt()->>'email')
    );

-- Fix workspaces policies to avoid recursion too
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;

-- Enable RLS on workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see workspaces they own, are in members array, or legacy (null owner)
CREATE POLICY "workspaces_select" ON workspaces
    FOR SELECT USING (
        -- Owner can see
        lower(owner_email) = lower(auth.jwt()->>'email')
        -- Legacy workspaces without owner
        OR owner_email IS NULL
        -- User is in the members array
        OR lower(auth.jwt()->>'email') = ANY(SELECT lower(m) FROM unnest(members) AS m)
    );

-- INSERT: Any authenticated user can create a workspace
CREATE POLICY "workspaces_insert" ON workspaces
    FOR INSERT WITH CHECK (
        auth.jwt()->>'email' IS NOT NULL
    );

-- UPDATE: Only owners can update
CREATE POLICY "workspaces_update" ON workspaces
    FOR UPDATE USING (
        lower(owner_email) = lower(auth.jwt()->>'email')
    );

-- DELETE: Only owners can delete
CREATE POLICY "workspaces_delete" ON workspaces
    FOR DELETE USING (
        lower(owner_email) = lower(auth.jwt()->>'email')
    );
