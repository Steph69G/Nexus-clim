-- ============================================
-- SEED MINIMAL GO-LIVE VALIDATION
-- ============================================
-- Durée: 2 min à exécuter
-- Objectif: Créer juste assez de données pour valider:
--   - 1 facture impayée (en_retard)
--   - 1 devis en attente validation
--   - 1 urgence ouverte
--   - 1 article stock sous seuil
--   - Users: admin, tech, client
-- ============================================

-- ============================================
-- 1. USERS & PROFILES
-- ============================================

-- Admin (si pas déjà existant)
DO $$
DECLARE
  admin_id UUID := 'd1e7a3c0-0000-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id) THEN
    INSERT INTO profiles (id, email, role, full_name, phone, city, postal_code)
    VALUES (
      admin_id,
      'admin@climpassion.test',
      'admin',
      'Admin Test',
      '+33612345678',
      'Paris',
      '75001'
    );
  END IF;
END $$;

-- Tech (technicien)
DO $$
DECLARE
  tech_id UUID := 'd1e7a3c0-0000-0000-0000-000000000002';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = tech_id) THEN
    INSERT INTO profiles (id, email, role, full_name, phone, city, postal_code)
    VALUES (
      tech_id,
      'tech@climpassion.test',
      'tech',
      'Jean Dupont',
      '+33698765432',
      'Lyon',
      '69001'
    );
  END IF;
END $$;

-- Client
DO $$
DECLARE
  client_id UUID := 'd1e7a3c0-0000-0000-0000-000000000003';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = client_id) THEN
    INSERT INTO profiles (id, email, role, full_name, phone, city, postal_code)
    VALUES (
      client_id,
      'client@example.test',
      'client',
      'Marie Martin',
      '+33687654321',
      'Marseille',
      '13001'
    );
  END IF;
END $$;

-- ============================================
-- 2. CLIENT ACCOUNTS (pour factures)
-- ============================================

DO $$
DECLARE
  client_id UUID := 'd1e7a3c0-0000-0000-0000-000000000003';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_clients WHERE user_id = client_id) THEN
    INSERT INTO user_clients (
      user_id,
      first_name,
      last_name,
      email,
      phone,
      home_address
    ) VALUES (
      client_id,
      'Marie',
      'Martin',
      'client@example.test',
      '+33687654321',
      '123 Rue de la République, 13001 Marseille'
    );
  END IF;
END $$;

-- ============================================
-- 3. FACTURE IMPAYÉE (pour test overdue)
-- ============================================

DO $$
DECLARE
  client_id UUID := 'd1e7a3c0-0000-0000-0000-000000000003';
  invoice_id UUID := 'd1e7a3c0-1111-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM invoices WHERE id = invoice_id) THEN
    INSERT INTO invoices (
      id,
      invoice_number,
      client_id,
      total_cents,
      currency,
      status,
      payment_status,
      due_date,
      created_at,
      updated_at
    ) VALUES (
      invoice_id,
      'FACT-2025-001',
      client_id,
      35000,  -- 350.00 EUR
      'EUR',
      'envoye',  -- ⚠️ Enum FR
      'en_retard',  -- ⚠️ Enum FR
      NOW() - INTERVAL '15 days',  -- En retard de 15 jours
      NOW() - INTERVAL '30 days',
      NOW()
    );
  END IF;
END $$;

-- ============================================
-- 4. DEVIS EN ATTENTE VALIDATION
-- ============================================

DO $$
DECLARE
  client_id UUID := 'd1e7a3c0-0000-0000-0000-000000000003';
  quote_id UUID := 'd1e7a3c0-2222-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM quotes WHERE id = quote_id) THEN
    INSERT INTO quotes (
      id,
      quote_number,
      client_id,
      total_cents,
      currency,
      status,
      valid_until,
      created_at,
      updated_at
    ) VALUES (
      quote_id,
      'DEV-2025-001',
      client_id,
      75000,  -- 750.00 EUR
      'EUR',
      'en_attente_validation',  -- ⚠️ Enum FR
      NOW() + INTERVAL '15 days',
      NOW() - INTERVAL '2 days',
      NOW()
    );
  END IF;
END $$;

-- ============================================
-- 5. URGENCE OUVERTE (HIGH PRIORITY)
-- ============================================

DO $$
DECLARE
  client_id UUID := 'd1e7a3c0-0000-0000-0000-000000000003';
  emergency_id UUID := 'd1e7a3c0-3333-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM emergency_requests WHERE id = emergency_id) THEN
    INSERT INTO emergency_requests (
      id,
      client_id,
      request_type,
      title,
      description,
      urgency_level,
      equipment_type,
      equipment_location,
      site_address,
      site_city,
      site_postal_code,
      status,
      created_at
    ) VALUES (
      emergency_id,
      client_id,
      'panne',
      'Climatisation en panne - Salle serveurs',
      'Climatisation principale hors service depuis 2h. Température salle serveurs monte (28°C actuel). Risque arrêt équipements.',
      'high',  -- ⚠️ Enum EN (colonne urgency_level)
      'climatisation_centrale',
      'Salle serveurs - Niveau -1',
      '123 Rue de la République',
      'Marseille',
      '13001',
      'open',  -- ⚠️ Enum EN (colonne status)
      NOW() - INTERVAL '2 hours'
    );
  END IF;
END $$;

-- ============================================
-- 6. ARTICLE STOCK SOUS SEUIL
-- ============================================

DO $$
DECLARE
  stock_id UUID := 'd1e7a3c0-4444-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM stock_items WHERE id = stock_id) THEN
    INSERT INTO stock_items (
      id,
      name,
      reference,
      category,
      quantity,
      min_qty_alert,
      unit_price_cents,
      currency,
      storage_location,
      created_at,
      updated_at
    ) VALUES (
      stock_id,
      'Filtre climatiseur R32',
      'FIL-R32-STD',
      'filtres',
      3,  -- Stock actuel
      10,  -- Seuil alerte (3 < 10 = alerte)
      2500,  -- 25.00 EUR
      'EUR',
      'Entrepôt A - Rack 12',
      NOW() - INTERVAL '30 days',
      NOW()
    );
  END IF;
END $$;

-- ============================================
-- 7. MISSION DISPONIBLE (pour test offers)
-- ============================================

DO $$
DECLARE
  mission_id UUID := 'd1e7a3c0-5555-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM missions WHERE id = mission_id) THEN
    INSERT INTO missions (
      id,
      title,
      type,
      status,
      address,
      city,
      zip,
      lat,
      lng,
      description,
      scheduled_start,
      estimated_duration_min,
      price_total_cents,
      price_subcontractor_cents,
      currency,
      is_available,
      created_at,
      updated_at
    ) VALUES (
      mission_id,
      'Installation climatisation',
      'installation',  -- ⚠️ Vérifier enum intervention_types
      'published',  -- ⚠️ Enum missions_status
      '15 Avenue des Champs-Élysées',
      'Paris',
      '75008',
      48.8698,
      2.3074,
      'Installation climatisation réversible 3 pièces (bureau)',
      NOW() + INTERVAL '2 days',
      180,  -- 3h
      75000,  -- 750 EUR client
      45000,  -- 450 EUR sous-traitant
      'EUR',
      true,  -- Disponible pour assignment
      NOW() - INTERVAL '1 day',
      NOW()
    );
  END IF;
END $$;

-- ============================================
-- VALIDATION POST-SEED
-- ============================================

-- Vérifier que tout est OK
DO $$
DECLARE
  v_profiles INT;
  v_invoices INT;
  v_quotes INT;
  v_emergencies INT;
  v_stock INT;
  v_missions INT;
BEGIN
  SELECT COUNT(*) INTO v_profiles FROM profiles WHERE email LIKE '%@climpassion.test' OR email LIKE '%@example.test';
  SELECT COUNT(*) INTO v_invoices FROM invoices WHERE invoice_number = 'FACT-2025-001';
  SELECT COUNT(*) INTO v_quotes FROM quotes WHERE quote_number = 'DEV-2025-001';
  SELECT COUNT(*) INTO v_emergencies FROM emergency_requests WHERE title LIKE '%Climatisation en panne%';
  SELECT COUNT(*) INTO v_stock FROM stock_items WHERE quantity < min_qty_alert;
  SELECT COUNT(*) INTO v_missions FROM missions WHERE is_available = true AND status = 'published';

  RAISE NOTICE '✅ SEED VALIDATION:';
  RAISE NOTICE '   Profiles créés: % (attendu: 3)', v_profiles;
  RAISE NOTICE '   Factures impayées: % (attendu: >=1)', v_invoices;
  RAISE NOTICE '   Devis en attente: % (attendu: >=1)', v_quotes;
  RAISE NOTICE '   Urgences ouvertes: % (attendu: >=1)', v_emergencies;
  RAISE NOTICE '   Stock bas: % (attendu: >=1)', v_stock;
  RAISE NOTICE '   Missions disponibles: % (attendu: >=1)', v_missions;

  IF v_profiles >= 3 AND v_invoices >= 1 AND v_quotes >= 1 AND v_emergencies >= 1 AND v_stock >= 1 AND v_missions >= 1 THEN
    RAISE NOTICE '✅ SEED COMPLET - Prêt pour smoke test !';
  ELSE
    RAISE WARNING '⚠️ SEED INCOMPLET - Vérifier logs ci-dessus';
  END IF;
END $$;

-- ============================================
-- REQUÊTES DE VÉRIFICATION
-- ============================================

-- 1. Vérifier facture impayée
SELECT
  invoice_number,
  payment_status,
  due_date,
  (NOW() - due_date) AS retard
FROM invoices
WHERE payment_status = 'en_retard'
ORDER BY due_date ASC
LIMIT 5;

-- 2. Vérifier devis en attente
SELECT
  quote_number,
  status,
  valid_until,
  (valid_until - NOW()) AS validite_restante
FROM quotes
WHERE status = 'en_attente_validation'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Vérifier urgences ouvertes
SELECT
  title,
  urgency_level,
  status,
  created_at,
  (NOW() - created_at) AS age
FROM emergency_requests
WHERE status = 'open'
ORDER BY urgency_level DESC, created_at ASC
LIMIT 5;

-- 4. Vérifier stock bas
SELECT
  name,
  reference,
  quantity,
  min_qty_alert,
  (min_qty_alert - quantity) AS manquant
FROM stock_items
WHERE quantity < min_qty_alert
ORDER BY (min_qty_alert - quantity) DESC
LIMIT 5;

-- 5. Vérifier missions disponibles
SELECT
  title,
  type,
  status,
  city,
  is_available,
  scheduled_start
FROM missions
WHERE is_available = true AND status = 'published'
ORDER BY scheduled_start ASC
LIMIT 5;

-- ============================================
-- NOTES D'UTILISATION
-- ============================================

/*
EXÉCUTION:
----------
1. Via Supabase Dashboard:
   - SQL Editor > New Query
   - Coller ce fichier
   - Run

2. Via psql:
   psql $DATABASE_URL -f go-live-seed-minimal.sql

3. Via DBeaver/pgAdmin:
   - Ouvrir fichier
   - Exécuter

DURÉE: ~2 min

IDEMPOTENCE:
-----------
Ce script peut être exécuté plusieurs fois sans doublon
(utilise IF NOT EXISTS pour tous les inserts)

NETTOYAGE:
----------
Pour supprimer le seed de test:

DELETE FROM missions WHERE id = 'd1e7a3c0-5555-0000-0000-000000000001';
DELETE FROM stock_items WHERE id = 'd1e7a3c0-4444-0000-0000-000000000001';
DELETE FROM emergency_requests WHERE id = 'd1e7a3c0-3333-0000-0000-000000000001';
DELETE FROM quotes WHERE id = 'd1e7a3c0-2222-0000-0000-000000000001';
DELETE FROM invoices WHERE id = 'd1e7a3c0-1111-0000-0000-000000000001';
DELETE FROM user_clients WHERE user_id = 'd1e7a3c0-0000-0000-0000-000000000003';
DELETE FROM profiles WHERE email LIKE '%@climpassion.test' OR email LIKE '%@example.test';

SÉCURITÉ:
--------
⚠️ NE PAS UTILISER EN PRODUCTION RÉELLE
Ce seed est pour staging/démo uniquement
Les UUIDs sont fixes pour faciliter les tests

SMOKE TEST READY:
----------------
Après exécution, vous pouvez tester:

✅ /admin/comptabilite/invoices?status=overdue → 1 facture
✅ /admin/comptabilite/quotes?status=awaiting_approval → 1 devis
✅ /admin/logistique/stock?filter=low → 1 article
✅ /admin/offers?filter=available → 1 mission
✅ /admin/emergency?status=open&priority=high → 1 urgence

LOGIN TEST:
-----------
⚠️ Les users créés n'ont PAS de mot de passe (auth.users)
Ils servent uniquement aux tests RLS côté DB

Pour tests frontend avec auth:
1. Créer users via Supabase Dashboard > Auth
2. Ou utiliser l'API signup avec ces emails
*/
