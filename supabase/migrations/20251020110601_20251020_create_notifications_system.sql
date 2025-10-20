/*
  # Create Notifications System

  1. New Tables
    - `notifications`
      - Multi-channel notifications (email, SMS, push, in-app)
      - Event-driven (mission assigned, quote accepted, maintenance reminder, etc.)
      - Status tracking (pending, sent, delivered, failed)
      - User preferences integration
      - Template support

  2. Security
    - Enable RLS
    - Users can view their own notifications
    - Admin can view all notifications
    - System can create notifications

  3. Features
    - Multiple notification types
    - Channel preferences per user
    - Delivery tracking
    - Retry logic for failed notifications
    - Read/unread status
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  
  -- Notification classification
  notification_type text NOT NULL CHECK (notification_type IN (
    -- Mission notifications
    'mission_assigned',
    'mission_updated',
    'mission_completed',
    'mission_cancelled',
    
    -- Quote notifications
    'quote_sent',
    'quote_accepted',
    'quote_rejected',
    'quote_expiring',
    
    -- Invoice notifications
    'invoice_sent',
    'invoice_paid',
    'invoice_overdue',
    
    -- Contract notifications
    'contract_created',
    'contract_renewal_reminder',
    'contract_expiring',
    'maintenance_due',
    
    -- Emergency notifications
    'emergency_request_received',
    'emergency_assigned',
    'emergency_resolved',
    
    -- Survey notifications
    'survey_request',
    'survey_reminder',
    
    -- System notifications
    'certification_expiring',
    'payment_released',
    'document_available',
    
    -- Other
    'general'
  )),
  
  -- Content
  title text NOT NULL,
  message text NOT NULL,
  
  -- Delivery channels
  channels text[] NOT NULL DEFAULT ARRAY['in_app']::text[], -- ['email', 'sms', 'push', 'in_app']
  
  -- Priority
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Status per channel
  email_status text CHECK (email_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  email_sent_at timestamptz,
  email_delivered_at timestamptz,
  email_error text,
  
  sms_status text CHECK (sms_status IN ('pending', 'sent', 'delivered', 'failed')),
  sms_sent_at timestamptz,
  sms_delivered_at timestamptz,
  sms_error text,
  
  push_status text CHECK (push_status IN ('pending', 'sent', 'delivered', 'failed')),
  push_sent_at timestamptz,
  push_delivered_at timestamptz,
  push_error text,
  
  -- In-app notification status
  read_at timestamptz,
  archived_at timestamptz,
  
  -- Relations (link to relevant entities)
  related_mission_id uuid,
  related_quote_id uuid,
  related_invoice_id uuid,
  related_contract_id uuid,
  related_request_id uuid,
  
  -- Action link (deep link for mobile app or web URL)
  action_url text,
  action_label text,
  
  -- Data payload (for rich notifications)
  data jsonb DEFAULT '{}'::jsonb,
  
  -- Retry logic
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  next_retry_at timestamptz,
  
  -- Metadata
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_notification_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_email_status ON notifications(email_status) WHERE email_status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_notifications_sms_status ON notifications(sms_status) WHERE sms_status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_notifications_push_status ON notifications(push_status) WHERE push_status IN ('pending', 'failed');

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_channels text[] DEFAULT ARRAY['in_app']::text[],
  p_priority text DEFAULT 'normal',
  p_related_mission_id uuid DEFAULT NULL,
  p_related_quote_id uuid DEFAULT NULL,
  p_related_invoice_id uuid DEFAULT NULL,
  p_related_contract_id uuid DEFAULT NULL,
  p_action_url text DEFAULT NULL,
  p_action_label text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (
    user_id,
    notification_type,
    title,
    message,
    channels,
    priority,
    related_mission_id,
    related_quote_id,
    related_invoice_id,
    related_contract_id,
    action_url,
    action_label,
    data
  ) VALUES (
    p_user_id,
    p_notification_type,
    p_title,
    p_message,
    p_channels,
    p_priority,
    p_related_mission_id,
    p_related_quote_id,
    p_related_invoice_id,
    p_related_contract_id,
    p_action_url,
    p_action_label,
    p_data
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read_at = now()
  WHERE id = p_notification_id
  AND user_id = auth.uid()
  AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read_at = now()
  WHERE user_id = auth.uid()
  AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example trigger: notify when mission is assigned
CREATE OR REPLACE FUNCTION notify_mission_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_user_id IS NOT NULL AND (OLD.assigned_user_id IS NULL OR OLD.assigned_user_id != NEW.assigned_user_id) THEN
    PERFORM create_notification(
      NEW.assigned_user_id,
      'mission_assigned',
      'Nouvelle mission assignée',
      'Une nouvelle mission vous a été assignée: ' || COALESCE(NEW.title, 'Mission #' || NEW.id),
      ARRAY['in_app', 'email', 'push']::text[],
      'normal',
      NEW.id,
      NULL,
      NULL,
      NULL,
      '/missions/' || NEW.id,
      'Voir la mission',
      jsonb_build_object('mission_id', NEW.id, 'city', NEW.city)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_mission_assigned_trigger ON missions;
CREATE TRIGGER notify_mission_assigned_trigger
  AFTER INSERT OR UPDATE OF assigned_user_id ON missions
  FOR EACH ROW
  EXECUTE FUNCTION notify_mission_assigned();

-- Example trigger: notify when quote is accepted
CREATE OR REPLACE FUNCTION notify_quote_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Notify the creator of the quote
    PERFORM create_notification(
      NEW.created_by_user_id,
      'quote_accepted',
      'Devis accepté',
      'Le devis ' || NEW.quote_number || ' a été accepté par le client',
      ARRAY['in_app', 'email']::text[],
      'high',
      NULL,
      NEW.id,
      NULL,
      NULL,
      '/admin/quotes/' || NEW.id,
      'Voir le devis',
      jsonb_build_object('quote_id', NEW.id, 'quote_number', NEW.quote_number)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_quote_accepted_trigger ON quotes;
CREATE TRIGGER notify_quote_accepted_trigger
  AFTER UPDATE OF status ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION notify_quote_accepted();

COMMENT ON TABLE notifications IS 'Multi-channel notification system (email, SMS, push, in-app)';
COMMENT ON COLUMN notifications.channels IS 'Array of delivery channels: email, sms, push, in_app';
COMMENT ON COLUMN notifications.data IS 'Additional structured data for rich notifications';
COMMENT ON FUNCTION create_notification IS 'Helper function to create notifications with standard parameters';
