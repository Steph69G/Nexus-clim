/*
  # User Preferences System

  1. New Table
    - `user_preferences` - Generic key-value preferences per user
    - Primary key (user_id, pref_key)
    - JSONB value storage

  2. RLS Policies
    - Users can read their own preferences
    - Users can upsert/update their own preferences

  3. Helper Functions
    - `set_user_pref(key, value)` - Upsert preference
    - `get_user_pref(key)` - Get preference value

  4. Indexes
    - Composite index on (user_id, pref_key) for fast lookups

  5. Use Cases
    - Store operations filters preferences
    - Store UI preferences (theme, layout, etc.)
    - Store dashboard configurations
*/

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pref_key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pref_key)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own prefs"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own prefs"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prefs"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_key
ON public.user_preferences (user_id, pref_key);

CREATE OR REPLACE FUNCTION public.set_user_pref(p_key text, p_value jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, pref_key, value)
  VALUES (auth.uid(), p_key, COALESCE(p_value, '{}'::jsonb))
  ON CONFLICT (user_id, pref_key)
  DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_pref(p_key text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT value FROM public.user_preferences
  WHERE user_id = auth.uid() AND pref_key = p_key
  LIMIT 1;
$$;

COMMENT ON TABLE public.user_preferences IS
'Generic key-value preferences storage per user. Supports any JSON-serializable data.';

COMMENT ON FUNCTION public.set_user_pref IS
'Upsert a user preference. Automatically uses auth.uid() for user_id.';

COMMENT ON FUNCTION public.get_user_pref IS
'Get a user preference value. Returns NULL if not found.';
