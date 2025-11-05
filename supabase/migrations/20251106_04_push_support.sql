/*
  # Push Notifications Support (OneSignal/FCM)

  1. New Columns
    - `push_status` - Push delivery status (pending/sent/failed)
    - `push_sent_at` - Timestamp when push was sent
    - `push_error` - Error message if push failed

  2. New Table
    - `user_devices` - Device tokens per user (OneSignal player_ids or FCM tokens)
    - Supports multiple devices per user (phone, tablet, desktop)
    - Tracks last_seen_at for device health monitoring

  3. RLS Policies
    - Users can only view/manage their own devices
    - Admins can view all devices

  4. RPC Function
    - `upsert_user_device()` - Register/update device token
    - Handles conflicts automatically (unique provider + token)

  5. Benefits
    - Real-time push notifications web + mobile
    - Multi-device support per user
    - Provider flexibility (OneSignal or FCM)
    - Device health monitoring
*/

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS push_status text CHECK (push_status IN ('pending', 'sent', 'failed')),
  ADD COLUMN IF NOT EXISTS push_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS push_error text;

CREATE INDEX IF NOT EXISTS idx_notifications_push_pending
ON public.notifications (push_status, created_at)
WHERE push_status IS NULL OR push_status = 'pending';

CREATE TABLE IF NOT EXISTS public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'onesignal' CHECK (provider IN ('onesignal', 'fcm')),
  token text NOT NULL,
  platform text CHECK (platform IN ('web', 'ios', 'android', 'desktop')),
  user_agent text,
  last_seen_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (provider, token)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user
ON public.user_devices(user_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_devices_token
ON public.user_devices(provider, token)
WHERE last_seen_at > now() - interval '30 days';

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own devices"
ON public.user_devices
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users insert own devices"
ON public.user_devices
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own devices"
ON public.user_devices
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own devices"
ON public.user_devices
FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Admins view all devices"
ON public.user_devices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE OR REPLACE FUNCTION public.upsert_user_device(
  p_provider text,
  p_token text,
  p_platform text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_devices(user_id, provider, token, platform, user_agent, last_seen_at)
  VALUES (auth.uid(), p_provider, p_token, p_platform, p_user_agent, now())
  ON CONFLICT (provider, token) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    platform = COALESCE(EXCLUDED.platform, user_devices.platform),
    user_agent = COALESCE(EXCLUDED.user_agent, user_devices.user_agent),
    last_seen_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_device TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_user_device(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.user_devices
  WHERE user_id = auth.uid()
  AND token = p_token;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_user_device TO authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_stale_devices()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.user_devices
  WHERE last_seen_at < now() - interval '90 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_stale_devices TO authenticated;

COMMENT ON TABLE public.user_devices IS
'Device tokens for push notifications (OneSignal player_ids or FCM tokens)';

COMMENT ON COLUMN public.user_devices.provider IS
'Push provider: onesignal or fcm';

COMMENT ON COLUMN public.user_devices.token IS
'Provider-specific device token (OneSignal player_id or FCM registration token)';

COMMENT ON COLUMN public.user_devices.platform IS
'Device platform: web, ios, android, or desktop';

COMMENT ON COLUMN public.user_devices.last_seen_at IS
'Last time this device was active (updated on each upsert)';

COMMENT ON FUNCTION public.upsert_user_device IS
'Register or update a device token for the current user';

COMMENT ON FUNCTION public.remove_user_device IS
'Remove a device token for the current user';

COMMENT ON FUNCTION public.cleanup_stale_devices IS
'Remove devices not seen in 90+ days (scheduled job)';
