-- =====================================================
-- SEED MINIMAL POUR TESTS WORKFLOW V1
-- =====================================================
-- IMPORTANT: Exécuter avec service_role ou admin

-- 1) Créer users test (si pas déjà existants)
DO $$
DECLARE
  v_admin_id uuid;
  v_sal_id uuid;
  v_st_id uuid;
  v_client_id uuid;
BEGIN
  -- Admin
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@test.local',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@test.local',
    'Admin Test',
    'admin'
  )
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

  -- SAL
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000002',
    'sal@test.local',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, full_name, role, is_sal)
  VALUES (
    '00000000-0000-0000-0000-000000000002',
    'sal@test.local',
    'SAL Test',
    'tech',
    true
  )
  ON CONFLICT (id) DO UPDATE SET role = 'tech', is_sal = true;

  -- ST (Sous-traitant)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000003',
    'st@test.local',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, full_name, role, is_sal)
  VALUES (
    '00000000-0000-0000-0000-000000000003',
    'st@test.local',
    'ST Test',
    'tech',
    false
  )
  ON CONFLICT (id) DO UPDATE SET role = 'tech', is_sal = false;

  -- Client
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000004',
    'client@test.local',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    '00000000-0000-0000-0000-000000000004',
    'client@test.local',
    'Client Test',
    'client'
  )
  ON CONFLICT (id) DO UPDATE SET role = 'client';

  INSERT INTO user_clients (id, email, full_name, phone, address)
  VALUES (
    '00000000-0000-0000-0000-000000000004',
    'client@test.local',
    'Client Test',
    '0612345678',
    '123 Rue Test, 75001 Paris'
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Users créés avec succès';
END $$;

-- 2) Créer intervention type si pas existant
INSERT INTO intervention_types (id, name, description, default_duration_minutes)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Test Maintenance',
  'Type test pour workflow',
  120
)
ON CONFLICT (id) DO NOTHING;

-- 3) Créer template de procédure basique
INSERT INTO procedure_templates (
  id,
  version,
  mission_type,
  title,
  is_active,
  min_photos_avant,
  min_photos_apres,
  fields
)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  1,
  'generic',
  'Template Test',
  true,
  1,
  1,
  '[]'::jsonb
)
ON CONFLICT (id, version) DO NOTHING;

-- 4) Créer 2 missions BROUILLON (une pour SAL, une pour ST)
INSERT INTO missions (
  id,
  title,
  description,
  address,
  lat,
  lng,
  client_id,
  type,
  status,
  report_status,
  billing_status,
  scheduled_start
)
VALUES
  (
    '00000000-0000-0000-0000-000000000100',
    'Mission Test SAL',
    'Test workflow SAL auto-validation',
    '123 Rue Test, 75001 Paris',
    48.8566,
    2.3522,
    '00000000-0000-0000-0000-000000000004',
    'generic',
    'BROUILLON',
    NULL,
    'NON_FACTURABLE',
    now() + interval '2 days'
  ),
  (
    '00000000-0000-0000-0000-000000000200',
    'Mission Test ST',
    'Test workflow ST avec validation admin',
    '456 Avenue Test, 75002 Paris',
    48.8606,
    2.3376,
    '00000000-0000-0000-0000-000000000004',
    'generic',
    'BROUILLON',
    NULL,
    'NON_FACTURABLE',
    now() + interval '3 days'
  )
ON CONFLICT (id) DO UPDATE SET status = 'BROUILLON';

RAISE NOTICE '✅ Seed terminé. 2 missions créées:';
RAISE NOTICE '  - Mission SAL: 00000000-0000-0000-0000-000000000100';
RAISE NOTICE '  - Mission ST:  00000000-0000-0000-0000-000000000200';
RAISE NOTICE '';
RAISE NOTICE '📧 Users créés:';
RAISE NOTICE '  - admin@test.local / Test1234!';
RAISE NOTICE '  - sal@test.local / Test1234!';
RAISE NOTICE '  - st@test.local / Test1234!';
RAISE NOTICE '  - client@test.local / Test1234!';
