CREATE TABLE IF NOT EXISTS conversation_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(conversation_id, invited_email, status)
);

CREATE INDEX IF NOT EXISTS idx_conversation_invitations_token ON conversation_invitations(token) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_conversation_invitations_conversation ON conversation_invitations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_invitations_email ON conversation_invitations(invited_email) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_conversation_invitations_expires ON conversation_invitations(expires_at) WHERE status = 'pending';

ALTER TABLE conversation_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view invitations in their conversations" ON conversation_invitations;
CREATE POLICY "Participants can view invitations in their conversations"
  ON conversation_invitations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversation_invitations.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view invitation by token" ON conversation_invitations;
CREATE POLICY "Anyone can view invitation by token"
  ON conversation_invitations FOR SELECT TO anon, authenticated
  USING (status = 'pending' AND expires_at > now());

DROP POLICY IF EXISTS "Participants can create invitations" ON conversation_invitations;
CREATE POLICY "Participants can create invitations"
  ON conversation_invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversation_invitations.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Inviter or admins can update invitations" ON conversation_invitations;
CREATE POLICY "Inviter or admins can update invitations"
  ON conversation_invitations FOR UPDATE TO authenticated
  USING (
    invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversation_invitations.conversation_id
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION validate_invitation_token(p_token text)
RETURNS TABLE (
  invitation_id uuid,
  conversation_id uuid,
  invited_email text,
  conversation_title text,
  inviter_name text,
  message text,
  expires_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id,
    ci.conversation_id,
    ci.invited_email,
    COALESCE(c.title, 'Conversation'),
    COALESCE(p.full_name, 'Un utilisateur'),
    ci.message,
    ci.expires_at
  FROM conversation_invitations ci
  JOIN conversations c ON c.id = ci.conversation_id
  LEFT JOIN profiles p ON p.user_id = ci.invited_by
  WHERE ci.token = p_token
  AND ci.status = 'pending'
  AND ci.expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION accept_invitation(p_token text, p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_invitation record;
BEGIN
  SELECT * INTO v_invitation
  FROM conversation_invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (v_invitation.conversation_id, p_user_id, 'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  UPDATE conversation_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
