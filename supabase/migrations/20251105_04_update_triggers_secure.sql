/*
  # Update Existing Triggers to Use Secure Function

  1. Changes
    - Update notify_mission_assigned to use create_notification_secure
    - Update notify_quote_accepted to use create_notification_secure
    - Add dedup_key for idempotence

  2. Benefits
    - Secure creation via SECURITY DEFINER function
    - Input validation enforced
    - Anti-duplication via dedup_key
    - Respects user preferences (handled by Edge Function)
*/

-- Update mission assigned trigger
CREATE OR REPLACE FUNCTION notify_mission_assigned()
RETURNS TRIGGER AS $$
DECLARE
  v_dedup_key text;
BEGIN
  IF NEW.assigned_user_id IS NOT NULL
     AND (OLD.assigned_user_id IS NULL OR OLD.assigned_user_id != NEW.assigned_user_id) THEN

    -- Build stable dedup key
    v_dedup_key := format('mission_assigned:%s:%s', NEW.id, date_trunc('hour', now()));

    -- Use secure function with error handling
    BEGIN
      PERFORM create_notification_secure(
        NEW.assigned_user_id,
        'mission_assigned',
        'Nouvelle mission assignée',
        'Une nouvelle mission vous a été assignée: ' || COALESCE(NEW.title, 'Mission #' || substring(NEW.id::text, 1, 8)),
        ARRAY['in_app', 'email', 'push']::text[],
        'normal',
        NEW.id,
        NULL,
        NULL,
        NULL,
        '/missions/' || NEW.id,
        'Voir la mission',
        jsonb_build_object('mission_id', NEW.id, 'city', NEW.city),
        v_dedup_key
      );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update quote accepted trigger
CREATE OR REPLACE FUNCTION notify_quote_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_dedup_key text;
BEGIN
  IF NEW.status = 'accepted'
     AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN

    -- Build stable dedup key
    v_dedup_key := format('quote_accepted:%s:%s', NEW.id, NEW.updated_at);

    -- Use secure function with error handling
    BEGIN
      PERFORM create_notification_secure(
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
        jsonb_build_object('quote_id', NEW.id, 'quote_number', NEW.quote_number),
        v_dedup_key
      );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_mission_assigned IS
'Trigger function: Creates secure notification when mission is assigned with dedup protection';

COMMENT ON FUNCTION notify_quote_accepted IS
'Trigger function: Creates secure notification when quote is accepted with dedup protection';
