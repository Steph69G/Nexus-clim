/*
  # Fix Chat RLS Recursion - Part 2

  1. Problem
    - DELETE policy still has recursion in admin role check
    
  2. Solution
    - Create helper function for admin check too
    - Use SECURITY DEFINER to break recursion
*/

-- Drop the still-recursive DELETE policy
DROP POLICY IF EXISTS "Conversation admins can remove participants" ON conversation_participants;

-- Create security definer function to check if user is conversation admin
CREATE OR REPLACE FUNCTION is_conversation_admin(conversation_uuid UUID, user_uuid UUID)
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
      AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM conversations
    WHERE id = conversation_uuid
      AND created_by = user_uuid
  );
$$;

-- Create new non-recursive DELETE policy
CREATE POLICY "Conversation admins can remove participants"
  ON conversation_participants
  FOR DELETE
  TO authenticated
  USING (
    is_conversation_admin(conversation_id, auth.uid())
  );

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_conversation_admin(UUID, UUID) TO authenticated;
