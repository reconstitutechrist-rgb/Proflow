-- Migration: Fix team_chats and team_chat_messages RLS policies for case-insensitive email matching
-- These tables were missed in the previous case-sensitivity fixes

-- ============================================
-- Step 1: Fix TEAM_CHATS policies
-- ============================================

DROP POLICY IF EXISTS "Users can view team chats in their workspace" ON team_chats;
CREATE POLICY "Users can view team chats in their workspace"
    ON team_chats FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "Users can create team chats in their workspace" ON team_chats;
CREATE POLICY "Users can create team chats in their workspace"
    ON team_chats FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "Users can update team chats in their workspace" ON team_chats;
CREATE POLICY "Users can update team chats in their workspace"
    ON team_chats FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "Users can delete team chats they created" ON team_chats;
CREATE POLICY "Users can delete team chats they created"
    ON team_chats FOR DELETE
    USING (
        lower(created_by) = lower(auth.jwt()->>'email')
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email') AND role = 'owner'
        )
    );

-- ============================================
-- Step 2: Fix TEAM_CHAT_MESSAGES policies
-- ============================================

DROP POLICY IF EXISTS "Users can view messages in their workspace chats" ON team_chat_messages;
CREATE POLICY "Users can view messages in their workspace chats"
    ON team_chat_messages FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "Users can send messages in their workspace chats" ON team_chat_messages;
CREATE POLICY "Users can send messages in their workspace chats"
    ON team_chat_messages FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE lower(user_email) = lower(auth.jwt()->>'email')
        )
    );

DROP POLICY IF EXISTS "Users can update their own messages" ON team_chat_messages;
CREATE POLICY "Users can update their own messages"
    ON team_chat_messages FOR UPDATE
    USING (lower(author_email) = lower(auth.jwt()->>'email'));

DROP POLICY IF EXISTS "Users can delete their own messages" ON team_chat_messages;
CREATE POLICY "Users can delete their own messages"
    ON team_chat_messages FOR DELETE
    USING (lower(author_email) = lower(auth.jwt()->>'email'));

-- ============================================
-- Step 3: Normalize existing email data to lowercase
-- ============================================

UPDATE team_chats
SET created_by = lower(created_by)
WHERE created_by != lower(created_by);

UPDATE team_chat_messages
SET author_email = lower(author_email)
WHERE author_email != lower(author_email);

-- ============================================
-- Done! team_chats and team_chat_messages RLS policies now use case-insensitive matching
-- ============================================
