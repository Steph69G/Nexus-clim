/*
  # Fix Chat Realtime for Admin

  Problem: Admin doesn't receive Realtime broadcasts for messages in conversations
  they're not participants of.

  Solution: Add a separate policy allowing admin/sal roles to view all messages.

  Note: This is for monitoring and support purposes. Admins can already see 
  everything via direct queries, but Realtime respects RLS policies.
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON chat_messages;

-- Create new policy with admin bypass
CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    -- Admin/Sal can see all messages
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'sal')
      )
    )
    -- OR regular users can see messages from their conversations
    OR (
      EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_participants.conversation_id = chat_messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
      )
    )
  );
