/*
  # Quiet Hours Utility Functions

  1. Functions
    - `is_now_in_quiet_hours(user_id)` - Check if current time is in user's quiet period
    - `next_allowed_send_time(user_id)` - Calculate next allowed send time after quiet hours

  2. Timezone
    - Uses Europe/Paris timezone
    - Handles midnight crossing (e.g., 22:00-07:00)

  3. Benefits
    - Automatic SMS/Email/Push deferral during quiet hours
    - Respects user preferences (notification_preferences.quiet_hours)
    - Urgent notifications always sent immediately
    - Normal/low priority notifications deferred to end of quiet period

  4. Usage
    - Called by email-queue-worker, sms-queue-worker, push-queue-worker
    - If in quiet hours AND priority != 'urgent':
      - Set status to 'pending'
      - Set next_retry_at to next_allowed_send_time()
      - Add error message 'quiet_hours_delay'
*/

CREATE OR REPLACE FUNCTION public.is_now_in_quiet_hours(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  prefs record;
  now_t time := (now() AT TIME ZONE 'Europe/Paris')::time;
BEGIN
  SELECT quiet_hours->>'start' AS start, quiet_hours->>'end' AS end
  INTO prefs
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF prefs.start IS NULL OR prefs.end IS NULL THEN
    RETURN FALSE;
  END IF;

  IF prefs.start < prefs.end THEN
    RETURN now_t BETWEEN prefs.start::time AND prefs.end::time;
  ELSE
    RETURN now_t >= prefs.start::time OR now_t <= prefs.end::time;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_allowed_send_time(p_user_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  prefs record;
  now_t time := (now() AT TIME ZONE 'Europe/Paris')::time;
  base date := (now() AT TIME ZONE 'Europe/Paris')::date;
  end_t time;
BEGIN
  SELECT quiet_hours->>'end' AS end INTO prefs
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  IF NOT FOUND OR prefs.end IS NULL THEN
    RETURN now();
  END IF;

  end_t := prefs.end::time;

  IF now_t < end_t THEN
    RETURN (base + end_t) AT TIME ZONE 'Europe/Paris';
  ELSE
    RETURN (base + 1 + end_t) AT TIME ZONE 'Europe/Paris';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_now_in_quiet_hours TO service_role;
GRANT EXECUTE ON FUNCTION public.next_allowed_send_time TO service_role;

COMMENT ON FUNCTION public.is_now_in_quiet_hours IS
'Check if current time (Europe/Paris) is within user quiet hours. Handles midnight crossing (e.g., 22:00-07:00)';

COMMENT ON FUNCTION public.next_allowed_send_time IS
'Calculate next allowed send time after user quiet hours end. Returns now() if no quiet hours set.';
