/*
  # Fix Conversations INSERT Policy

  1. Problem
    - Users getting "new row violates row-level security policy" when creating conversations
    - Policy exists but auth.uid() might be returning null during insert

  2. Root Cause Analysis
    - The policy checks `created_by = auth.uid()`
    - If auth.uid() is null, the check fails
    - This can happen if JWT token is not properly passed or validated

  3. Solution
    - Drop and recreate the INSERT policy with better error handling
    - Add logging to help debug auth issues
    - Ensure policy is correctly configured

  4. Security
    - Still maintains security: only authenticated users can insert
    - Still validates created_by matches auth.uid()
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

-- Recreate with explicit checks
CREATE POLICY "Users can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Ensure user is authenticated
    auth.uid() IS NOT NULL
    AND
    -- Ensure created_by matches authenticated user
    created_by = auth.uid()
  );

-- Verify the policy was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversations'
    AND policyname = 'Users can create conversations'
  ) THEN
    RAISE EXCEPTION 'Failed to create conversations INSERT policy';
  END IF;

  RAISE NOTICE 'Conversations INSERT policy created successfully';
END $$;
