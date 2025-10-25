/*
  # Fix maintenance_contracts INSERT policy
  
  1. Changes
    - Drop the broken INSERT policy
    - Recreate with proper WITH CHECK clause
    
  2. Security
    - Admin and SAL can insert contracts
    - WITH CHECK ensures they have the right role
*/

-- Drop the broken policy
DROP POLICY IF EXISTS "Admin and SAL can insert contracts" ON maintenance_contracts;

-- Recreate with proper WITH CHECK
CREATE POLICY "Admin and SAL can insert contracts"
  ON maintenance_contracts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );
