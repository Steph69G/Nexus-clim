/*
  # Notification Preferences RPC Functions

  1. Functions
    - `get_my_notification_preferences()` - Read preferences with safe defaults
    - `set_my_notification_preferences()` - Upsert user preferences

  2. Benefits
    - Safe defaults if no preferences exist
    - Atomic upsert operations
    - Simplified frontend integration
    - Type-safe returns
*/

CREATE OR REPLACE FUNCTION public.get_my_notification_preferences()
RETURNS TABLE(
  in_app boolean,
  email boolean,
  sms boolean,
  push boolean,
  quiet_hours jsonb,
  muted_types text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p.in_app, true),
    COALESCE(p.email, false),
    COALESCE(p.sms, false),
    COALESCE(p.push, false),
    COALESCE(p.quiet_hours, '{"start":"22:00","end":"07:00"}'::jsonb),
    COALESCE(p.muted_types, ARRAY[]::text[])
  FROM public.notification_preferences p
  WHERE p.user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN QUERY SELECT true, false, false, false,
      '{"start":"22:00","end":"07:00"}'::jsonb,
      ARRAY[]::text[];
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_my_notification_preferences(
  p_in_app boolean,
  p_email boolean,
  p_sms boolean,
  p_push boolean,
  p_quiet_hours jsonb,
  p_muted_types text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notification_preferences AS np(
    user_id, in_app, email, sms, push, quiet_hours, muted_types, updated_at
  )
  VALUES (
    auth.uid(), p_in_app, p_email, p_sms, p_push, p_quiet_hours, COALESCE(p_muted_types, ARRAY[]::text[]), now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET in_app = EXCLUDED.in_app,
      email = EXCLUDED.email,
      sms = EXCLUDED.sms,
      push = EXCLUDED.push,
      quiet_hours = EXCLUDED.quiet_hours,
      muted_types = EXCLUDED.muted_types,
      updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_notification_preferences TO authenticated;

COMMENT ON FUNCTION public.get_my_notification_preferences IS
'Returns current user notification preferences with safe defaults';

COMMENT ON FUNCTION public.set_my_notification_preferences IS
'Upsert current user notification preferences (atomic operation)';
