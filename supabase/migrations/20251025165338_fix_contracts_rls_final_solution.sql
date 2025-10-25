/*
  # Final fix for RLS infinite recursion
  
  1. Problem
    - Cannot use SET LOCAL in STABLE functions
    - Need to bypass RLS without changing function volatility
  
  2. Solution
    - Use direct auth.uid() comparisons instead of reading from profiles
    - For complex checks, read directly from auth.users metadata
    - Avoid any subqueries that could trigger recursive RLS
  
  3. Approach
    - Simplify policies to not need helper functions for admin check
    - Use simple USING clauses that don't cause recursion
    - Only use functions for complex multi-table checks
*/

-- ============================================================================
-- Drop existing policies completely
-- ============================================================================

DROP POLICY IF EXISTS "Admin and SAL can view all contracts" ON maintenance_contracts;
DROP POLICY IF EXISTS "Admin and SAL can insert contracts" ON maintenance_contracts;
DROP POLICY IF EXISTS "Admin and SAL can update contracts" ON maintenance_contracts;
DROP POLICY IF EXISTS "Admin and SAL can delete contracts" ON maintenance_contracts;
DROP POLICY IF EXISTS "Clients can view own contracts" ON maintenance_contracts;

DROP POLICY IF EXISTS "Admin and SAL can manage all interventions" ON contract_scheduled_interventions;
DROP POLICY IF EXISTS "Users can view accessible interventions" ON contract_scheduled_interventions;

DROP POLICY IF EXISTS "Admin and SAL can manage all equipment" ON contract_equipment;
DROP POLICY IF EXISTS "Users can view equipment for accessible contracts" ON contract_equipment;

-- ============================================================================
-- Simplified helper function - check role from profiles WITHOUT recursion
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_role(required_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- This works because we'll make profiles policies non-recursive
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND role = ANY(required_roles)
  );
$$;

-- ============================================================================
-- Fix profiles policies to be non-recursive
-- ============================================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "profiles_update_by_admin" ON profiles;

-- Replace with simpler version that doesn't read profiles again
CREATE POLICY "profiles_update_by_admin"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    -- Allow if updating self OR if user's role is admin (from JWT)
    user_id = auth.uid()
    OR (auth.jwt()->>'role' = 'admin')
  )
  WITH CHECK (true);

-- ============================================================================
-- Create simplified policies for maintenance_contracts
-- ============================================================================

CREATE POLICY "Admins can do all on contracts"
  ON maintenance_contracts FOR ALL
  TO authenticated
  USING (
    user_has_role(ARRAY['admin', 'sal'])
  )
  WITH CHECK (
    user_has_role(ARRAY['admin', 'sal'])
  );

CREATE POLICY "Clients can view own contracts"
  ON maintenance_contracts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_clients.id = maintenance_contracts.client_id
        AND user_clients.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Create simplified policies for contract_scheduled_interventions
-- ============================================================================

CREATE POLICY "Admins can manage interventions"
  ON contract_scheduled_interventions FOR ALL
  TO authenticated
  USING (
    user_has_role(ARRAY['admin', 'sal'])
  )
  WITH CHECK (
    user_has_role(ARRAY['admin', 'sal'])
  );

CREATE POLICY "Clients can view own interventions"
  ON contract_scheduled_interventions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_contracts mc
      JOIN user_clients uc ON uc.id = mc.client_id
      WHERE mc.id = contract_scheduled_interventions.contract_id
        AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Techs can view assigned interventions"
  ON contract_scheduled_interventions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = contract_scheduled_interventions.mission_id
        AND m.assigned_user_id = auth.uid()
    )
  );

-- ============================================================================
-- Create simplified policies for contract_equipment
-- ============================================================================

CREATE POLICY "Admins can manage equipment"
  ON contract_equipment FOR ALL
  TO authenticated
  USING (
    user_has_role(ARRAY['admin', 'sal'])
  )
  WITH CHECK (
    user_has_role(ARRAY['admin', 'sal'])
  );

CREATE POLICY "Clients can view own equipment"
  ON contract_equipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_contracts mc
      JOIN user_clients uc ON uc.id = mc.client_id
      WHERE mc.id = contract_equipment.contract_id
        AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Techs can view equipment for assigned missions"
  ON contract_equipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      JOIN contract_scheduled_interventions csi ON csi.mission_id = m.id
      WHERE csi.contract_id = contract_equipment.contract_id
        AND m.assigned_user_id = auth.uid()
    )
  );

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.user_has_role(text[]) TO authenticated;

-- Drop old functions we don't need anymore
DROP FUNCTION IF EXISTS public.is_admin_or_sal();
DROP FUNCTION IF EXISTS public.can_access_contract(uuid);
DROP FUNCTION IF EXISTS public.can_access_intervention(uuid);
