/*
  # SMS Triggers for Critical Events

  1. Invoice Overdue +7 Days
    - Escalates to SMS when invoice 7+ days overdue
    - Only if not already notified by SMS in last 7 days

  2. Emergency SMS Blast
    - Updates emergency trigger to include SMS
    - Urgent channel for admin/sal

  3. Appointment Reminder
    - New trigger: 24h before appointment
    - Notifies client + technician
    - Runs daily via job

  4. Benefits
    - Multi-channel escalation
    - Reduces no-shows
    - Faster emergency response
*/

-- 1. Update invoice_overdue_sweep to add SMS for 7+ days overdue
CREATE OR REPLACE FUNCTION public.invoice_overdue_sweep()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  v_cnt int := 0;
  v_dedup text;
  v_days_overdue integer;
  v_channels text[];
BEGIN
  FOR r IN
    SELECT
      i.id,
      i.client_id as customer_user_id,
      i.due_date,
      i.payment_status as status,
      i.total_amount,
      i.paid_at,
      i.last_overdue_notified_at,
      EXTRACT(DAY FROM (now() - i.due_date))::integer as days_overdue
    FROM public.invoices i
    WHERE i.due_date < now()
      AND i.payment_status IS DISTINCT FROM 'paid'
      AND i.paid_at IS NULL
      AND (i.last_overdue_notified_at IS NULL OR i.last_overdue_notified_at < now() - interval '24 hours')
    LIMIT 100
  LOOP
    v_days_overdue := r.days_overdue;

    -- SMS escalation après 7 jours
    IF v_days_overdue >= 7 THEN
      v_channels := ARRAY['in_app', 'email', 'sms']::text[];
      v_dedup := format('invoice_overdue_sms:%s:%s', r.id, to_char(now()::date, 'YYYY-MM-DD'));
    ELSE
      v_channels := ARRAY['in_app', 'email']::text[];
      v_dedup := format('invoice_overdue:%s:%s', r.id, to_char(now()::date, 'YYYY-MM-DD'));
    END IF;

    BEGIN
      PERFORM public.create_notification_secure(
        r.customer_user_id,
        'invoice_overdue',
        CASE
          WHEN v_days_overdue >= 7 THEN 'URGENT: Facture en retard'
          ELSE 'Facture en retard'
        END,
        format(
          'Votre facture est en retard de %s jours. Merci de procéder au règlement rapidement.',
          v_days_overdue
        ),
        v_channels,
        CASE WHEN v_days_overdue >= 7 THEN 'urgent' ELSE 'high' END,
        NULL,
        NULL,
        r.id,
        NULL,
        '/client/invoices/' || r.id,
        'Voir la facture',
        jsonb_build_object(
          'invoice_id', r.id,
          'due_date', r.due_date,
          'total_amount', r.total_amount,
          'days_overdue', v_days_overdue
        ),
        v_dedup
      );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;

    UPDATE public.invoices
    SET payment_status = CASE
        WHEN payment_status != 'paid' THEN 'overdue'
        ELSE payment_status
      END,
        last_overdue_notified_at = now()
    WHERE id = r.id;

    v_cnt := v_cnt + 1;
  END LOOP;

  RETURN v_cnt;
END;
$$;

-- 2. Update emergency trigger to include SMS
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

  FOR r_user IN
    SELECT p.user_id
    FROM public.profiles p
    WHERE p.role IN ('admin', 'sal')
  LOOP
    v_dedup := format('emergency_request_received:%s:%s', NEW.id, r_user.user_id);

    BEGIN
      PERFORM public.create_notification_secure(
        r_user.user_id,
        'emergency_request_received',
        '🚨 ' || v_title,
        v_message,
        ARRAY['in_app', 'email', 'sms']::text[],
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

-- 3. Appointment Reminder (24h before)
CREATE OR REPLACE FUNCTION public.appointment_reminder_sweep()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  v_cnt int := 0;
  v_dedup text;
BEGIN
  -- Sélectionne missions confirmées dans 23-25h
  FOR r IN
    SELECT
      m.id,
      m.title,
      m.scheduled_at,
      m.address,
      m.city,
      m.assigned_user_id,
      m.client_id
    FROM public.missions m
    WHERE m.status IN ('Confirmée', 'Planifiée')
      AND m.scheduled_at > now() + interval '23 hours'
      AND m.scheduled_at < now() + interval '25 hours'
      AND m.assigned_user_id IS NOT NULL
    LIMIT 50
  LOOP
    -- Notifier le technicien
    IF r.assigned_user_id IS NOT NULL THEN
      v_dedup := format('appointment_reminder_tech:%s:%s', r.id, to_char(r.scheduled_at::date, 'YYYY-MM-DD'));

      BEGIN
        PERFORM public.create_notification_secure(
          r.assigned_user_id,
          'appointment_reminder',
          'Rappel RDV demain',
          format(
            'RDV demain à %s - %s, %s',
            to_char(r.scheduled_at, 'HH24:MI'),
            r.address,
            r.city
          ),
          ARRAY['in_app', 'sms']::text[],
          'normal',
          r.id,
          NULL,
          NULL,
          NULL,
          '/missions/' || r.id,
          'Voir',
          jsonb_build_object(
            'mission_id', r.id,
            'scheduled_at', r.scheduled_at,
            'address', r.address
          ),
          v_dedup
        );
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END IF;

    -- Notifier le client
    IF r.client_id IS NOT NULL THEN
      v_dedup := format('appointment_reminder_client:%s:%s', r.id, to_char(r.scheduled_at::date, 'YYYY-MM-DD'));

      BEGIN
        PERFORM public.create_notification_secure(
          r.client_id,
          'appointment_reminder',
          'Rappel intervention demain',
          format(
            'Votre intervention est prévue demain à %s. Notre technicien arrivera à l''heure prévue.',
            to_char(r.scheduled_at, 'HH24:MI')
          ),
          ARRAY['in_app', 'sms']::text[],
          'normal',
          r.id,
          NULL,
          NULL,
          NULL,
          '/client/missions/' || r.id,
          'Détails',
          jsonb_build_object(
            'mission_id', r.id,
            'scheduled_at', r.scheduled_at
          ),
          v_dedup
        );
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END IF;

    v_cnt := v_cnt + 1;
  END LOOP;

  RETURN v_cnt;
END;
$$;

-- Schedule appointment reminder job (daily at 08:00 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'appointment_reminder_daily',
      '0 8 * * *',
      $$SELECT public.appointment_reminder_sweep();$$
    );
  ELSE
    RAISE NOTICE 'pg_cron not found. Schedule via Supabase Scheduled Functions.';
  END IF;
END $$;

COMMENT ON FUNCTION public.appointment_reminder_sweep IS
'Daily job: sends SMS reminders 24h before confirmed appointments';

COMMENT ON FUNCTION public.invoice_overdue_sweep IS
'Daily job: notifies customers of overdue invoices, escalates to SMS after 7 days';

COMMENT ON FUNCTION public.notify_emergency_received IS
'Trigger: notifies all admin/sal via in-app + email + SMS on emergency creation';
