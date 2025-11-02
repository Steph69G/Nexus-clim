-- =====================================================
-- SEED SIMPLIFIÉ POUR TESTS WORKFLOW V1
-- Utilise des users existants dans la DB
-- =====================================================

-- 1) Créer intervention type si pas existant
INSERT INTO intervention_types (id, name, description, default_duration_minutes)
VALUES (
  gen_random_uuid(),
  'Test Maintenance',
  'Type test pour workflow',
  120
)
ON CONFLICT DO NOTHING;

-- 2) Créer template de procédure basique
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
  gen_random_uuid(),
  1,
  'generic',
  'Template Test Workflow',
  true,
  1,
  1,
  '[]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 3) Récupérer des IDs utilisateurs existants
DO $$
DECLARE
  v_client_id uuid;
  v_mission_sal_id uuid := '00000000-0000-0000-0000-000000000100';
  v_mission_st_id uuid := '00000000-0000-0000-0000-000000000200';
BEGIN
  -- Trouver un client existant
  SELECT id INTO v_client_id
  FROM user_clients
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Aucun client trouvé dans la base. Créer un client via l''interface d''abord.';
  END IF;

  -- Supprimer missions test existantes
  DELETE FROM missions WHERE id IN (v_mission_sal_id, v_mission_st_id);

  -- Créer 2 missions BROUILLON
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
      v_mission_sal_id,
      'Mission Test SAL',
      'Test workflow SAL auto-validation',
      '123 Rue Test, 75001 Paris',
      48.8566,
      2.3522,
      v_client_id,
      'generic',
      'BROUILLON',
      NULL,
      'NON_FACTURABLE',
      now() + interval '2 days'
    ),
    (
      v_mission_st_id,
      'Mission Test ST',
      'Test workflow ST avec validation admin',
      '456 Avenue Test, 75002 Paris',
      48.8606,
      2.3376,
      v_client_id,
      'generic',
      'BROUILLON',
      NULL,
      'NON_FACTURABLE',
      now() + interval '3 days'
    );

  RAISE NOTICE '✅ Seed terminé. 2 missions créées:';
  RAISE NOTICE '  - Mission SAL: %', v_mission_sal_id;
  RAISE NOTICE '  - Mission ST:  %', v_mission_st_id;
  RAISE NOTICE '';
  RAISE NOTICE '📧 Pour tester, utiliser:';
  RAISE NOTICE '  - Un compte admin existant';
  RAISE NOTICE '  - 2 comptes tech (1 SAL, 1 ST)';
END $$;
