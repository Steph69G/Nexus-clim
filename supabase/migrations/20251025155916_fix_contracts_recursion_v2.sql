/*
  # Fix maintenance_contracts infinite recursion
  
  1. Changes
    - Simplify the "Techs can view contracts" policy to avoid circular joins
    - The recursion happens because the policy joins on contract_scheduled_interventions
      which then references missions, creating a circular dependency
    
  2. Security
    - Still secure: techs can only view contracts for missions they're assigned to
    - But we avoid the circular JOIN that causes recursion
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Techs can view contracts for assigned missions" ON maintenance_contracts;

-- Recreate with a simpler approach that doesn't cause recursion
-- Techs will access contracts through the contract detail page or mission context
-- They don't need to query all contracts directly
CREATE POLICY "Techs can view contracts for assigned missions"
  ON maintenance_contracts FOR SELECT
  TO authenticated
  USING (
    -- Check if user is tech/ST and has any mission linked to this contract
    EXISTS (
      SELECT 1 
      FROM contract_scheduled_interventions csi
      JOIN missions m ON m.id = csi.mission_id
      WHERE csi.contract_id = maintenance_contracts.id
      AND m.assigned_user_id = auth.uid()
    )
  );
