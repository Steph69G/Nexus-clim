/*
  # Emergency Request Received Trigger

  1. New Trigger Function
    - `notify_emergency_received()` - Triggers on emergency INSERT
    - Notifies all admin and sal (salarié) users
    - Urgent priority (in-app + email)
    - Unique dedup_key per emergency + user

  2. Benefits
    - Immediate notification to all qualified responders
    - No emergency goes unnoticed
    - Fast response time
    - Reduces manual dispatching

  3. Security
    - SECURITY DEFINER for privileged INSERT
    - Only fires on new emergency_requests
*/

-- Fonction qui notifie tous les profils admin/sal à la création d'une urgence
CREATE OR REPLACE FUNCTION public.notify_emergency_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r_user RECORD;
  v_dedup text;
  v_title text;
  v_message text;
BEGIN
  -- Construire titre et message depuis les colonnes disponibles
  v_title := COALESCE(NEW.title, NEW.description, 'Nouvelle urgence');
  IF length(v_title) > 80 THEN
    v_title := substring(v_title, 1, 77) || '...';
  END IF;

  v_message := COALESCE(
    NEW.description,
    'Une nouvelle demande d''urgence a été reçue.'
  );
  IF length(v_message) > 200 THEN
    v_message := substring(v_message, 1, 197) || '...';
  END IF;

  -- Notifier tous les admin + sal
  FOR r_user IN
    SELECT p.user_id
    FROM public.profiles p
    WHERE p.role IN ('admin', 'sal')
  LOOP
    -- Clé unique par urgence + destinataire
    v_dedup := format('emergency_request_received:%s:%s', NEW.id, r_user.user_id);

    BEGIN
      PERFORM public.create_notification_secure(
        r_user.user_id,
        'emergency_request_received',
        '🚨 ' || v_title,
        v_message,
        ARRAY['in_app', 'email']::text[],
        'urgent',
        NULL,
        NULL,
        NULL,
        NULL,
        '/admin/emergencies/' || NEW.id,
        'Ouvrir',
        jsonb_build_object(
          'emergency_id', NEW.id,
          'contact_phone', NEW.contact_phone,
          'city', NEW.city,
          'urgency_level', NEW.urgency_level
        ),
        v_dedup
      );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trg_emergency_received ON public.emergency_requests;

CREATE TRIGGER trg_emergency_received
  AFTER INSERT ON public.emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_emergency_received();

COMMENT ON FUNCTION public.notify_emergency_received IS
'Trigger: notifies all admin/sal users when emergency request is created';
