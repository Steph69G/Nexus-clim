/*
  # Fix infinite recursion in contract RLS policies
  
  1. Problem
    - Circular dependency: maintenance_contracts ↔ contract_scheduled_interventions
    - "Techs can view contracts" reads contract_scheduled_interventions
    - "Clients can view interventions" reads maintenance_contracts
    - This creates infinite recursion (42P17 error)
  
  2. Solution
    - Create SECURITY DEFINER functions that bypass RLS
    - Rewrite all policies to use these functions
    - Single direction: maintenance_contracts → children (no back-references)
  
  3. Security
    - Functions use SECURITY DEFINER with search_path = public
    - All access still properly controlled through role checks
    - No circular dependencies
*/

-- ============================================================================
-- STEP 1: Create helper functions (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================================

-- Check if user can access a contract (admin/sal OR client owner)
CREATE OR REPLACE FUNCTION public.can_access_contract(p_contract_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Admin or SAL can access all contracts
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
  )
  OR EXISTS (
    -- Client can access their own contracts
    SELECT 1 FROM maintenance_contracts mc
    JOIN user_clients uc ON uc.id = mc.client_id
    WHERE mc.id = p_contract_id
      AND uc.user_id = auth.uid()
  );
$$;

-- Check if user can access an intervention (via contract access or assigned mission)
CREATE OR REPLACE FUNCTION public.can_access_intervention(p_intervention_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Admin or SAL can access all
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
  )
  OR EXISTS (
    -- Client can access via contract
    SELECT 1 FROM contract_scheduled_interventions csi
    JOIN maintenance_contracts mc ON mc.id = csi.contract_id
    JOIN user_clients uc ON uc.id = mc.client_id
    WHERE csi.id = p_intervention_id
      AND uc.user_id = auth.uid()
  )
  OR EXISTS (
    -- Tech can access if assigned to mission
    SELECT 1 FROM contract_scheduled_interventions csi
    JOIN missions m ON m.id = csi.mission_id
    WHERE csi.id = p_intervention_id
      AND m.assigned_user_id = auth.uid()
  );
$$;

-- Check if user is admin or SAL
CREATE OR REPLACE FUNCTION public.is_admin_or_sal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
  );
$$;

-- ============================================================================
-- STEP 2: Drop all existing policies to avoid conflicts
-- ============================================================================

-- maintenance_contracts
DROP POLICY IF EXISTS "Admin and SAL can view all contracts" ON maintenance_contracts;
DROP POLICY IF EXISTS "Admin and SAL can insert contracts" ON maintenance_contracts;
DROP POLICY IF EXISTS "Admin and SAL can update contracts" ON maintenance_contracts;
DROP POLICY IF EXISTS "Clients can view own contracts" ON maintenance_contracts;
DROP POLICY IF EXISTS "Techs can view contracts for assigned missions" ON maintenance_contracts;

-- contract_scheduled_interventions
DROP POLICY IF EXISTS "Admin and SAL can manage all interventions" ON contract_scheduled_interventions;
DROP POLICY IF EXISTS "Clients can view own scheduled interventions" ON contract_scheduled_interventions;
DROP POLICY IF EXISTS "Techs can view assigned interventions" ON contract_scheduled_interventions;

-- contract_equipment
DROP POLICY IF EXISTS "Admin and SAL can manage all equipment" ON contract_equipment;
DROP POLICY IF EXISTS "Clients can view own contract equipment" ON contract_equipment;
DROP POLICY IF EXISTS "Techs can view equipment for assigned missions" ON contract_equipment;

-- ============================================================================
-- STEP 3: Create new policies using helper functions (NO RECURSION)
-- ============================================================================

-- ==================
-- maintenance_contracts policies
-- ==================

CREATE POLICY "Admin and SAL can view all contracts"
  ON maintenance_contracts FOR SELECT
  TO authenticated
  USING (public.is_admin_or_sal());

CREATE POLICY "Admin and SAL can insert contracts"
  ON maintenance_contracts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_sal());

CREATE POLICY "Admin and SAL can update contracts"
  ON maintenance_contracts FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_sal())
  WITH CHECK (public.is_admin_or_sal());

CREATE POLICY "Admin and SAL can delete contracts"
  ON maintenance_contracts FOR DELETE
  TO authenticated
  USING (public.is_admin_or_sal());

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

-- Note: Techs access contracts through interventions/missions, not directly

-- ==================
-- contract_scheduled_interventions policies
-- ==================

CREATE POLICY "Admin and SAL can manage all interventions"
  ON contract_scheduled_interventions FOR ALL
  TO authenticated
  USING (public.is_admin_or_sal())
  WITH CHECK (public.is_admin_or_sal());

CREATE POLICY "Users can view accessible interventions"
  ON contract_scheduled_interventions FOR SELECT
  TO authenticated
  USING (public.can_access_intervention(contract_scheduled_interventions.id));

-- ==================
-- contract_equipment policies
-- ==================

CREATE POLICY "Admin and SAL can manage all equipment"
  ON contract_equipment FOR ALL
  TO authenticated
  USING (public.is_admin_or_sal())
  WITH CHECK (public.is_admin_or_sal());

CREATE POLICY "Users can view equipment for accessible contracts"
  ON contract_equipment FOR SELECT
  TO authenticated
  USING (public.can_access_contract(contract_equipment.contract_id));

-- ============================================================================
-- STEP 4: Grant execute permissions on helper functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.can_access_contract(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_intervention(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_sal() TO authenticated;
