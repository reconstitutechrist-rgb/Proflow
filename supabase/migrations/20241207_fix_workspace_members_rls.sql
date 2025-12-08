-- Migration: Fix workspace_members RLS policies for case-insensitive email matching
-- This fixes the issue where users cannot create tasks/projects/etc because
-- their email in workspace_members doesn't match auth.jwt()->>'email' due to case differences

-- ============================================
-- Step 1: Drop existing workspace_members policies
-- ============================================

DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can join workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage workspace members" ON workspace_members;

-- ============================================
-- Step 2: Create fixed policies with case-insensitive matching
-- ============================================

-- Users can view members of workspaces they belong to
CREATE POLICY "Users can view workspace members"
    ON workspace_members FOR SELECT
    USING (
        workspace_id IN (
            SELECT wm.workspace_id FROM workspace_members wm
            WHERE lower(wm.user_email) = lower(auth.jwt()->>'email')
        )
    );

-- Users can add themselves to any workspace (for accepting invites)
-- Uses case-insensitive matching for email comparison
CREATE POLICY "Users can join workspaces"
    ON workspace_members FOR INSERT
    WITH CHECK (
        lower(user_email) = lower(auth.jwt()->>'email')
    );

-- Users can update their own membership records
CREATE POLICY "Users can update their membership"
    ON workspace_members FOR UPDATE
    USING (
        lower(user_email) = lower(auth.jwt()->>'email')
    );

-- Owners can manage all members in workspaces they own
CREATE POLICY "Owners can manage workspace members"
    ON workspace_members FOR ALL
    USING (
        workspace_id IN (
            SELECT wm.workspace_id FROM workspace_members wm
            WHERE lower(wm.user_email) = lower(auth.jwt()->>'email')
            AND wm.role = 'owner'
        )
    );

-- ============================================
-- Step 3: Ensure all existing workspace_members emails are lowercase
-- ============================================

UPDATE workspace_members
SET user_email = lower(user_email)
WHERE user_email != lower(user_email);

-- ============================================
-- Step 4: Backfill any missing workspace owners to workspace_members
-- ============================================

-- This ensures that workspace owners are always in workspace_members
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
ON CONFLICT (workspace_id, user_email) DO UPDATE SET
    role = 'owner';

-- ============================================
-- Step 5: Also backfill from workspace members arrays
-- ============================================

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
-- Done! workspace_members RLS policies now use case-insensitive matching
-- ============================================
