/*
  # Workflow Guardrails - Migration Critique

  ## Objectif
  Ajouter les garde-fous essentiels pour sécuriser le workflow :
  - Idempotence (anti-double-clic)
  - Logs immuables (append-only)
  - Contraintes métier (une facture ouverte par mission)

  ## Modifications
  1. Table `rpc_idempotency` pour éviter double-exécution
  2. Triggers `forbid_log_updates` sur les 3 tables de logs
  3. Index unique sur invoices (une facture ouverte par mission)
  4. Fonction helper `generate_idempotency_key()`

  ## Sécurité
  - Les logs deviennent juridiquement immuables
  - Double-clic ne peut pas créer d'incohérence
  - Intégrité métier facturation garantie
*/

-- =====================================================
-- 1) EXTENSION REQUISE
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2) TABLE IDEMPOTENCY (anti-double-clic)
-- =====================================================

CREATE TABLE IF NOT EXISTS rpc_idempotency (
  idempotency_key uuid PRIMARY KEY,
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  rpc_name text NOT NULL,
  request_hash text NOT NULL,
  response_data jsonb,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_rpc_idempotency_mission 
  ON rpc_idempotency(mission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rpc_idempotency_expires 
  ON rpc_idempotency(expires_at);

COMMENT ON TABLE rpc_idempotency IS 
'Cache des appels RPC pour éviter double-exécution (expire après 24h)';

COMMENT ON COLUMN rpc_idempotency.idempotency_key IS 
'UUID généré côté client, garantit unicité de la requête';

COMMENT ON COLUMN rpc_idempotency.request_hash IS 
'Hash MD5 des paramètres pour détecter requêtes identiques';

COMMENT ON COLUMN rpc_idempotency.expires_at IS 
'Entrées expirées à nettoyer automatiquement (cron job)';

-- =====================================================
-- 3) PROTECTION LOGS IMMUABLES (append-only)
-- =====================================================

-- Fonction de garde : empêche UPDATE/DELETE sur les logs
CREATE OR REPLACE FUNCTION forbid_log_mutations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'UPDATE interdit sur % : logs immuables (audit trail)', TG_TABLE_NAME;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DELETE interdit sur % : logs immuables (audit trail)', TG_TABLE_NAME;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Appliquer sur mission_workflow_log
DROP TRIGGER IF EXISTS mission_workflow_log_immutable ON mission_workflow_log;
CREATE TRIGGER mission_workflow_log_immutable
  BEFORE UPDATE OR DELETE ON mission_workflow_log
  FOR EACH STATEMENT
  EXECUTE FUNCTION forbid_log_mutations();

-- Appliquer sur report_status_log
DROP TRIGGER IF EXISTS report_status_log_immutable ON report_status_log;
CREATE TRIGGER report_status_log_immutable
  BEFORE UPDATE OR DELETE ON report_status_log
  FOR EACH STATEMENT
  EXECUTE FUNCTION forbid_log_mutations();

-- Appliquer sur billing_status_log
DROP TRIGGER IF EXISTS billing_status_log_immutable ON billing_status_log;
CREATE TRIGGER billing_status_log_immutable
  BEFORE UPDATE OR DELETE ON billing_status_log
  FOR EACH STATEMENT
  EXECUTE FUNCTION forbid_log_mutations();

COMMENT ON FUNCTION forbid_log_mutations() IS 
'Garantit immuabilité des logs (INSERT-only) pour conformité audit/juridique';

-- =====================================================
-- 4) CONTRAINTES MÉTIER FACTURATION
-- =====================================================

-- Contrainte : UNE SEULE facture non-payée par mission
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_one_open_per_mission
  ON invoices(mission_id)
  WHERE paid_at IS NULL;

COMMENT ON INDEX idx_invoices_one_open_per_mission IS 
'Garantit qu''une seule facture ouverte (non payée) existe par mission';

-- =====================================================
-- 5) FONCTION HELPER : Générer idempotency key
-- =====================================================

CREATE OR REPLACE FUNCTION generate_idempotency_key(
  p_mission_id uuid,
  p_rpc_name text,
  p_params jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_hash text;
BEGIN
  -- Hash MD5 des paramètres pour détecter doublons
  v_hash := md5(
    concat(
      p_mission_id::text,
      p_rpc_name,
      p_params::text
    )
  );
  
  -- Retourner UUID v5 (namespace + hash)
  RETURN uuid_generate_v5(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, -- namespace
    v_hash
  );
END;
$$;

COMMENT ON FUNCTION generate_idempotency_key IS 
'Génère UUID déterministe basé sur mission_id + rpc_name + params (pour idempotence côté serveur)';

-- =====================================================
-- 6) FONCTION HELPER : Vérifier idempotence
-- =====================================================

CREATE OR REPLACE FUNCTION check_idempotency(
  p_idempotency_key uuid,
  p_mission_id uuid,
  p_rpc_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing rpc_idempotency%ROWTYPE;
BEGIN
  -- Chercher entrée existante non-expirée
  SELECT * INTO v_existing
  FROM rpc_idempotency
  WHERE idempotency_key = p_idempotency_key
    AND expires_at > now();
  
  -- Si trouvé : retourner résultat en cache
  IF FOUND THEN
    IF v_existing.status = 'error' THEN
      RAISE EXCEPTION 'Cached error: %', v_existing.error_message;
    END IF;
    
    RETURN jsonb_build_object(
      'cached', true,
      'response', v_existing.response_data,
      'created_at', v_existing.created_at
    );
  END IF;
  
  -- Sinon : continuer exécution
  RETURN jsonb_build_object('cached', false);
END;
$$;

COMMENT ON FUNCTION check_idempotency IS 
'Vérifie si un appel RPC a déjà été exécuté (cache 24h). Retourne résultat en cache ou {cached: false}';

-- =====================================================
-- 7) FONCTION HELPER : Enregistrer résultat idempotent
-- =====================================================

CREATE OR REPLACE FUNCTION record_idempotent_result(
  p_idempotency_key uuid,
  p_mission_id uuid,
  p_rpc_name text,
  p_request_hash text,
  p_response_data jsonb DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO rpc_idempotency (
    idempotency_key,
    mission_id,
    rpc_name,
    request_hash,
    response_data,
    status,
    error_message
  )
  VALUES (
    p_idempotency_key,
    p_mission_id,
    p_rpc_name,
    p_request_hash,
    p_response_data,
    CASE WHEN p_error_message IS NULL THEN 'success' ELSE 'error' END,
    p_error_message
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION record_idempotent_result IS 
'Enregistre résultat d''un appel RPC pour idempotence (24h cache)';

-- =====================================================
-- 8) RLS POLICIES
-- =====================================================

ALTER TABLE rpc_idempotency ENABLE ROW LEVEL SECURITY;

-- Admin/Manager peuvent voir tous les caches
CREATE POLICY rpc_idempotency_admin_read ON rpc_idempotency
  FOR SELECT
  USING (current_user_role() IN ('admin', 'manager'));

-- Users voient leurs propres appels (via mission assignée)
CREATE POLICY rpc_idempotency_user_read ON rpc_idempotency
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_id
      AND m.assigned_user_id = current_user_id()
    )
  );

-- Insertion réservée aux fonctions SECURITY DEFINER
CREATE POLICY rpc_idempotency_system_insert ON rpc_idempotency
  FOR INSERT
  WITH CHECK (current_user_role() IN ('admin', 'manager', 'sal', 'tech', 'st'));

-- =====================================================
-- FIN MIGRATION GARDE-FOUS CRITIQUES
-- =====================================================
