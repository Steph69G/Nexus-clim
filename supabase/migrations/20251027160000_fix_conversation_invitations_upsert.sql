/*
  # Fix Conversation Invitations - Support UPSERT and Resend

  ## Problem
  - 409 conflict when trying to invite the same email twice to the same conversation
  - Need to support both manual link sharing and automatic email sending

  ## Solution
  1. Replace unique constraint with partial index (only for pending invitations)
  2. Add resent_count and send_method columns
  3. Allow UPSERT to update existing pending invitations with new token and expiry

  ## Changes
  - Drop old unique constraint
  - Add partial unique index on (conversation_id, invited_email) WHERE status='pending'
  - Add resent_count column to track how many times invitation was resent
  - Add send_method column ('manual' or 'email')
*/

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_invitations' AND column_name = 'resent_count'
  ) THEN
    ALTER TABLE conversation_invitations ADD COLUMN resent_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_invitations' AND column_name = 'send_method'
  ) THEN
    ALTER TABLE conversation_invitations ADD COLUMN send_method text DEFAULT 'manual' CHECK (send_method IN ('manual', 'email'));
  END IF;
END $$;

-- Drop the old unique constraint if it exists
-- The exact name might vary, check your schema
DROP INDEX IF EXISTS conversation_invitations_conversation_id_invited_email_stat_key;
DROP INDEX IF EXISTS conversation_invitations_conversation_id_invited_email_key;

-- Create partial unique index: only one PENDING invitation per conversation+email
-- This allows multiple invitations in history (pending → accepted, pending → expired, etc.)
CREATE UNIQUE INDEX IF NOT EXISTS conversation_invitations_unique_pending
ON conversation_invitations (conversation_id, invited_email)
WHERE status = 'pending';

-- Add comment
COMMENT ON INDEX conversation_invitations_unique_pending IS 'Ensures only one pending invitation per conversation and email. Allows historical records with other statuses.';

COMMENT ON COLUMN conversation_invitations.resent_count IS 'Number of times this invitation was resent or regenerated';
COMMENT ON COLUMN conversation_invitations.send_method IS 'How the invitation was sent: manual (copy link) or email (automatic)';
