/*
  # Fix RLS policies for client_requests

  1. Changes
    - Drop existing "Clients can view their own requests" policy
    - Create new policy that directly checks client_account_id against auth.uid()
    - This allows clients to view their own requests using their user_id
*/

DROP POLICY IF EXISTS "Clients can view their own requests" ON client_requests;

CREATE POLICY "Clients can view their own requests"
  ON client_requests
  FOR SELECT
  TO authenticated
  USING (client_account_id = auth.uid());
