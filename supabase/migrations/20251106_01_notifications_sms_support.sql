/*
  # SMS Support Infrastructure

  1. New Indexes
    - `idx_notifications_sms_pending` - Fast SMS queue selection
    - Filters on sms_status + next_retry_at

  2. New Columns (if not exist)
    - `retry_count` - Current retry attempt
    - `max_retries` - Max retry attempts (default 3)
    - `next_retry_at` - Next scheduled retry time

  3. Helper Function
    - `schedule_next_retry()` - Exponential backoff calculation
    - Formula: 2^retry_count minutes

  4. Benefits
    - Efficient SMS queue processing
    - Automatic retry with backoff
    - Prevents SMS spam via rate limiting
*/

-- Index pour sélection rapide des SMS à envoyer
CREATE INDEX IF NOT EXISTS idx_notifications_sms_pending
ON public.notifications (sms_status, next_retry_at)
WHERE (sms_status IS NULL OR sms_status = 'pending');

-- Index pour retry logic
CREATE INDEX IF NOT EXISTS idx_notifications_retry
ON public.notifications (next_retry_at, retry_count)
WHERE sms_status = 'pending' OR email_status = 'pending';

-- Ajouter colonnes retry si pas existantes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE public.notifications
    ADD COLUMN retry_count integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'max_retries'
  ) THEN
    ALTER TABLE public.notifications
    ADD COLUMN max_retries integer DEFAULT 3 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'next_retry_at'
  ) THEN
    ALTER TABLE public.notifications
    ADD COLUMN next_retry_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Helper pour planifier un retry exponentiel
CREATE OR REPLACE FUNCTION public.schedule_next_retry(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_retry_count integer;
  v_delay_minutes integer;
BEGIN
  -- Récupérer le retry_count actuel
  SELECT retry_count INTO v_retry_count
  FROM public.notifications
  WHERE id = p_id;

  -- Calcul backoff exponentiel : 2^retry_count minutes
  -- retry 1 = 2 min, retry 2 = 4 min, retry 3 = 8 min
  v_delay_minutes := power(2, GREATEST(v_retry_count + 1, 1))::integer;

  -- Limiter à 60 min max
  v_delay_minutes := LEAST(v_delay_minutes, 60);

  -- Mettre à jour
  UPDATE public.notifications
  SET retry_count = retry_count + 1,
      next_retry_at = now() + (v_delay_minutes || ' minutes')::interval
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_next_retry TO authenticated;

-- Fonction pour réinitialiser les notifications bloquées (admin tool)
CREATE OR REPLACE FUNCTION public.reset_failed_notifications(
  p_notification_type text DEFAULT NULL,
  p_max_age_hours integer DEFAULT 24
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Réinitialise les notifications failed/pending trop anciennes
  UPDATE public.notifications
  SET sms_status = NULL,
      email_status = NULL,
      push_status = NULL,
      retry_count = 0,
      next_retry_at = now(),
      sms_error = NULL,
      email_error = NULL
  WHERE (sms_status = 'failed' OR email_status = 'failed' OR push_status = 'failed')
    AND created_at > now() - (p_max_age_hours || ' hours')::interval
    AND (p_notification_type IS NULL OR notification_type = p_notification_type);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_failed_notifications TO authenticated;

-- Ajouter colonne phone dans profiles si manquante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN phone text;

    -- Index pour recherche rapide
    CREATE INDEX idx_profiles_phone ON public.profiles(phone)
    WHERE phone IS NOT NULL;
  END IF;
END $$;

COMMENT ON FUNCTION public.schedule_next_retry IS
'Calculates exponential backoff for failed notification retries';

COMMENT ON FUNCTION public.reset_failed_notifications IS
'Admin tool: resets failed notifications for retry (use with caution)';

COMMENT ON COLUMN public.notifications.retry_count IS
'Current retry attempt number (incremented on each failure)';

COMMENT ON COLUMN public.notifications.max_retries IS
'Maximum retry attempts before marking as permanently failed';

COMMENT ON COLUMN public.notifications.next_retry_at IS
'Next scheduled retry time (with exponential backoff)';
