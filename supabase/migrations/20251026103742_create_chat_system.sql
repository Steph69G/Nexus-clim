/*
  # Create Chat System

  1. New Tables
    - `conversations`
      - Supports direct messages (1-to-1), group chats, and mission-related conversations
      - Tracks last message timestamp for sorting
      - Stores conversation metadata (title, type, mission link)
    
    - `conversation_participants`
      - Many-to-many relationship between users and conversations
      - Tracks when each participant last read the conversation
      - Supports roles (member, admin) for group management
    
    - `chat_messages`
      - Stores all messages with support for text, images, files, and system messages
      - Tracks edits and soft deletes
      - Supports read receipts via array of user IDs
      - Stores metadata for rich content (file URLs, image dimensions, etc.)

  2. Security (RLS Policies)
    - Users can only see conversations they participate in
    - Users can only see messages from their conversations
    - Users can send messages to conversations they're part of
    - Users can create new conversations (auto-added as participant)
    - Users can mark their own read timestamps

  3. Triggers & Functions
    - Auto-update conversation.last_message_at on new message
    - Auto-update conversation.updated_at on activity
    - Auto-add creator as admin participant when creating conversation

  4. Indexes
    - Optimized for fetching user's conversations list
    - Optimized for fetching messages in a conversation
    - Optimized for unread counts
*/

-- =====================================================
-- 1. CONVERSATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Conversation type
  type text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'mission')),
  
  -- Optional title (for groups, null for direct messages)
  title text,
  
  -- Optional link to mission
  mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  
  -- Creator
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  
  -- Metadata (for future extensibility)
  metadata jsonb DEFAULT '{}'::jsonb
);

-- =====================================================
-- 2. CONVERSATION PARTICIPANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role in conversation
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  
  -- Timestamps
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  
  -- Unique constraint: user can only be in a conversation once
  UNIQUE(conversation_id, user_id)
);

-- =====================================================
-- 3. CHAT MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Message content
  message_text text NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  
  -- Metadata (file URLs, image dimensions, etc.)
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  
  -- Read receipts (array of user IDs who read this message)
  read_by uuid[] DEFAULT ARRAY[]::uuid[]
);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

-- Fetch all conversations for a user (sorted by last activity)
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id 
  ON conversation_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at 
  ON conversations(last_message_at DESC NULLS LAST);

-- Fetch messages in a conversation (chronological order)
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created 
  ON chat_messages(conversation_id, created_at DESC);

-- Find conversations by mission
CREATE INDEX IF NOT EXISTS idx_conversations_mission_id 
  ON conversations(mission_id) WHERE mission_id IS NOT NULL;

-- Find unread messages efficiently
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at 
  ON chat_messages(created_at DESC);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CONVERSATIONS POLICIES
-- =====================================================

-- Users can view conversations they participate in
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Users can create new conversations
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Users can update conversations they're admin of
CREATE POLICY "Conversation admins can update"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.role = 'admin'
    )
  );

-- =====================================================
-- CONVERSATION PARTICIPANTS POLICIES
-- =====================================================

-- Users can view participants of their conversations
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Users can join conversations (when added by others or creating)
CREATE POLICY "Users can be added to conversations"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own participant record (last_read_at)
CREATE POLICY "Users can update their participant status"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can remove participants
CREATE POLICY "Admins can remove participants"
  ON conversation_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.role = 'admin'
    )
  );

-- =====================================================
-- CHAT MESSAGES POLICIES
-- =====================================================

-- Users can view messages from their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = chat_messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Users can send messages to their conversations
CREATE POLICY "Users can send messages to their conversations"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = chat_messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Users can edit/delete their own messages
CREATE POLICY "Users can update their own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- =====================================================
-- 6. TRIGGERS & FUNCTIONS
-- =====================================================

-- Function: Update conversation's last_message_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update conversation on new message
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON chat_messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function: Auto-add creator as admin participant
CREATE OR REPLACE FUNCTION add_creator_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Add creator as participant on conversation creation
DROP TRIGGER IF EXISTS trigger_add_creator_as_participant ON conversations;
CREATE TRIGGER trigger_add_creator_as_participant
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_participant();

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function: Get unread message count for a user in a conversation
CREATE OR REPLACE FUNCTION get_unread_count(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS integer AS $$
DECLARE
  v_last_read timestamptz;
  v_count integer;
BEGIN
  -- Get user's last read timestamp
  SELECT last_read_at INTO v_last_read
  FROM conversation_participants
  WHERE conversation_id = p_conversation_id
  AND user_id = p_user_id;
  
  -- Count messages after last read
  SELECT COUNT(*) INTO v_count
  FROM chat_messages
  WHERE conversation_id = p_conversation_id
  AND sender_id != p_user_id
  AND created_at > COALESCE(v_last_read, '1970-01-01'::timestamptz)
  AND deleted_at IS NULL;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_conversation_id uuid
)
RETURNS void AS $$
BEGIN
  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
