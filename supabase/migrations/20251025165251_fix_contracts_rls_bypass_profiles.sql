/*
  # Fix RLS recursion by bypassing RLS in helper functions
  
  1. Problem
    - SECURITY DEFINER functions still trigger RLS on tables they read
    - profiles table has recursive policies (profiles_update_by_admin reads profiles)
    - This causes infinite recursion when checking roles
  
  2. Solution
    - Recreate functions with row_security = off to completely bypass RLS
    - This is safe because functions only check auth.uid() and basic access
    - No user can manipulate these functions
  
  3. Security
    - Functions are SECURITY DEFINER (run as owner, not caller)
    - SET search_path = public (prevents search_path attacks)
    - STABLE (readonly, can be optimized)
    - Only check auth.uid() which is always secure
*/

-- ============================================================================
-- Recreate helper functions with row_security = off
-- ============================================================================

-- Check if user is admin or SAL (bypasses RLS completely)
CREATE OR REPLACE FUNCTION public.is_admin_or_sal()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  -- Bypass RLS to avoid recursion
  SET LOCAL row_security = off;
  
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Check if user can access a contract (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_access_contract(p_contract_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  -- Bypass RLS to avoid recursion
  SET LOCAL row_security = off;
  
  -- Admin or SAL can access all contracts
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
  ) INTO result;
  
  IF result THEN
    RETURN true;
  END IF;
  
  -- Client can access their own contracts
  SELECT EXISTS (
    SELECT 1 FROM maintenance_contracts mc
    JOIN user_clients uc ON uc.id = mc.client_id
    WHERE mc.id = p_contract_id
      AND uc.user_id = auth.uid()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Check if user can access an intervention (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_access_intervention(p_intervention_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  -- Bypass RLS to avoid recursion
  SET LOCAL row_security = off;
  
  -- Admin or SAL can access all
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
  ) INTO result;
  
  IF result THEN
    RETURN true;
  END IF;
  
  -- Client can access via contract
  SELECT EXISTS (
    SELECT 1 FROM contract_scheduled_interventions csi
    JOIN maintenance_contracts mc ON mc.id = csi.contract_id
    JOIN user_clients uc ON uc.id = mc.client_id
    WHERE csi.id = p_intervention_id
      AND uc.user_id = auth.uid()
  ) INTO result;
  
  IF result THEN
    RETURN true;
  END IF;
  
  -- Tech can access if assigned to mission
  SELECT EXISTS (
    SELECT 1 FROM contract_scheduled_interventions csi
    JOIN missions m ON m.id = csi.mission_id
    WHERE csi.id = p_intervention_id
      AND m.assigned_user_id = auth.uid()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin_or_sal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_contract(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_intervention(uuid) TO authenticated;
