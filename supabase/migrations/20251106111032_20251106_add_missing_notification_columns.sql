/*
  # Add Missing Notification Preferences Columns

  1. Changes
    - Add `in_app` boolean column (default true) - for in-app notifications
    - Add `quiet_hours` jsonb column - for quiet time configuration
    - Add `muted_types` text[] column - for muted notification types
    - Keep existing columns: email, sms, push, channels

  2. Notes
    - Safe to run multiple times (uses IF NOT EXISTS)
    - Preserves existing data
*/

-- Add in_app column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' 
    AND column_name = 'in_app'
  ) THEN
    ALTER TABLE public.notification_preferences 
    ADD COLUMN in_app boolean DEFAULT true;
  END IF;
END $$;

-- Add quiet_hours column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' 
    AND column_name = 'quiet_hours'
  ) THEN
    ALTER TABLE public.notification_preferences 
    ADD COLUMN quiet_hours jsonb DEFAULT '{"start":"22:00","end":"07:00"}'::jsonb;
  END IF;
END $$;

-- Add muted_types column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' 
    AND column_name = 'muted_types'
  ) THEN
    ALTER TABLE public.notification_preferences 
    ADD COLUMN muted_types text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

-- Update existing rows to have default values for new columns
UPDATE public.notification_preferences
SET 
  in_app = COALESCE(in_app, true),
  quiet_hours = COALESCE(quiet_hours, '{"start":"22:00","end":"07:00"}'::jsonb),
  muted_types = COALESCE(muted_types, ARRAY[]::text[])
WHERE in_app IS NULL OR quiet_hours IS NULL OR muted_types IS NULL;
