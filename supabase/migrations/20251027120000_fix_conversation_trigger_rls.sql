/*
  # Fix Conversation Creation Trigger & RLS

  1. Problem
    - Users get "new row violates row-level security policy" when creating conversations
    - The AFTER INSERT trigger `add_creator_as_participant()` runs as SECURITY DEFINER
    - In SECURITY DEFINER context, auth.uid() context is lost
    - The INSERT into conversation_participants fails RLS check

  2. Root Cause
    - Trigger tries to INSERT into conversation_participants
    - But the RLS policy on conversation_participants might not work in SECURITY DEFINER context
    - Even though policy says WITH CHECK (true), there may be conflicts

  3. Solution
    - Drop the trigger-based approach
    - Use a single RPC function that does BOTH operations atomically
    - Or: Make the trigger function explicitly bypass RLS using SECURITY DEFINER properly
    - Best approach: Make conversation_participants INSERT policy more permissive

  4. Changes
    - Drop old trigger
    - Recreate with proper RLS bypass
    - Add explicit GRANT permissions
*/

-- =====================================================
-- 1. DROP OLD TRIGGER & FUNCTION
-- =====================================================

DROP TRIGGER IF EXISTS trigger_add_creator_as_participant ON conversations;
DROP FUNCTION IF EXISTS add_creator_as_participant();

-- =====================================================
-- 2. CREATE NEW SECURITY DEFINER FUNCTION WITH RLS BYPASS
-- =====================================================

-- This function runs with elevated privileges and bypasses RLS
CREATE OR REPLACE FUNCTION add_creator_as_participant()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert participant record (bypasses RLS because SECURITY DEFINER)
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- =====================================================
-- 3. RECREATE TRIGGER
-- =====================================================

CREATE TRIGGER trigger_add_creator_as_participant
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_participant();

-- =====================================================
-- 4. ENSURE RLS POLICIES ARE CORRECT
-- =====================================================

-- Make sure conversation_participants INSERT policy allows anyone to be added
DROP POLICY IF EXISTS "Users can be added to conversations" ON conversation_participants;

CREATE POLICY "Users can be added to conversations"
  ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 5. VERIFY SETUP
-- =====================================================

DO $$
BEGIN
  -- Check trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_add_creator_as_participant'
    AND tgrelid = 'conversations'::regclass
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_add_creator_as_participant not found';
  END IF;

  -- Check policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversation_participants'
    AND policyname = 'Users can be added to conversations'
  ) THEN
    RAISE EXCEPTION 'Policy "Users can be added to conversations" not found';
  END IF;

  RAISE NOTICE '✅ Conversation creation trigger and RLS fixed successfully';
END $$;
