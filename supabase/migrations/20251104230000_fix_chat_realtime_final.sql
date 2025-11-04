/*
  # Fix Chat Realtime - Final Solution

  Problem: The previous fix using profiles subquery or JWT claims both have issues:
  - Profiles subquery: Too slow, creates recursion risk
  - JWT claims: user_role not in JWT by default

  Solution: Use a SECURITY DEFINER helper function to check role efficiently.
  This bypasses RLS and is fast because it's a simple lookup with no recursion.
*/

-- Drop previous policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON chat_messages;

-- Helper function to check if current user is admin/sal
CREATE OR REPLACE FUNCTION is_admin_or_sal()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'sal')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create optimized policy using helper function
CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    -- Admin/Sal can see all messages
    is_admin_or_sal()

    -- OR regular users can see messages from their conversations
    OR EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = chat_messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Add index to speed up the admin check
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_role
  ON profiles(user_id, role);
