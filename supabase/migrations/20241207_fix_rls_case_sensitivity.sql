-- Migration: Fix RLS policies for case-insensitive email matching
-- Also adds support for legacy documents without workspace_id

-- ============================================
-- Step 1: Update workspace_members policies
-- ============================================

DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
CREATE POLICY "workspace_members_select" ON workspace_members
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
CREATE POLICY "workspace_members_insert" ON workspace_members
    FOR INSERT WITH CHECK (
        lower(user_email) = lower(auth.jwt()->>'email')
        OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email') AND role = 'owner'
        )
    );

DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
CREATE POLICY "workspace_members_update" ON workspace_members
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email') AND role = 'owner'
        )
    );

DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;
CREATE POLICY "workspace_members_delete" ON workspace_members
    FOR DELETE USING (
        lower(user_email) = lower(auth.jwt()->>'email')
        OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email') AND role = 'owner'
        )
    );

-- ============================================
-- Step 2: Update documents policies
-- ============================================

DROP POLICY IF EXISTS "Users can read workspace documents" ON documents;
CREATE POLICY "Users can read workspace documents" ON documents
    FOR SELECT USING (
        workspace_id IS NULL  -- Allow legacy docs without workspace
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "Users can create workspace documents" ON documents;
CREATE POLICY "Users can create workspace documents" ON documents
    FOR INSERT WITH CHECK (
        workspace_id IS NULL  -- Allow legacy docs without workspace
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "Users can update workspace documents" ON documents;
CREATE POLICY "Users can update workspace documents" ON documents
    FOR UPDATE USING (
        workspace_id IS NULL  -- Allow legacy docs without workspace
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "Users can delete workspace documents" ON documents;
CREATE POLICY "Users can delete workspace documents" ON documents
    FOR DELETE USING (
        workspace_id IS NULL  -- Allow legacy docs without workspace
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

-- ============================================
-- Step 3: Update conversation_threads policies (if exists)
-- ============================================

DROP POLICY IF EXISTS "Users can access conversation threads in their workspaces" ON conversation_threads;
CREATE POLICY "Users can access conversation threads in their workspaces" ON conversation_threads
    FOR ALL USING (
        workspace_id IS NULL
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );
