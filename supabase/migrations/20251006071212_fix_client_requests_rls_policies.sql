/*
  # Fix client_requests RLS policies

  1. Security Updates
    - Update INSERT policy to check via client_accounts.auth_user_id
    - Update SELECT policy to check via client_accounts.auth_user_id
    - The FK client_requests.client_account_id points to client_accounts.id
    - So we need to JOIN to verify ownership
*/

-- Drop existing policies
DROP POLICY IF EXISTS "client_requests_insert_own" ON public.client_requests;
DROP POLICY IF EXISTS "client_requests_select_own" ON public.client_requests;

-- Create corrected INSERT policy
CREATE POLICY "client_requests_insert_own"
  ON public.client_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_accounts
      WHERE client_accounts.id = client_requests.client_account_id
        AND client_accounts.auth_user_id = auth.uid()
    )
  );

-- Create corrected SELECT policy
CREATE POLICY "client_requests_select_own"
  ON public.client_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_accounts
      WHERE client_accounts.id = client_requests.client_account_id
        AND client_accounts.auth_user_id = auth.uid()
    )
  );
