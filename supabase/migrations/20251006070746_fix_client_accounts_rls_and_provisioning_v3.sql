/*
  # Fix client_accounts RLS and auto-provisioning

  1. Tables
    - Ensure `client_accounts` has proper FK to auth.users
    - Use `auth_user_id` column for linking to auth.users
  
  2. Security (RLS)
    - Enable RLS on `client_accounts`
    - Policies:
      - Clients can SELECT their own account
      - Clients can INSERT their own account (self-provisioning)
      - Clients can UPDATE their own account
  
  3. Data Migration
    - Backfill missing client_accounts for existing CLIENT users
  
  4. Automation
    - Trigger to auto-create client_account when a CLIENT profile is created
*/

-- 1) Ensure proper FK constraint on auth_user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'client_accounts_auth_user_id_fkey'
    AND table_name = 'client_accounts'
  ) THEN
    ALTER TABLE public.client_accounts
      ADD CONSTRAINT client_accounts_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 2) Add unique constraint on auth_user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'client_accounts_auth_user_id_key'
  ) THEN
    ALTER TABLE public.client_accounts
      ADD CONSTRAINT client_accounts_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END$$;

-- 3) Enable RLS on client_accounts
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "client_accounts_select_own" ON public.client_accounts;
DROP POLICY IF EXISTS "client_accounts_insert_self" ON public.client_accounts;
DROP POLICY IF EXISTS "client_accounts_update_self" ON public.client_accounts;

-- Create RLS policies for client_accounts
CREATE POLICY "client_accounts_select_own"
  ON public.client_accounts
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "client_accounts_insert_self"
  ON public.client_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "client_accounts_update_self"
  ON public.client_accounts
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- 4) Backfill missing client_accounts for existing CLIENT users
INSERT INTO public.client_accounts (auth_user_id, email, name, phone, address, city, zip)
SELECT 
  p.user_id,
  p.email,
  p.full_name,
  COALESCE(p.phone, ''),
  COALESCE(p.address, ''),
  COALESCE(p.city, ''),
  COALESCE(p.zip, '')
FROM public.profiles p
LEFT JOIN public.client_accounts ca ON ca.auth_user_id = p.user_id
WHERE ca.id IS NULL
  AND p.role = 'client'
ON CONFLICT (auth_user_id) DO NOTHING;

-- 5) Create trigger function for auto-provisioning client_accounts
CREATE OR REPLACE FUNCTION public.create_client_account_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.role = 'client') THEN
    INSERT INTO public.client_accounts (auth_user_id, email, name, phone, address, city, zip)
    VALUES (
      NEW.user_id,
      NEW.email,
      NEW.full_name,
      COALESCE(NEW.phone, ''),
      COALESCE(NEW.address, ''),
      COALESCE(NEW.city, ''),
      COALESCE(NEW.zip, '')
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_profiles_after_insert_client_account ON public.profiles;

-- Create trigger
CREATE TRIGGER trg_profiles_after_insert_client_account
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_client_account_from_profile();
