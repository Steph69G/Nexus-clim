/*
  # Fix Chat Realtime Performance

  Problem: Client doesn't receive messages anymore because the policy
  does a slow subquery to profiles table.

  Solution: Use auth.jwt() claims to check role (faster, no subquery needed).

  Note: We store user_role in the JWT claims via the handle_new_profile trigger.
*/

-- Drop the slow policy
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON chat_messages;

-- Create optimized policy using JWT claims
CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    -- Admin/Sal can see all messages (check JWT role claim)
    (COALESCE(auth.jwt()->>'user_role', '') IN ('admin', 'sal'))

    -- OR regular users can see messages from their conversations
    OR (
      EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_participants.conversation_id = chat_messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
      )
    )
  );