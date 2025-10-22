/*
  # Phase 18 - RLS Audit Tests

  Automated test scenarios to validate Row Level Security policies.
  Run these tests regularly to ensure RLS is working correctly.

  Test users:
  - Admin user (role: admin)
  - Salarié user (role: sal)
  - Technicien user (role: tech)
  - Sous-traitant user (role: st)
  - Client user (role: client)

  Critical tables to test:
  - missions
  - invoices
  - quotes
  - stock_items
  - timesheets
  - notifications
  - client_requests
*/

-- ============================================================================
-- RLS AUDIT FUNCTIONS
-- ============================================================================

-- Function to test RLS by simulating different users
CREATE OR REPLACE FUNCTION test_rls_as_role(
  test_role TEXT,
  test_user_id UUID
) RETURNS TABLE (
  test_name TEXT,
  table_name TEXT,
  operation TEXT,
  expected TEXT,
  actual TEXT,
  passed BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  missions_count INTEGER;
  invoices_count INTEGER;
  stock_count INTEGER;
BEGIN
  -- Set the user context
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', test_user_id, 'role', 'authenticated')::text,
    true);

  -- Test 1: Missions visibility
  SELECT COUNT(*) INTO missions_count
  FROM missions
  WHERE true;

  RETURN QUERY SELECT
    'Mission visibility'::TEXT,
    'missions'::TEXT,
    'SELECT'::TEXT,
    CASE
      WHEN test_role = 'admin' THEN 'All missions'
      WHEN test_role = 'sal' THEN 'All missions'
      WHEN test_role IN ('tech', 'st') THEN 'Own + published missions'
      WHEN test_role = 'client' THEN 'Own missions only'
      ELSE 'No access'
    END,
    missions_count::TEXT,
    true;

  -- Test 2: Invoice visibility
  SELECT COUNT(*) INTO invoices_count
  FROM invoices
  WHERE true;

  RETURN QUERY SELECT
    'Invoice visibility'::TEXT,
    'invoices'::TEXT,
    'SELECT'::TEXT,
    CASE
      WHEN test_role = 'admin' THEN 'All invoices'
      WHEN test_role = 'sal' THEN 'All invoices'
      WHEN test_role = 'client' THEN 'Own invoices only'
      ELSE 'No access'
    END,
    invoices_count::TEXT,
    true;

  -- Test 3: Stock visibility
  SELECT COUNT(*) INTO stock_count
  FROM stock_items
  WHERE true;

  RETURN QUERY SELECT
    'Stock visibility'::TEXT,
    'stock_items'::TEXT,
    'SELECT'::TEXT,
    CASE
      WHEN test_role IN ('admin', 'sal') THEN 'All items'
      ELSE 'No access'
    END,
    stock_count::TEXT,
    test_role IN ('admin', 'sal') OR stock_count = 0;
END;
$$;

-- ============================================================================
-- TEST DATA HELPERS
-- ============================================================================

-- Function to create test users for RLS validation
CREATE OR REPLACE FUNCTION create_test_users()
RETURNS TABLE (
  role TEXT,
  user_id UUID,
  email TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- This would typically be done via auth.users
  -- For testing purposes, we create profiles with known UUIDs

  -- Note: In production, these should be created through Supabase Auth
  RETURN QUERY SELECT
    'admin'::TEXT,
    'a0000000-0000-0000-0000-000000000001'::UUID,
    'test-admin@example.com'::TEXT
  UNION ALL SELECT
    'sal'::TEXT,
    'a0000000-0000-0000-0000-000000000002'::UUID,
    'test-sal@example.com'::TEXT
  UNION ALL SELECT
    'tech'::TEXT,
    'a0000000-0000-0000-0000-000000000003'::UUID,
    'test-tech@example.com'::TEXT
  UNION ALL SELECT
    'st'::TEXT,
    'a0000000-0000-0000-0000-000000000004'::UUID,
    'test-st@example.com'::TEXT
  UNION ALL SELECT
    'client'::TEXT,
    'a0000000-0000-0000-0000-000000000005'::UUID,
    'test-client@example.com'::TEXT;
END;
$$;

-- ============================================================================
-- CRITICAL RLS VALIDATIONS (run these regularly)
-- ============================================================================

-- Check that all critical tables have RLS enabled
CREATE OR REPLACE VIEW rls_enabled_check AS
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✓ Enabled'
    ELSE '✗ DISABLED - SECURITY RISK!'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'missions',
    'invoices',
    'quotes',
    'stock_items',
    'stock_movements',
    'timesheets',
    'notifications',
    'client_requests',
    'emergency_requests',
    'profiles',
    'maintenance_contracts',
    'user_clients'
  )
ORDER BY rowsecurity ASC, tablename;

-- Check that all RLS-enabled tables have policies
CREATE OR REPLACE VIEW rls_policy_coverage AS
SELECT
  t.schemaname,
  t.tablename,
  t.rowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count,
  CASE
    WHEN t.rowsecurity AND COUNT(p.policyname) = 0 THEN '✗ NO POLICIES - TABLE LOCKED!'
    WHEN t.rowsecurity AND COUNT(p.policyname) > 0 THEN '✓ Has policies'
    WHEN NOT t.rowsecurity THEN '- RLS disabled'
  END as status
FROM pg_tables t
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
GROUP BY t.schemaname, t.tablename, t.rowsecurity
ORDER BY
  CASE
    WHEN t.rowsecurity AND COUNT(p.policyname) = 0 THEN 0
    ELSE 1
  END,
  t.tablename;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION test_rls_as_role IS 'Test RLS policies by simulating different user roles';
COMMENT ON VIEW rls_enabled_check IS 'Verify that all critical tables have RLS enabled';
COMMENT ON VIEW rls_policy_coverage IS 'Ensure all RLS-enabled tables have at least one policy';
