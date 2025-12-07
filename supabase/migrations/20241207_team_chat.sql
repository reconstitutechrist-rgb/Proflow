-- Team Chat Feature Migration
-- Creates tables for real-time team chat with AI features

-- ============================================
-- Team Chats Table
-- ============================================
CREATE TABLE IF NOT EXISTS team_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    default_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    summary TEXT,
    summary_generated_at TIMESTAMPTZ,
    participant_emails TEXT[] DEFAULT '{}',
    message_count INTEGER DEFAULT 0,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for team_chats
CREATE INDEX IF NOT EXISTS idx_team_chats_workspace_id ON team_chats(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_chats_status ON team_chats(status);
CREATE INDEX IF NOT EXISTS idx_team_chats_last_activity ON team_chats(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_team_chats_workspace_status ON team_chats(workspace_id, status);

-- ============================================
-- Team Chat Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS team_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    team_chat_id UUID NOT NULL REFERENCES team_chats(id) ON DELETE CASCADE,
    content TEXT,
    author_email VARCHAR(255) NOT NULL,
    author_name VARCHAR(255),
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system', 'ai_summary', 'task_extraction')),
    file_url TEXT,
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    file_size INTEGER,
    mentioned_users TEXT[] DEFAULT '{}',
    extracted_tasks JSONB,
    created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for team_chat_messages
CREATE INDEX IF NOT EXISTS idx_team_chat_messages_team_chat_id ON team_chat_messages(team_chat_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_messages_workspace_id ON team_chat_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_messages_created_date ON team_chat_messages(created_date);
CREATE INDEX IF NOT EXISTS idx_team_chat_messages_chat_created ON team_chat_messages(team_chat_id, created_date);
CREATE INDEX IF NOT EXISTS idx_team_chat_messages_author ON team_chat_messages(author_email);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE team_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_chat_messages ENABLE ROW LEVEL SECURITY;

-- Team Chats Policies
CREATE POLICY "Users can view team chats in their workspace"
    ON team_chats FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "Users can create team chats in their workspace"
    ON team_chats FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "Users can update team chats in their workspace"
    ON team_chats FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "Users can delete team chats they created"
    ON team_chats FOR DELETE
    USING (
        created_by = auth.jwt()->>'email'
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email' AND role = 'owner'
        )
    );

-- Team Chat Messages Policies
CREATE POLICY "Users can view messages in their workspace chats"
    ON team_chat_messages FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "Users can send messages in their workspace chats"
    ON team_chat_messages FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "Users can update their own messages"
    ON team_chat_messages FOR UPDATE
    USING (author_email = auth.jwt()->>'email');

CREATE POLICY "Users can delete their own messages"
    ON team_chat_messages FOR DELETE
    USING (author_email = auth.jwt()->>'email');

-- ============================================
-- Realtime Configuration
-- ============================================

-- Enable realtime for team_chat_messages (for live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE team_chat_messages;

-- ============================================
-- Trigger for updated_date
-- ============================================

-- Function to update updated_date
CREATE OR REPLACE FUNCTION update_team_chat_updated_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on team_chats
DROP TRIGGER IF EXISTS trigger_team_chats_updated_date ON team_chats;
CREATE TRIGGER trigger_team_chats_updated_date
    BEFORE UPDATE ON team_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_team_chat_updated_date();

-- ============================================
-- Storage Bucket for Chat Images (if not exists)
-- ============================================

-- Note: Run this in Supabase Dashboard SQL Editor or via supabase CLI
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('chat-images', 'chat-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy for chat images
-- CREATE POLICY "Authenticated users can upload chat images"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'chat-images' AND auth.role() = 'authenticated');

-- CREATE POLICY "Anyone can view chat images"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'chat-images');
