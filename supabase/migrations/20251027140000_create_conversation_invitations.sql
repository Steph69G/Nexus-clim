/*
  # Create Conversation Invitations System

  1. New Tables
    - `conversation_invitations`
      - Tracks invitations sent to external emails (people without accounts)
      - Stores unique invitation tokens for secure registration links
      - Tracks invitation status (pending, accepted, expired, cancelled)
      - Includes expiration timestamps for security
      - Links to the conversation and inviting user

  2. Security (RLS Policies)
    - Participants can view invitations for their conversations
    - Participants can create invitations for their conversations
    - Invitations are publicly readable by token (for registration page)
    - Only the inviter or conversation admin can cancel invitations

  3. Functions
    - Auto-generate secure random token on insert
    - Auto-set expiration date (7 days by default)
    - Function to validate invitation token
    - Function to accept invitation (creates user participant)

  4. Integration
    - Works with existing email_templates system
    - Integrates with conversation_participants table
    - Supports role-based invitation (admin vs regular user)
*/

-- =====================================================
-- 1. CONVERSATION INVITATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS conversation_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to conversation
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Email of person being invited (may not have account yet)
  invited_email text NOT NULL,

  -- Who sent the invitation
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Secure token for registration link
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Status tracking
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,

  -- Optional message from inviter
  message text,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Prevent duplicate pending invitations
  UNIQUE(conversation_id, invited_email, status)
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_conversation_invitations_token
  ON conversation_invitations(token) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_conversation_invitations_conversation
  ON conversation_invitations(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_invitations_email
  ON conversation_invitations(invited_email) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_conversation_invitations_expires
  ON conversation_invitations(expires_at) WHERE status = 'pending';

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE conversation_invitations ENABLE ROW LEVEL SECURITY;

-- Participants can view invitations for their conversations
CREATE POLICY "Participants can view invitations in their conversations"
  ON conversation_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversation_invitations.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Public can read invitations by token (for registration page)
CREATE POLICY "Anyone can view invitation by token"
  ON conversation_invitations FOR SELECT
  TO anon, authenticated
  USING (status = 'pending' AND expires_at > now());

-- Participants can create invitations for their conversations
CREATE POLICY "Participants can create invitations"
  ON conversation_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversation_invitations.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Inviter or admins can update invitation status
CREATE POLICY "Inviter or admins can update invitations"
  ON conversation_invitations FOR UPDATE
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversation_invitations.conversation_id
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.role = 'admin'
    )
  );

-- =====================================================
-- 4. FUNCTIONS
-- =====================================================

-- Function: Validate invitation token
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
  LEFT JOIN profiles p ON p.id = ci.invited_by
  WHERE ci.token = p_token
  AND ci.status = 'pending'
  AND ci.expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Accept invitation (after user registration)
CREATE OR REPLACE FUNCTION accept_invitation(
  p_token text,
  p_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_invitation record;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM conversation_invitations
  WHERE token = p_token
  AND status = 'pending'
  AND expires_at > now();

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Add user as participant
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (v_invitation.conversation_id, p_user_id, 'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  -- Mark invitation as accepted
  UPDATE conversation_invitations
  SET
    status = 'accepted',
    accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Expire old invitations (run periodically)
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE conversation_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cancel invitation
CREATE OR REPLACE FUNCTION cancel_invitation(p_invitation_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE conversation_invitations
  SET status = 'cancelled'
  WHERE id = p_invitation_id
  AND status = 'pending'
  AND (
    invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversation_invitations.conversation_id
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.role = 'admin'
    )
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. EMAIL TEMPLATE FOR INVITATIONS
-- =====================================================

-- Add conversation_invitation to email_templates
INSERT INTO email_templates (template_name, subject, body_html, body_text, is_active)
VALUES (
  'conversation_invitation',
  '{{inviter_name}} vous invite à rejoindre une conversation',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invitation à une conversation</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p><strong>{{inviter_name}}</strong> vous invite à rejoindre une conversation : <strong>{{conversation_title}}</strong></p>
      {{#if message}}
      <p style="background: #f1f5f9; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
        <em>Message personnel : {{message}}</em>
      </p>
      {{/if}}
      <p>Pour accepter cette invitation, créez votre compte et rejoignez la conversation :</p>
      <div style="text-align: center;">
        <a href="{{invitation_link}}" class="button">Accepter l''invitation</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">Cette invitation expire le {{expiration_date}}</p>
    </div>
    <div class="footer">
      <p>Nexus Clim - Plateforme de gestion d''interventions</p>
    </div>
  </div>
</body>
</html>',
  'Bonjour,

{{inviter_name}} vous invite à rejoindre une conversation : {{conversation_title}}

{{#if message}}
Message personnel : {{message}}
{{/if}}

Pour accepter cette invitation, cliquez sur le lien ci-dessous :
{{invitation_link}}

Cette invitation expire le {{expiration_date}}

---
Nexus Clim - Plateforme de gestion d''interventions',
  true
)
ON CONFLICT (template_name) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text,
  updated_at = now();
