/*
  # Notification Preferences System

  1. New Table
    - `notification_preferences` - Per-user notification settings
    - Channels: in_app, email, sms, push (opt-in/out)
    - Quiet hours: configurable start/end time
    - Muted types: array of notification types to silence

  2. Security
    - Enable RLS
    - Users can read/update only their own preferences
    - Auto-create default preferences for new profiles

  3. Features
    - Granular control per channel
    - Quiet hours (e.g., 22:00-07:00 no email/SMS)
    - Mute specific notification types
    - Future: digest frequency

  4. Integration
    - Used by create_notification_secure to filter channels
    - Edge Function checks preferences before sending
*/

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Canaux activés (opt-in par défaut seulement in-app)
  in_app_enabled boolean DEFAULT true NOT NULL,
  email_enabled boolean DEFAULT false NOT NULL,
  sms_enabled boolean DEFAULT false NOT NULL,
  push_enabled boolean DEFAULT false NOT NULL,

  -- Quiet hours (format HH:MM:SS)
  quiet_hours_enabled boolean DEFAULT false NOT NULL,
  quiet_hours_start time DEFAULT '22:00:00' NOT NULL,
  quiet_hours_end time DEFAULT '07:00:00' NOT NULL,

  -- Types mutés (array de notification_type)
  muted_notification_types text[] DEFAULT ARRAY[]::text[] NOT NULL,

  -- Métadonnées
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies: Users can read/update only their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at_trigger ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at_trigger
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_preferences_updated_at();

-- Auto-créer préférences par défaut pour nouveaux profils
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_notification_preferences_trigger ON public.profiles;
CREATE TRIGGER create_notification_preferences_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();

-- Fonction helper pour filtrer canaux selon préférences
CREATE OR REPLACE FUNCTION public.filter_channels_by_preferences(
  p_user_id uuid,
  p_channels text[],
  p_notification_type text
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_prefs public.notification_preferences;
  v_filtered text[] := ARRAY[]::text[];
  v_current_time time;
  v_in_quiet_hours boolean := false;
BEGIN
  -- Récupérer les préférences
  SELECT * INTO v_prefs
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  -- Si pas de préférences, utiliser defaults (in_app only)
  IF NOT FOUND THEN
    IF 'in_app' = ANY(p_channels) THEN
      RETURN ARRAY['in_app']::text[];
    ELSE
      RETURN ARRAY[]::text[];
    END IF;
  END IF;

  -- Vérifier si type muté
  IF p_notification_type = ANY(v_prefs.muted_notification_types) THEN
    RETURN ARRAY[]::text[];  -- Tout muter
  END IF;

  -- Vérifier quiet hours
  IF v_prefs.quiet_hours_enabled THEN
    v_current_time := CURRENT_TIME;

    -- Check si on est dans la plage (gère minuit)
    IF v_prefs.quiet_hours_start > v_prefs.quiet_hours_end THEN
      -- Ex: 22:00 - 07:00 (franchit minuit)
      v_in_quiet_hours := v_current_time >= v_prefs.quiet_hours_start
                          OR v_current_time < v_prefs.quiet_hours_end;
    ELSE
      -- Ex: 10:00 - 18:00 (même journée)
      v_in_quiet_hours := v_current_time >= v_prefs.quiet_hours_start
                          AND v_current_time < v_prefs.quiet_hours_end;
    END IF;

    -- En quiet hours : garder seulement in_app
    IF v_in_quiet_hours THEN
      IF 'in_app' = ANY(p_channels) THEN
        RETURN ARRAY['in_app']::text[];
      ELSE
        RETURN ARRAY[]::text[];
      END IF;
    END IF;
  END IF;

  -- Filtrer par préférences canal
  IF 'in_app' = ANY(p_channels) AND v_prefs.in_app_enabled THEN
    v_filtered := array_append(v_filtered, 'in_app');
  END IF;

  IF 'email' = ANY(p_channels) AND v_prefs.email_enabled THEN
    v_filtered := array_append(v_filtered, 'email');
  END IF;

  IF 'sms' = ANY(p_channels) AND v_prefs.sms_enabled THEN
    v_filtered := array_append(v_filtered, 'sms');
  END IF;

  IF 'push' = ANY(p_channels) AND v_prefs.push_enabled THEN
    v_filtered := array_append(v_filtered, 'push');
  END IF;

  RETURN v_filtered;
END;
$$;

GRANT EXECUTE ON FUNCTION public.filter_channels_by_preferences TO authenticated;

COMMENT ON TABLE public.notification_preferences IS
'Per-user notification settings: channels, quiet hours, muted types';

COMMENT ON FUNCTION public.filter_channels_by_preferences IS
'Filters notification channels based on user preferences and quiet hours';
