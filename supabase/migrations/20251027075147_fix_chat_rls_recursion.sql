/*
  # Fix Chat RLS Infinite Recursion

  1. Problem
    - Policy "Users can view conversation participants" causes infinite recursion
    - It checks conversation_participants to authorize reading conversation_participants
    - Results in PostgreSQL error: "infinite recursion detected in policy"

  2. Solution
    - Replace recursive EXISTS subquery with direct auth.uid() check
    - Use security definer function to break recursion chain
    - Allow users to view participants only for their own conversations

  3. Changes
    - Drop problematic recursive policies
    - Create helper function to check conversation membership (SECURITY DEFINER)
    - Create new non-recursive policies using the helper function
*/

-- Drop existing recursive policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Admins can remove participants" ON conversation_participants;

-- Create security definer function to check if user is in conversation
-- This breaks the recursion by using SECURITY DEFINER privilege escalation
CREATE OR REPLACE FUNCTION is_conversation_participant(conversation_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM conversation_participants 
    WHERE conversation_id = conversation_uuid 
      AND user_id = user_uuid
  );
$$;

-- Create new non-recursive SELECT policy
CREATE POLICY "Users can view participants of their conversations"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    is_conversation_participant(conversation_id, auth.uid())
  );

-- Create new non-recursive DELETE policy
CREATE POLICY "Conversation admins can remove participants"
  ON conversation_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.role = 'admin'
    )
  );

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_conversation_participant(UUID, UUID) TO authenticated;
