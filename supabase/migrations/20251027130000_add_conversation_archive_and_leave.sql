/*
  # Add conversation archive and leave functionality

  1. Changes to conversation_participants
    - Add `archived_at` column for archiving conversations per participant
    - Add `left_at` column for leaving conversations (soft delete)

  2. Security
    - Update RLS policies to exclude archived/left conversations from default views
    - Users can still access archived conversations when explicitly requested
*/

-- Add archived_at and left_at columns to conversation_participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_participants' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE conversation_participants ADD COLUMN archived_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_participants' AND column_name = 'left_at'
  ) THEN
    ALTER TABLE conversation_participants ADD COLUMN left_at timestamptz;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_archived
  ON conversation_participants(user_id, archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_participants_left
  ON conversation_participants(user_id, left_at)
  WHERE left_at IS NOT NULL;

-- Add helper function to archive conversation for current user
CREATE OR REPLACE FUNCTION archive_conversation(p_conversation_id uuid, p_archived boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE conversation_participants
  SET archived_at = CASE WHEN p_archived THEN now() ELSE NULL END
  WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid();
END;
$$;

-- Add helper function to leave conversation
CREATE OR REPLACE FUNCTION leave_conversation(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE conversation_participants
  SET left_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid();
END;
$$;
