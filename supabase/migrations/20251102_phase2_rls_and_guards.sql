/*
  # Workflow Phase 2 : RLS Policies & RPC Guards

  ## Objectif
  Verrouiller la sécurité (RLS granulaire par flux + rôle) et
  durcir les RPC avec garde-fous métier complets + codes erreur normalisés.

  ## Modifications
  1. RLS policies granulaires pour missions, intervention_reports, invoices, logs
  2. Table error_codes (mapping codes → messages)
  3. Garde-fous complets dans RPC existants
  4. Nouvelles RPC facturation (issue_invoice, mark_paid, credit_note)
  5. RPC cancel_mission avec règles métier
  6. Fonctions helper validation (heures ouvrées, conflits calendrier)

  ## Sécurité
  - Lecture minimale par ownership/rôle
  - Écriture uniquement via RPC (SECURITY DEFINER)
  - Codes erreur normalisés pour le front
*/

-- =====================================================
-- 1) TABLE NORMALISATION CODES ERREURS
-- =====================================================

CREATE TABLE IF NOT EXISTS error_codes (
  code text PRIMARY KEY,
  message_fr text NOT NULL,
  message_en text NOT NULL,
  category text NOT NULL CHECK (category IN ('operational', 'quality', 'billing', 'validation')),
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Insérer codes opérationnels
INSERT INTO error_codes (code, message_fr, message_en, category) VALUES
  ('E_OP_PUBLISH_INVALID_STATE', 'Impossible de publier depuis cet état', 'Cannot publish from this state', 'operational'),
  ('E_OP_PUBLISH_MISSING_FIELDS', 'Champs obligatoires manquants (client, adresse, type)', 'Missing required fields', 'operational'),
  ('E_OP_ACCEPT_INVALID_STATE', 'Mission non disponible pour acceptation', 'Mission not available for acceptance', 'operational'),
  ('E_OP_ALREADY_ASSIGNED', 'Mission déjà assignée à un autre technicien', 'Mission already assigned', 'operational'),
  ('E_OP_SCHED_INVALID_STATE', 'Mission non planifiable dans cet état', 'Mission cannot be scheduled in this state', 'operational'),
  ('E_OP_SCHED_CONFLICT', 'Conflit de calendrier pour le technicien', 'Calendar conflict for technician', 'operational'),
  ('E_OP_SCHED_OUT_OF_BHOURS', 'Créneau en dehors des heures ouvrées', 'Outside business hours', 'operational'),
  ('E_OP_TRAVEL_INVALID_STATE', 'Départ impossible depuis cet état', 'Cannot start travel from this state', 'operational'),
  ('E_OP_START_INVALID_STATE', 'Intervention impossible depuis cet état', 'Cannot start intervention from this state', 'operational'),
  ('E_OP_PAUSE_INVALID_STATE', 'Pause impossible depuis cet état', 'Cannot pause from this state', 'operational'),
  ('E_OP_RESUME_INVALID_STATE', 'Reprise impossible depuis cet état', 'Cannot resume from this state', 'operational'),
  ('E_OP_COMPLETE_CHECKS_FAILED', 'Checklist incomplète (signatures/photos/mesures)', 'Checklist incomplete', 'operational'),
  ('E_OP_COMPLETE_INVALID_STATE', 'Impossible de terminer depuis cet état', 'Cannot complete from this state', 'operational'),
  ('E_OP_CANCEL_NOT_ALLOWED', 'Annulation non autorisée pour ce rôle/état', 'Cancellation not allowed', 'operational'),
  ('E_OP_CANCEL_INVALID_STATE', 'Annulation impossible depuis cet état', 'Cannot cancel from this state', 'operational')
ON CONFLICT (code) DO NOTHING;

-- Codes qualité
INSERT INTO error_codes (code, message_fr, message_en, category) VALUES
  ('E_Q_FINALIZE_INVALID_STATE', 'Rapport non finalisable dans cet état', 'Report cannot be finalized', 'quality'),
  ('E_Q_VALIDATE_INVALID_STATE', 'Rapport non validable dans cet état', 'Report cannot be validated', 'quality'),
  ('E_Q_REJECT_INVALID_STATE', 'Rapport non rejectable dans cet état', 'Report cannot be rejected', 'quality')
ON CONFLICT (code) DO NOTHING;

-- Codes facturation
INSERT INTO error_codes (code, message_fr, message_en, category) VALUES
  ('E_B_ISSUE_INVALID_STATE', 'Facturation impossible dans cet état', 'Cannot issue invoice in this state', 'billing'),
  ('E_B_DUP_NUMBER', 'Numéro de facture déjà utilisé', 'Invoice number already exists', 'billing'),
  ('E_B_LINES_EMPTY', 'Lignes de facture vides', 'Invoice lines cannot be empty', 'billing'),
  ('E_B_PAY_INVALID_STATE', 'Paiement impossible dans cet état', 'Cannot mark as paid in this state', 'billing'),
  ('E_B_CREDIT_INVALID', 'Avoir impossible sans facture', 'Cannot issue credit note without invoice', 'billing'),
  ('E_B_CREDIT_TOTAL_MISMATCH', 'Montant avoir incohérent', 'Credit note amount mismatch', 'billing')
ON CONFLICT (code) DO NOTHING;

-- Codes validation
INSERT INTO error_codes (code, message_fr, message_en, category) VALUES
  ('E_VAL_PERMISSION_DENIED', 'Permission refusée', 'Permission denied', 'validation'),
  ('E_VAL_MISSION_NOT_FOUND', 'Mission introuvable', 'Mission not found', 'validation'),
  ('E_VAL_INVALID_INPUT', 'Données invalides', 'Invalid input data', 'validation')
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_error_codes_category ON error_codes(category);

COMMENT ON TABLE error_codes IS 'Codes erreur normalisés pour mapping front';

-- =====================================================
-- 2) HELPER FUNCTIONS VALIDATION
-- =====================================================

-- Vérifier heures ouvrées (config basique, à enrichir)
CREATE OR REPLACE FUNCTION is_within_business_hours(_datetime timestamptz)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_day_of_week int;
  v_hour int;
BEGIN
  v_day_of_week := EXTRACT(ISODOW FROM _datetime); -- 1=lundi, 7=dimanche
  v_hour := EXTRACT(HOUR FROM _datetime);

  -- Lundi-Vendredi, 8h-18h
  IF v_day_of_week BETWEEN 1 AND 5 AND v_hour BETWEEN 8 AND 17 THEN
    RETURN true;
  END IF;

  RETURN false;
END;$$;

-- Vérifier conflit calendrier technicien
CREATE OR REPLACE FUNCTION has_calendar_conflict(
  _tech_id uuid,
  _start timestamptz,
  _end timestamptz,
  _exclude_mission_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_conflict_count int;
BEGIN
  SELECT COUNT(*) INTO v_conflict_count
  FROM missions
  WHERE assigned_user_id = _tech_id
    AND status IN ('PLANIFIEE', 'EN_ROUTE', 'EN_INTERVENTION', 'EN_PAUSE')
    AND scheduled_start IS NOT NULL
    AND (
      -- Chevauchement de créneaux
      (scheduled_start, scheduled_start + INTERVAL '2 hours') OVERLAPS (_start, _end)
    )
    AND (_exclude_mission_id IS NULL OR id != _exclude_mission_id);

  RETURN v_conflict_count > 0;
END;$$;

-- Vérifier complétude mission (champs obligatoires pour publication)
CREATE OR REPLACE FUNCTION validate_mission_completeness(_mission_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_mission RECORD;
BEGIN
  SELECT
    client_id,
    client_name,
    address,
    type,
    estimated_duration_min
  INTO v_mission
  FROM missions
  WHERE id = _mission_id;

  IF v_mission.client_name IS NULL OR v_mission.client_name = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'E_OP_PUBLISH_MISSING_FIELDS';
  END IF;

  IF v_mission.address IS NULL OR v_mission.address = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'E_OP_PUBLISH_MISSING_FIELDS';
  END IF;

  IF v_mission.type IS NULL OR v_mission.type = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'E_OP_PUBLISH_MISSING_FIELDS';
  END IF;

  RETURN true;
END;$$;

-- =====================================================
-- 3) RPC DURCIS - OPÉRATIONNEL
-- =====================================================

-- PUBLIER mission (avec validations complètes)
CREATE OR REPLACE FUNCTION rpc_publish_mission(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  -- Vérifier permissions
  IF NOT check_transition_permission(_mission_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'insufficient_privilege',
      MESSAGE = 'E_VAL_PERMISSION_DENIED';
  END IF;

  -- Vérifier statut actuel
  SELECT status INTO v_status FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'no_data_found',
      MESSAGE = 'E_VAL_MISSION_NOT_FOUND';
  END IF;

  IF v_status != 'BROUILLON' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'E_OP_PUBLISH_INVALID_STATE';
  END IF;

  -- Valider complétude
  PERFORM validate_mission_completeness(_mission_id);

  -- Mettre à jour
  UPDATE missions
  SET status = 'PUBLIEE', updated_at = now()
  WHERE id = _mission_id;

  -- Logger
  PERFORM log_mission_workflow(_mission_id, v_status, 'PUBLIEE', 'published_by_admin');
END;$$;

-- ACCEPTER mission (avec lock transactionnel)
CREATE OR REPLACE FUNCTION rpc_accept_mission(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_assigned_user uuid;
BEGIN
  -- Vérifier statut actuel + lock
  SELECT status, assigned_user_id INTO v_status, v_assigned_user
  FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'no_data_found',
      MESSAGE = 'E_VAL_MISSION_NOT_FOUND';
  END IF;

  IF v_status != 'PUBLIEE' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'E_OP_ACCEPT_INVALID_STATE';
  END IF;

  -- Vérifier si déjà assignée
  IF v_assigned_user IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'E_OP_ALREADY_ASSIGNED';
  END IF;

  -- Mettre à jour + assigner technicien
  UPDATE missions
  SET
    status = 'ACCEPTEE',
    assigned_user_id = current_user_id(),
    accepted_at = now(),
    updated_at = now()
  WHERE id = _mission_id;

  -- Logger
  PERFORM log_mission_workflow(_mission_id, v_status, 'ACCEPTEE', 'accepted_by_tech');
END;$$;

-- PLANIFIER mission (avec validations heures + conflits)
CREATE OR REPLACE FUNCTION rpc_schedule_mission(
  _mission_id uuid,
  _scheduled_start timestamptz,
  _scheduled_end timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_assigned_user uuid;
  v_end timestamptz;
BEGIN
  IF NOT check_transition_permission(_mission_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'insufficient_privilege',
      MESSAGE = 'E_VAL_PERMISSION_DENIED';
  END IF;

  SELECT status, assigned_user_id INTO v_status, v_assigned_user
  FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_status NOT IN ('ACCEPTEE', 'PLANIFIEE') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'E_OP_SCHED_INVALID_STATE';
  END IF;

  -- Calculer fin si absente
  v_end := COALESCE(_scheduled_end, _scheduled_start + INTERVAL '2 hours');

  -- Vérifier heures ouvrées
  IF NOT is_within_business_hours(_scheduled_start) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'E_OP_SCHED_OUT_OF_BHOURS';
  END IF;

  -- Vérifier conflits calendrier
  IF has_calendar_conflict(v_assigned_user, _scheduled_start, v_end, _mission_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'E_OP_SCHED_CONFLICT';
  END IF;

  UPDATE missions
  SET
    status = 'PLANIFIEE',
    scheduled_start = _scheduled_start,
    planned_at = CASE WHEN v_status = 'ACCEPTEE' THEN now() ELSE planned_at END,
    updated_at = now()
  WHERE id = _mission_id;

  PERFORM log_mission_workflow(_mission_id, v_status, 'PLANIFIEE', 'scheduled');
END;$$;

-- ANNULER mission (règles par rôle + statut)
CREATE OR REPLACE FUNCTION rpc_cancel_mission(
  _mission_id uuid,
  _annulation_reason annulation_reason,
  _annulation_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_user_role text;
  v_assigned_user uuid;
BEGIN
  v_user_role := current_user_role();

  SELECT status, assigned_user_id INTO v_status, v_assigned_user
  FROM missions WHERE id = _mission_id FOR UPDATE;

  -- Règles annulation par rôle
  IF v_user_role IN ('tech', 'st') THEN
    -- Tech/ST : uniquement avant EN_INTERVENTION si assigné
    IF v_assigned_user != current_user_id() THEN
      RAISE EXCEPTION USING
        ERRCODE = 'insufficient_privilege',
        MESSAGE = 'E_OP_CANCEL_NOT_ALLOWED';
    END IF;

    IF v_status NOT IN ('PUBLIEE', 'ACCEPTEE', 'PLANIFIEE', 'EN_ROUTE') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'check_violation',
        MESSAGE = 'E_OP_CANCEL_INVALID_STATE';
    END IF;
  ELSIF v_user_role IN ('admin', 'manager', 'sal') THEN
    -- Admin : jusqu'à PLANIFIEE
    IF v_status IN ('EN_INTERVENTION', 'EN_PAUSE', 'TERMINEE', 'CLOTUREE') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'check_violation',
        MESSAGE = 'E_OP_CANCEL_INVALID_STATE';
    END IF;
  ELSIF v_user_role = 'client' THEN
    -- Client : uniquement PUBLIEE, ACCEPTEE (max)
    IF v_status NOT IN ('PUBLIEE', 'ACCEPTEE') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'check_violation',
        MESSAGE = 'E_OP_CANCEL_NOT_ALLOWED';
    END IF;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = 'insufficient_privilege',
      MESSAGE = 'E_VAL_PERMISSION_DENIED';
  END IF;

  -- Annuler + libérer assignation
  UPDATE missions
  SET
    status = 'ANNULEE',
    annulation_reason = _annulation_reason,
    annulation_note = _annulation_note,
    assigned_user_id = NULL,
    updated_at = now()
  WHERE id = _mission_id;

  PERFORM log_mission_workflow(
    _mission_id,
    v_status,
    'ANNULEE',
    format('cancelled:%s:%s', _annulation_reason::text, COALESCE(_annulation_note, ''))
  );
END;$$;

-- =====================================================
-- 4) RPC FACTURATION
-- =====================================================

-- Émettre facture
CREATE OR REPLACE FUNCTION rpc_issue_invoice(
  _mission_id uuid,
  _invoice_number text,
  _lines jsonb,
  _subtotal_ht_cents bigint,
  _vat_cents bigint,
  _total_ttc_cents bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing_status billing_status;
  v_invoice_id uuid;
BEGIN
  -- Seuls admin/manager/sal
  IF current_user_role() NOT IN ('admin', 'manager', 'sal') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'insufficient_privilege',
      MESSAGE = 'E_VAL_PERMISSION_DENIED';
  END IF;

  SELECT billing_status INTO v_billing_status
  FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_billing_status != 'FACTURABLE' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'E_B_ISSUE_INVALID_STATE';
  END IF;

  -- Vérifier lignes non vides
  IF jsonb_array_length(_lines) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'E_B_LINES_EMPTY';
  END IF;

  -- Vérifier unicité numéro (déjà UNIQUE constraint, mais message custom)
  IF EXISTS (SELECT 1 FROM invoices WHERE invoice_number = _invoice_number) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'unique_violation',
      MESSAGE = 'E_B_DUP_NUMBER';
  END IF;

  -- Créer facture
  INSERT INTO invoices(
    mission_id,
    invoice_number,
    invoice_type,
    lines,
    subtotal_ht_cents,
    vat_cents,
    total_ttc_cents,
    issued_at,
    created_by
  ) VALUES (
    _mission_id,
    _invoice_number,
    'standard',
    _lines,
    _subtotal_ht_cents,
    _vat_cents,
    _total_ttc_cents,
    now(),
    current_user_id()
  ) RETURNING id INTO v_invoice_id;

  -- Bascule billing_status
  UPDATE missions SET billing_status = 'FACTUREE' WHERE id = _mission_id;
  PERFORM log_billing_status(_mission_id, v_billing_status, 'FACTUREE'::billing_status, 'invoice_issued', v_invoice_id);

  RETURN v_invoice_id;
END;$$;

-- Marquer facture payée
CREATE OR REPLACE FUNCTION rpc_mark_invoice_paid(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing_status billing_status;
BEGIN
  IF current_user_role() NOT IN ('admin', 'manager', 'sal') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'insufficient_privilege',
      MESSAGE = 'E_VAL_PERMISSION_DENIED';
  END IF;

  SELECT billing_status INTO v_billing_status
  FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_billing_status != 'FACTUREE' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'E_B_PAY_INVALID_STATE';
  END IF;

  -- Marquer payé
  UPDATE missions SET billing_status = 'PAYEE' WHERE id = _mission_id;
  UPDATE invoices SET paid_at = now() WHERE mission_id = _mission_id AND paid_at IS NULL;

  PERFORM log_billing_status(_mission_id, v_billing_status, 'PAYEE'::billing_status, 'payment_received');
END;$$;

-- Émettre avoir (partiel/total)
CREATE OR REPLACE FUNCTION rpc_issue_credit_note(
  _mission_id uuid,
  _credit_type text, -- 'PARTIEL' ou 'TOTAL'
  _lines jsonb,
  _total_cents bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_invoice_total bigint;
  v_credit_id uuid;
  v_new_billing_status billing_status;
BEGIN
  IF current_user_role() NOT IN ('admin', 'manager', 'sal') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'insufficient_privilege',
      MESSAGE = 'E_VAL_PERMISSION_DENIED';
  END IF;

  -- Vérifier qu'une facture existe
  SELECT id, total_ttc_cents INTO v_invoice_id, v_invoice_total
  FROM invoices
  WHERE mission_id = _mission_id AND invoice_type = 'standard'
  LIMIT 1;

  IF v_invoice_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'E_B_CREDIT_INVALID';
  END IF;

  -- Vérifier cohérence montant
  IF _credit_type = 'TOTAL' AND _total_cents != v_invoice_total THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'E_B_CREDIT_TOTAL_MISMATCH';
  END IF;

  -- Créer avoir
  INSERT INTO invoices(
    mission_id,
    invoice_number,
    invoice_type,
    lines,
    total_ttc_cents,
    issued_at,
    created_by
  ) VALUES (
    _mission_id,
    (SELECT invoice_number || '-AVOIR' FROM invoices WHERE id = v_invoice_id),
    CASE WHEN _credit_type = 'TOTAL' THEN 'avoir_total' ELSE 'avoir_partiel' END,
    _lines,
    -_total_cents, -- négatif
    now(),
    current_user_id()
  ) RETURNING id INTO v_credit_id;

  -- Bascule billing_status
  v_new_billing_status := CASE WHEN _credit_type = 'TOTAL' THEN 'AVOIR_TOTAL'::billing_status ELSE 'AVOIR_PARTIEL'::billing_status END;
  UPDATE missions SET billing_status = v_new_billing_status WHERE id = _mission_id;

  PERFORM log_billing_status(_mission_id, 'PAYEE'::billing_status, v_new_billing_status, format('credit_note:%s', _credit_type), v_credit_id);

  RETURN v_credit_id;
END;$$;

-- =====================================================
-- 5) RLS POLICIES GRANULAIRES
-- =====================================================

-- Désactiver anciennes policies (si existantes)
DROP POLICY IF EXISTS missions_client_read ON missions;
DROP POLICY IF EXISTS missions_tech_read ON missions;
DROP POLICY IF EXISTS missions_admin_all ON missions;

-- ========== MISSIONS ==========

-- SELECT : client propriétaire
CREATE POLICY missions_select_client ON missions
  FOR SELECT
  TO authenticated
  USING (
    client_id = current_user_id()
    OR (SELECT role FROM profiles WHERE user_id = current_user_id()) = 'client'
  );

-- SELECT : tech/st assigné
CREATE POLICY missions_select_tech ON missions
  FOR SELECT
  TO authenticated
  USING (
    assigned_user_id = current_user_id()
    AND (SELECT role FROM profiles WHERE user_id = current_user_id()) IN ('tech', 'st')
  );

-- SELECT : admin/sal/manager full
CREATE POLICY missions_select_admin ON missions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = current_user_id()) IN ('admin', 'manager', 'sal')
  );

-- UPDATE : tech/st sur champs opérationnels uniquement
CREATE POLICY missions_update_tech ON missions
  FOR UPDATE
  TO authenticated
  USING (
    assigned_user_id = current_user_id()
    AND (SELECT role FROM profiles WHERE user_id = current_user_id()) IN ('tech', 'st')
  )
  WITH CHECK (
    -- Autorisé uniquement via RPC (check minimal)
    assigned_user_id = current_user_id()
  );

-- UPDATE : admin/sal/manager full
CREATE POLICY missions_update_admin ON missions
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = current_user_id()) IN ('admin', 'manager', 'sal')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE user_id = current_user_id()) IN ('admin', 'manager', 'sal')
  );

-- INSERT : admin/sal/manager uniquement
CREATE POLICY missions_insert_admin ON missions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE user_id = current_user_id()) IN ('admin', 'manager', 'sal')
  );

-- ========== INTERVENTION_REPORTS ==========

-- SELECT : client propriétaire mission
CREATE POLICY reports_select_client ON intervention_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_id
      AND m.client_id = current_user_id()
    )
  );

-- SELECT : tech/st assigné
CREATE POLICY reports_select_tech ON intervention_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_id
      AND m.assigned_user_id = current_user_id()
    )
  );

-- SELECT : admin full
CREATE POLICY reports_select_admin ON intervention_reports
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = current_user_id()) IN ('admin', 'manager', 'sal')
  );

-- UPDATE : tech/st sur data/photos/signatures (si report_status approprié)
CREATE POLICY reports_update_tech ON intervention_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_id
      AND m.assigned_user_id = current_user_id()
      AND m.report_status IN ('A_COMPLETER', 'SOUMIS')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_id
      AND m.assigned_user_id = current_user_id()
    )
  );

-- UPDATE : admin (via RPC uniquement pour report_status)
CREATE POLICY reports_update_admin ON intervention_reports
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = current_user_id()) IN ('admin', 'manager', 'sal')
  );

-- ========== INVOICES ==========

-- SELECT : client propriétaire mission
CREATE POLICY invoices_select_client ON invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_id
      AND m.client_id = current_user_id()
    )
  );

-- SELECT : admin/sal/manager full
CREATE POLICY invoices_select_admin ON invoices
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = current_user_id()) IN ('admin', 'manager', 'sal')
  );

-- INSERT/UPDATE : uniquement via RPC (pas de policy directe)
-- Les RPC sont SECURITY DEFINER donc bypassent RLS

-- ========== LOGS (lecture seule) ==========

-- Logs opérationnels : admin full
CREATE POLICY workflow_logs_select_admin ON mission_workflow_log
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = current_user_id()) IN ('admin', 'manager', 'sal')
  );

-- Logs opérationnels : tech/st leurs missions
CREATE POLICY workflow_logs_select_tech ON mission_workflow_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_id
      AND m.assigned_user_id = current_user_id()
    )
  );

-- Logs qualité : admin full
CREATE POLICY report_logs_select_admin ON report_status_log
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = current_user_id()) IN ('admin', 'manager', 'sal')
  );

-- Logs facturation : admin full
CREATE POLICY billing_logs_select_admin ON billing_status_log
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = current_user_id()) IN ('admin', 'manager', 'sal')
  );

-- =====================================================
-- 6) ENABLE RLS
-- =====================================================

ALTER TABLE error_codes ENABLE ROW LEVEL SECURITY;

-- Policy publique lecture error_codes (pour mapping front)
CREATE POLICY error_codes_select_all ON error_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- FIN MIGRATION PHASE 2
-- =====================================================
