-- Migration: Update workspace_members to use user_email instead of user_id
-- This simplifies RLS policies and aligns with how the app tracks users

-- ============================================
-- Step 1: Add user_email column
-- ============================================
ALTER TABLE workspace_members
ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);

-- ============================================
-- Step 2: Populate user_email from users table
-- ============================================
UPDATE workspace_members wm
SET user_email = u.email
FROM users u
WHERE wm.user_id = u.id
AND wm.user_email IS NULL;

-- ============================================
-- Step 3: Make user_email NOT NULL (after populating)
-- ============================================
-- Only run this after confirming all rows have user_email populated
-- ALTER TABLE workspace_members ALTER COLUMN user_email SET NOT NULL;

-- ============================================
-- Step 4: Add index on user_email for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_email
ON workspace_members(user_email);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_email
ON workspace_members(workspace_id, user_email);

-- ============================================
-- Step 5: Update RLS policies for workspace_members
-- ============================================

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view their workspace memberships" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage workspace members" ON workspace_members;

-- Create new policies using user_email
CREATE POLICY "Users can view workspace members"
    ON workspace_members FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "Users can join workspaces"
    ON workspace_members FOR INSERT
    WITH CHECK (user_email = auth.jwt()->>'email');

CREATE POLICY "Owners can manage workspace members"
    ON workspace_members FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email' AND role = 'owner'
        )
    );

-- ============================================
-- Optional: Drop user_id column after migration is verified
-- ============================================
-- WARNING: Only run this after confirming everything works!
-- ALTER TABLE workspace_members DROP COLUMN user_id;
