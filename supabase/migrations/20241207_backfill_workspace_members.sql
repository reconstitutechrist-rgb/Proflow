-- Migration: Backfill workspace_members from existing workspaces
-- This ensures RLS policies work for existing workspaces that were created
-- before workspace_members was properly synchronized

-- ============================================
-- Step 1: Add workspace owners to workspace_members
-- ============================================

-- Owners may not be in the members array, so add them separately
INSERT INTO workspace_members (workspace_id, user_email, role, created_at)
SELECT
    w.id as workspace_id,
    lower(w.owner_email) as user_email,
    'owner' as role,
    COALESCE(w.created_date, now()) as created_at
FROM workspaces w
WHERE w.owner_email IS NOT NULL
  AND w.owner_email != ''
ON CONFLICT (workspace_id, user_email) DO NOTHING;

-- ============================================
-- Step 2: Add workspace members from the members array
-- ============================================

-- Members array contains email addresses of invited users
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
ON CONFLICT (workspace_id, user_email) DO UPDATE SET
    -- If already exists, upgrade to owner if they were owner
    role = CASE
        WHEN excluded.user_email = lower((SELECT owner_email FROM workspaces WHERE id = excluded.workspace_id))
        THEN 'owner'
        ELSE workspace_members.role  -- Keep existing role
    END;

-- ============================================
-- Verification query (run manually to check)
-- ============================================
-- SELECT
--     w.name as workspace_name,
--     w.owner_email,
--     array_length(w.members, 1) as member_count,
--     (SELECT count(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) as synced_count
-- FROM workspaces w;
