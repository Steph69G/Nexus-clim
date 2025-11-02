/*
  # Workflow V1 - Phase 2: Tables de logs & Fonctions RPC

  ## Objectif
  Créer les tables d'historique pour les 3 flux et les fonctions
  de transition avec garde-fous métier.

  ## Modifications
  1. Tables de logs : mission_workflow_log, report_status_log, billing_status_log
  2. Table invoices (structure de base)
  3. Fonctions de logging automatique
  4. Fonctions RPC de transition avec validations
  5. Triggers essentiels

  ## Sécurité
  - Logs immuables (INSERT only)
  - Traçabilité complète (who, when, why)
  - Validations métier strictes
*/

-- =====================================================
-- 1) TABLES DE LOGS (3 flux)
-- =====================================================

-- Log flux Opérationnel (mission_status)
CREATE TABLE IF NOT EXISTS mission_workflow_log (
  id bigserial PRIMARY KEY,
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mission_workflow_log_mission
  ON mission_workflow_log(mission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mission_workflow_log_user
  ON mission_workflow_log(changed_by, created_at DESC);

COMMENT ON TABLE mission_workflow_log IS 'Historique des transitions du flux opérationnel (mission_status)';

-- Log flux Qualité (report_status)
CREATE TABLE IF NOT EXISTS report_status_log (
  id bigserial PRIMARY KEY,
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  from_status report_status,
  to_status report_status NOT NULL,
  rejection_reason rejection_reason,
  details text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_status_log_mission
  ON report_status_log(mission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_status_log_rejections
  ON report_status_log(rejection_reason, created_at DESC)
  WHERE rejection_reason IS NOT NULL;

COMMENT ON TABLE report_status_log IS 'Historique des transitions du flux qualité (report_status)';

-- Log flux Facturation (billing_status)
CREATE TABLE IF NOT EXISTS billing_status_log (
  id bigserial PRIMARY KEY,
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  from_status billing_status,
  to_status billing_status NOT NULL,
  reason text,
  invoice_id uuid,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_status_log_mission
  ON billing_status_log(mission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_status_log_invoice
  ON billing_status_log(invoice_id)
  WHERE invoice_id IS NOT NULL;

COMMENT ON TABLE billing_status_log IS 'Historique des transitions du flux facturation (billing_status)';

-- =====================================================
-- 2) TABLE INVOICES (structure de base)
-- =====================================================

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,

  invoice_number text UNIQUE,
  invoice_type text NOT NULL DEFAULT 'standard' CHECK (invoice_type IN ('standard', 'avoir_partiel', 'avoir_total')),

  lines jsonb NOT NULL DEFAULT '[]'::jsonb,

  subtotal_ht_cents bigint NOT NULL DEFAULT 0,
  vat_cents bigint NOT NULL DEFAULT 0,
  total_ttc_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',

  issued_at timestamptz,
  due_date timestamptz,
  paid_at timestamptz,

  payment_method text,
  payment_reference text,

  pdf_url text,
  pdf_generated_at timestamptz,

  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_mission ON invoices(mission_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_paid ON invoices(paid_at) WHERE paid_at IS NOT NULL;

COMMENT ON TABLE invoices IS 'Factures liées aux missions';

-- =====================================================
-- 3) FONCTIONS DE LOGGING
-- =====================================================

-- Log transition mission_status
CREATE OR REPLACE FUNCTION log_mission_workflow(
  _mission_id uuid,
  _from text,
  _to text,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO mission_workflow_log(mission_id, from_status, to_status, reason, changed_by)
  VALUES(_mission_id, _from, _to, _reason, current_user_id());
END;$$;

-- Log transition report_status
CREATE OR REPLACE FUNCTION log_report_status(
  _mission_id uuid,
  _from report_status,
  _to report_status,
  _rejection_reason rejection_reason DEFAULT NULL,
  _details text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO report_status_log(mission_id, from_status, to_status, rejection_reason, details, changed_by)
  VALUES(_mission_id, _from, _to, _rejection_reason, _details, current_user_id());
END;$$;

-- Log transition billing_status
CREATE OR REPLACE FUNCTION log_billing_status(
  _mission_id uuid,
  _from billing_status,
  _to billing_status,
  _reason text DEFAULT NULL,
  _invoice_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO billing_status_log(mission_id, from_status, to_status, reason, invoice_id, changed_by)
  VALUES(_mission_id, _from, _to, _reason, _invoice_id, current_user_id());
END;$$;

-- =====================================================
-- 4) VALIDATIONS MÉTIER (garde-fous)
-- =====================================================

-- Vérifier checklist minimale avant TERMINEE
CREATE OR REPLACE FUNCTION validate_report_completion(_mission_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_signed_tech boolean;
  v_signed_client boolean;
  v_photo_count int;
  v_min_photos int;
BEGIN
  -- Récupérer infos rapport
  SELECT
    r.signed_by_tech,
    r.signed_by_client,
    jsonb_array_length(COALESCE(r.photos, '[]'::jsonb))
  INTO v_signed_tech, v_signed_client, v_photo_count
  FROM intervention_reports r
  WHERE r.mission_id = _mission_id;

  -- Si pas de rapport trouvé
  IF v_signed_tech IS NULL THEN
    RETURN false;
  END IF;

  -- Vérifier signatures
  IF v_signed_tech IS NOT TRUE THEN
    RAISE EXCEPTION 'Signature technicien manquante';
  END IF;

  IF v_signed_client IS NOT TRUE THEN
    RAISE EXCEPTION 'Signature client manquante';
  END IF;

  -- Vérifier photos minimales (récupérer depuis template)
  SELECT
    COALESCE(t.min_photos_avant, 1) + COALESCE(t.min_photos_apres, 1)
  INTO v_min_photos
  FROM missions m
  LEFT JOIN procedure_templates t ON t.id = m.template_id AND t.version = m.template_version
  WHERE m.id = _mission_id;

  v_min_photos := COALESCE(v_min_photos, 2);

  IF v_photo_count < v_min_photos THEN
    RAISE EXCEPTION 'Photos insuffisantes (% requis, % fourni)', v_min_photos, v_photo_count;
  END IF;

  RETURN true;
END;$$;

-- Vérifier autorisation transition
CREATE OR REPLACE FUNCTION check_transition_permission(
  _mission_id uuid,
  _required_role text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role text;
  v_assigned_user uuid;
BEGIN
  v_user_role := current_user_role();

  -- Admin/Sal peuvent tout faire
  IF v_user_role IN ('admin', 'manager', 'sal') THEN
    RETURN true;
  END IF;

  -- Vérifier si c'est le technicien assigné
  SELECT assigned_user_id INTO v_assigned_user
  FROM missions
  WHERE id = _mission_id;

  IF v_assigned_user = current_user_id() THEN
    RETURN true;
  END IF;

  -- Role spécifique requis
  IF _required_role IS NOT NULL AND v_user_role = _required_role THEN
    RETURN true;
  END IF;

  RETURN false;
END;$$;

-- =====================================================
-- 5) FONCTIONS RPC DE TRANSITION (sélection clé)
-- =====================================================

-- PUBLIER mission (BROUILLON → PUBLIEE)
CREATE OR REPLACE FUNCTION rpc_publish_mission(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
BEGIN
  -- Vérifier permissions
  IF NOT check_transition_permission(_mission_id) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  -- Vérifier statut actuel
  SELECT status INTO v_status FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Mission introuvable';
  END IF;

  IF v_status != 'BROUILLON' THEN
    RAISE EXCEPTION 'Transition invalide : % → PUBLIEE', v_status;
  END IF;

  -- Mettre à jour
  UPDATE missions
  SET status = 'PUBLIEE', updated_at = now()
  WHERE id = _mission_id;

  -- Logger
  PERFORM log_mission_workflow(_mission_id, v_status, 'PUBLIEE', 'published_by_admin');
END;$$;

-- ACCEPTER mission (PUBLIEE → ACCEPTEE)
CREATE OR REPLACE FUNCTION rpc_accept_mission(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
BEGIN
  -- Vérifier statut actuel
  SELECT status INTO v_status FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_status != 'PUBLIEE' THEN
    RAISE EXCEPTION 'Transition invalide : % → ACCEPTEE', v_status;
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

-- PLANIFIER mission (ACCEPTEE → PLANIFIEE)
CREATE OR REPLACE FUNCTION rpc_schedule_mission(
  _mission_id uuid,
  _scheduled_start timestamptz,
  _scheduled_end timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT check_transition_permission(_mission_id) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  SELECT status INTO v_status FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_status NOT IN ('ACCEPTEE', 'PLANIFIEE') THEN
    RAISE EXCEPTION 'Transition invalide : % → PLANIFIEE', v_status;
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

-- DÉMARRER trajet (PLANIFIEE → EN_ROUTE)
CREATE OR REPLACE FUNCTION rpc_start_travel(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT check_transition_permission(_mission_id) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  SELECT status INTO v_status FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_status != 'PLANIFIEE' THEN
    RAISE EXCEPTION 'Transition invalide : % → EN_ROUTE', v_status;
  END IF;

  UPDATE missions
  SET status = 'EN_ROUTE', updated_at = now()
  WHERE id = _mission_id;

  PERFORM log_mission_workflow(_mission_id, v_status, 'EN_ROUTE', 'tech_started_travel');
END;$$;

-- DÉMARRER intervention (EN_ROUTE → EN_INTERVENTION)
CREATE OR REPLACE FUNCTION rpc_start_intervention(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
  v_report_exists boolean;
BEGIN
  IF NOT check_transition_permission(_mission_id) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  SELECT status INTO v_status FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_status NOT IN ('EN_ROUTE', 'ACCEPTEE') THEN
    RAISE EXCEPTION 'Transition invalide : % → EN_INTERVENTION', v_status;
  END IF;

  -- Vérifier si rapport existe
  SELECT EXISTS(SELECT 1 FROM intervention_reports WHERE mission_id = _mission_id)
  INTO v_report_exists;

  -- Si pas de rapport, il sera créé par le trigger

  UPDATE missions
  SET
    status = 'EN_INTERVENTION',
    report_status = 'A_COMPLETER',
    updated_at = now()
  WHERE id = _mission_id;

  PERFORM log_mission_workflow(_mission_id, v_status, 'EN_INTERVENTION', 'intervention_started');

  IF NOT v_report_exists THEN
    PERFORM log_report_status(_mission_id, NULL, 'A_COMPLETER', NULL, 'auto_created_on_start');
  END IF;
END;$$;

-- METTRE EN PAUSE (EN_INTERVENTION → EN_PAUSE)
CREATE OR REPLACE FUNCTION rpc_pause_mission(
  _mission_id uuid,
  _pause_reason pause_reason,
  _pause_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT check_transition_permission(_mission_id) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  SELECT status INTO v_status FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_status != 'EN_INTERVENTION' THEN
    RAISE EXCEPTION 'Transition invalide : % → EN_PAUSE', v_status;
  END IF;

  UPDATE missions
  SET
    status = 'EN_PAUSE',
    pause_reason = _pause_reason,
    pause_note = _pause_note,
    updated_at = now()
  WHERE id = _mission_id;

  PERFORM log_mission_workflow(
    _mission_id,
    v_status,
    'EN_PAUSE',
    format('pause:%s:%s', _pause_reason::text, COALESCE(_pause_note, ''))
  );
END;$$;

-- REPRENDRE après pause (EN_PAUSE → EN_INTERVENTION)
CREATE OR REPLACE FUNCTION rpc_resume_from_pause(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT check_transition_permission(_mission_id) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  SELECT status INTO v_status FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_status != 'EN_PAUSE' THEN
    RAISE EXCEPTION 'Transition invalide : % → EN_INTERVENTION', v_status;
  END IF;

  UPDATE missions
  SET
    status = 'EN_INTERVENTION',
    pause_reason = NULL,
    pause_note = NULL,
    updated_at = now()
  WHERE id = _mission_id;

  PERFORM log_mission_workflow(_mission_id, v_status, 'EN_INTERVENTION', 'resumed_from_pause');
END;$$;

-- TERMINER intervention (EN_INTERVENTION → TERMINEE)
CREATE OR REPLACE FUNCTION rpc_complete_intervention(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
  v_report_status report_status;
  v_is_sal boolean;
  v_new_report_status report_status;
BEGIN
  IF NOT check_transition_permission(_mission_id) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  SELECT status, report_status INTO v_status, v_report_status
  FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_status NOT IN ('EN_INTERVENTION', 'EN_PAUSE') THEN
    RAISE EXCEPTION 'Transition invalide : % → TERMINEE', v_status;
  END IF;

  -- VALIDATION BLOQUANTE : checklist complète
  IF NOT validate_report_completion(_mission_id) THEN
    RAISE EXCEPTION 'Checklist incomplète (signatures/photos manquantes)';
  END IF;

  -- Déterminer si SAL ou ST
  SELECT is_user_sal() INTO v_is_sal;

  -- SAL → AUTO_VALIDE, ST → A_VALIDER
  v_new_report_status := CASE WHEN v_is_sal THEN 'AUTO_VALIDE'::report_status ELSE 'A_VALIDER'::report_status END;

  UPDATE missions
  SET
    status = 'TERMINEE',
    report_status = 'SOUMIS',
    finished_at = now(),
    updated_at = now()
  WHERE id = _mission_id;

  PERFORM log_mission_workflow(_mission_id, v_status, 'TERMINEE', 'intervention_completed');
  PERFORM log_report_status(_mission_id, v_report_status, 'SOUMIS'::report_status, NULL, 'auto_on_complete');

  -- Auto-validation SAL ou attente admin ST
  UPDATE missions SET report_status = v_new_report_status WHERE id = _mission_id;
  PERFORM log_report_status(
    _mission_id,
    'SOUMIS'::report_status,
    v_new_report_status,
    NULL,
    CASE WHEN v_is_sal THEN 'auto_valide_sal' ELSE 'awaiting_admin_validation' END
  );
END;$$;

-- VALIDER rapport admin (A_VALIDER → VALIDE)
CREATE OR REPLACE FUNCTION rpc_validate_report(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report_status report_status;
  v_billing_status billing_status;
BEGIN
  -- Seuls admin/manager peuvent valider
  IF current_user_role() NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Permission refusée : seuls admin/manager peuvent valider';
  END IF;

  SELECT report_status, billing_status
  INTO v_report_status, v_billing_status
  FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_report_status NOT IN ('A_VALIDER', 'AUTO_VALIDE', 'SOUMIS') THEN
    RAISE EXCEPTION 'Rapport non validable : état %', v_report_status;
  END IF;

  UPDATE missions
  SET report_status = 'VALIDE', updated_at = now()
  WHERE id = _mission_id;

  PERFORM log_report_status(_mission_id, v_report_status, 'VALIDE'::report_status, NULL, 'validated_by_admin');

  -- Si non facturable → passer FACTURABLE
  IF v_billing_status = 'NON_FACTURABLE' THEN
    UPDATE missions SET billing_status = 'FACTURABLE' WHERE id = _mission_id;
    PERFORM log_billing_status(_mission_id, v_billing_status, 'FACTURABLE'::billing_status, 'report_validated');
  END IF;
END;$$;

-- REJETER rapport (SOUMIS/A_VALIDER → A_COMPLETER)
CREATE OR REPLACE FUNCTION rpc_reject_report(
  _mission_id uuid,
  _rejection_reason rejection_reason,
  _details text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report_status report_status;
BEGIN
  IF current_user_role() NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  SELECT report_status INTO v_report_status
  FROM missions WHERE id = _mission_id FOR UPDATE;

  IF v_report_status NOT IN ('SOUMIS', 'A_VALIDER', 'AUTO_VALIDE') THEN
    RAISE EXCEPTION 'Rapport non rejetable : état %', v_report_status;
  END IF;

  UPDATE missions
  SET
    report_status = 'A_COMPLETER',
    status = 'EN_INTERVENTION',
    updated_at = now()
  WHERE id = _mission_id;

  PERFORM log_report_status(_mission_id, v_report_status, 'A_COMPLETER'::report_status, _rejection_reason, _details);
  PERFORM log_mission_workflow(_mission_id, 'TERMINEE', 'EN_INTERVENTION', format('report_rejected:%s', _rejection_reason::text));
END;$$;

-- =====================================================
-- 6) TRIGGERS ESSENTIELS
-- =====================================================

-- Trigger : Auto-création rapport
CREATE OR REPLACE FUNCTION trg_auto_create_report()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_template_id uuid;
  v_template_version int;
BEGIN
  IF NEW.status = 'EN_INTERVENTION' AND (OLD.status IS NULL OR OLD.status != 'EN_INTERVENTION') THEN
    IF NOT EXISTS (SELECT 1 FROM intervention_reports WHERE mission_id = NEW.id) THEN
      SELECT id, version INTO v_template_id, v_template_version
      FROM procedure_templates
      WHERE mission_type = COALESCE(NEW.type, 'generic')
        AND is_active = true
      ORDER BY version DESC
      LIMIT 1;

      INSERT INTO intervention_reports(mission_id, template_id, template_version)
      VALUES (NEW.id, v_template_id, v_template_version);

      NEW.template_id := v_template_id;
      NEW.template_version := v_template_version;
    END IF;
  END IF;

  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS auto_create_report ON missions;
CREATE TRIGGER auto_create_report
  BEFORE UPDATE OF status ON missions
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_create_report();

-- Trigger : closed_at
CREATE OR REPLACE FUNCTION trg_mark_closed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_closed boolean;
BEGIN
  v_is_closed := (
    NEW.status = 'TERMINEE'
    AND (NEW.report_status = 'VALIDE' OR NEW.report_status = 'AUTO_VALIDE')
    AND NEW.billing_status = 'PAYEE'
  );

  IF v_is_closed = true AND NEW.closed_at IS NULL THEN
    NEW.closed_at := now();
  END IF;

  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS mark_closed_at ON missions;
CREATE TRIGGER mark_closed_at
  BEFORE UPDATE ON missions
  FOR EACH ROW
  WHEN (
    NEW.status = 'TERMINEE'
    OR NEW.report_status IN ('VALIDE', 'AUTO_VALIDE')
    OR NEW.billing_status = 'PAYEE'
  )
  EXECUTE FUNCTION trg_mark_closed_at();

-- =====================================================
-- 7) RLS POLICIES
-- =====================================================

ALTER TABLE mission_workflow_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY logs_admin_read ON mission_workflow_log
  FOR SELECT
  USING (current_user_role() IN ('admin', 'manager'));

CREATE POLICY logs_admin_read ON report_status_log
  FOR SELECT
  USING (current_user_role() IN ('admin', 'manager'));

CREATE POLICY logs_admin_read ON billing_status_log
  FOR SELECT
  USING (current_user_role() IN ('admin', 'manager'));

CREATE POLICY logs_tech_read ON mission_workflow_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_id
      AND m.assigned_user_id = current_user_id()
    )
  );

CREATE POLICY invoices_admin_all ON invoices
  USING (current_user_role() IN ('admin', 'manager'))
  WITH CHECK (current_user_role() IN ('admin', 'manager'));