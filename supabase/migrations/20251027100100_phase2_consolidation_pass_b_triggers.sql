/*
  # PHASE 2 - CONSOLIDATION (PASS B - TRIGGERS AUTOMATIQUES)

  ## Objectif
  Ajouter triggers automatiques pour synchronisation et workflows :
  - Paiements → mise à jour status facture
  - Rapport validé → génération PDF + email + enquête
  - Mission in_progress → création fiche intervention
  - Logging automatique dans activity_log

  ## Principe
  - Triggers IDEMPOTENTS (peuvent être re-run sans problème)
  - Additifs uniquement (n'empêchent pas code existant de fonctionner)
  - Utilisent colonnes miroir status_norm quand disponibles
  - Logs dans activity_log pour traçabilité

  ## Sécurité
  - Tous les triggers vérifient l'existence avant création
  - Gestion des cas NULL/absents
  - Pas de boucles infinies
*/

-- ═══════════════════════════════════════════════════════════════
-- 1. TRIGGER: PAIEMENTS → MAJ STATUS FACTURE
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_paid_cents integer;
  v_total_cents integer;
  v_new_status invoice_status_normalized;
BEGIN
  -- Calculer total payé pour cette facture
  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_paid_cents
  FROM payments
  WHERE invoice_id = NEW.invoice_id
  AND status = 'completed';

  -- Récupérer total facture
  SELECT total_cents
  INTO v_total_cents
  FROM invoices
  WHERE id = NEW.invoice_id;

  -- Déterminer nouveau status
  IF v_paid_cents >= v_total_cents THEN
    v_new_status := 'paid';
  ELSIF v_paid_cents > 0 THEN
    v_new_status := 'partially_paid';
  ELSE
    v_new_status := 'sent';
  END IF;

  -- Mettre à jour facture
  UPDATE invoices
  SET
    paid_cents = v_paid_cents,
    status_norm = v_new_status,
    paid_at = CASE WHEN v_new_status = 'paid' THEN now() ELSE paid_at END,
    updated_at = now()
  WHERE id = NEW.invoice_id;

  -- Logger l'événement
  PERFORM log_activity(
    'invoice',
    NEW.invoice_id,
    'payment_' || NEW.status::text,
    NEW.created_by,
    jsonb_build_object(
      'payment_id', NEW.id,
      'amount_cents', NEW.amount_cents,
      'paid_cents', v_paid_cents,
      'total_cents', v_total_cents,
      'new_status', v_new_status
    )
  );

  RETURN NEW;
END;
$$;

-- Créer trigger (DROP IF EXISTS pour idempotence)
DROP TRIGGER IF EXISTS trg_update_invoice_on_payment ON payments;
CREATE TRIGGER trg_update_invoice_on_payment
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_on_payment();

-- ═══════════════════════════════════════════════════════════════
-- 2. TRIGGER: RAPPORT VALIDÉ → ACTIONS AUTO
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION on_report_validated_extended()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_mission_rec record;
  v_survey_exists boolean;
BEGIN
  -- Seulement si passage à validé
  IF (NEW.status = 'validé' OR NEW.status_norm = 'validé')
     AND (OLD IS NULL OR OLD.status != 'validé' AND COALESCE(OLD.status_norm::text,'') != 'validé') THEN

    -- Récupérer infos mission
    SELECT * INTO v_mission_rec
    FROM missions
    WHERE id = NEW.mission_id;

    -- Logger validation
    PERFORM log_activity(
      'report',
      NEW.id,
      'validated',
      NEW.validated_by,
      jsonb_build_object(
        'mission_id', NEW.mission_id,
        'technician_id', NEW.technician_user_id
      )
    );

    -- Vérifier si enquête existe déjà
    SELECT EXISTS (
      SELECT 1 FROM satisfaction_surveys
      WHERE mission_id = NEW.mission_id
    ) INTO v_survey_exists;

    -- Créer enquête si pas déjà faite
    IF NOT v_survey_exists AND NEW.survey_sent = false THEN
      INSERT INTO satisfaction_surveys (
        mission_id,
        client_name,
        client_email,
        status,
        created_at
      ) VALUES (
        NEW.mission_id,
        v_mission_rec.client_name,
        COALESCE(v_mission_rec.client_email, 'noemail@example.com'),
        'pending',
        now()
      );

      -- Logger création enquête
      PERFORM log_activity(
        'survey',
        NEW.mission_id,
        'scheduled',
        NEW.validated_by,
        jsonb_build_object('report_id', NEW.id)
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Créer trigger (s'ajoute au trigger existant, ne le remplace pas)
DROP TRIGGER IF EXISTS trg_on_report_validated_extended ON intervention_reports;
CREATE TRIGGER trg_on_report_validated_extended
  AFTER UPDATE ON intervention_reports
  FOR EACH ROW
  EXECUTE FUNCTION on_report_validated_extended();

-- ═══════════════════════════════════════════════════════════════
-- 3. TRIGGER: MISSION IN_PROGRESS → CRÉER FICHE SI ABSENTE
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_report_on_mission_start()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_report_exists boolean;
  v_template_rec record;
  v_mission_type_name text;
BEGIN
  -- Seulement si passage à in_progress
  IF (NEW.status ILIKE '%cours%' OR NEW.status ILIKE '%progress%' OR NEW.status_norm = 'in_progress')
     AND (OLD IS NULL OR (OLD.status NOT ILIKE '%cours%' AND OLD.status NOT ILIKE '%progress%' AND COALESCE(OLD.status_norm::text,'') != 'in_progress')) THEN

    -- Vérifier si un rapport existe déjà
    SELECT EXISTS (
      SELECT 1 FROM intervention_reports
      WHERE mission_id = NEW.id
    ) INTO v_report_exists;

    -- Créer rapport si absent ET technicien assigné
    IF NOT v_report_exists AND NEW.assigned_user_id IS NOT NULL THEN

      -- Récupérer type mission
      SELECT it.name INTO v_mission_type_name
      FROM intervention_types it
      WHERE it.id = NEW.type_id;

      -- Trouver template approprié
      SELECT * INTO v_template_rec
      FROM procedure_templates
      WHERE is_active = true
      AND (
        (v_mission_type_name ILIKE '%maintenance%' AND mission_type LIKE '%Maintenance%')
        OR (v_mission_type_name ILIKE '%dépannage%' AND mission_type LIKE '%Dépannage%')
        OR (v_mission_type_name ILIKE '%installation%' AND mission_type LIKE '%Installation%')
        OR (v_mission_type_name ILIKE '%pac%' OR v_mission_type_name ILIKE '%split%' AND name LIKE '%PAC%')
      )
      LIMIT 1;

      -- Si pas de template spécifique, prendre le premier
      IF v_template_rec IS NULL THEN
        SELECT * INTO v_template_rec
        FROM procedure_templates
        WHERE is_active = true
        LIMIT 1;
      END IF;

      -- Créer le rapport
      IF v_template_rec IS NOT NULL THEN
        INSERT INTO intervention_reports (
          mission_id,
          procedure_template_id,
          technician_user_id,
          status,
          status_norm,
          started_at,
          client_name,
          intervention_address
        ) VALUES (
          NEW.id,
          v_template_rec.id,
          NEW.assigned_user_id,
          'en_cours',
          'en_cours',
          now(),
          NEW.client_name,
          COALESCE(NEW.address || ', ' || NEW.city, NEW.address, '')
        );

        -- Logger création
        PERFORM log_activity(
          'mission',
          NEW.id,
          'report_created',
          NEW.assigned_user_id,
          jsonb_build_object(
            'template_id', v_template_rec.id,
            'template_name', v_template_rec.name
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Créer trigger
DROP TRIGGER IF EXISTS trg_create_report_on_mission_start ON missions;
CREATE TRIGGER trg_create_report_on_mission_start
  AFTER INSERT OR UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION create_report_on_mission_start();

-- ═══════════════════════════════════════════════════════════════
-- 4. TRIGGER: LOG STATUS CHANGES AUTOMATIQUEMENT
-- ═══════════════════════════════════════════════════════════════

-- Trigger pour missions
CREATE OR REPLACE FUNCTION log_mission_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si status a changé
  IF OLD.status IS DISTINCT FROM NEW.status
     OR COALESCE(OLD.status_norm::text,'') IS DISTINCT FROM COALESCE(NEW.status_norm::text,'') THEN

    PERFORM log_activity(
      'mission',
      NEW.id,
      'status_changed',
      NEW.assigned_user_id,
      jsonb_build_object(
        'from_status', OLD.status,
        'to_status', NEW.status,
        'from_status_norm', OLD.status_norm,
        'to_status_norm', NEW.status_norm
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_mission_status_change ON missions;
CREATE TRIGGER trg_log_mission_status_change
  AFTER UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION log_mission_status_change();

-- Trigger pour invoices
CREATE OR REPLACE FUNCTION log_invoice_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     OR COALESCE(OLD.status_norm::text,'') IS DISTINCT FROM COALESCE(NEW.status_norm::text,'') THEN

    PERFORM log_activity(
      'invoice',
      NEW.id,
      'status_changed',
      NEW.created_by_user_id,
      jsonb_build_object(
        'from_status', OLD.status,
        'to_status', NEW.status,
        'from_status_norm', OLD.status_norm,
        'to_status_norm', NEW.status_norm
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_invoice_status_change ON invoices;
CREATE TRIGGER trg_log_invoice_status_change
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_invoice_status_change();

-- ═══════════════════════════════════════════════════════════════
-- 5. TRIGGER: BACKFILL STATUS_NORM (one-time, idempotent)
-- ═══════════════════════════════════════════════════════════════

-- Fonction de backfill pour invoices
CREATE OR REPLACE FUNCTION backfill_invoice_status_norm()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE invoices
  SET status_norm = CASE
    WHEN status ILIKE 'draft%' OR status ILIKE 'brouillon%' THEN 'draft'
    WHEN status ILIKE 'sent%' OR status ILIKE 'envoy%' THEN 'sent'
    WHEN status ILIKE 'paid%' OR status ILIKE 'pay%' THEN 'paid'
    WHEN status ILIKE '%overdue%' OR status ILIKE '%retard%' THEN 'overdue'
    WHEN status ILIKE '%partial%' OR status ILIKE '%partiel%' THEN 'partially_paid'
    WHEN status ILIKE '%cancel%' OR status ILIKE '%annul%' THEN 'cancelled'
    ELSE 'draft'
  END::invoice_status_normalized
  WHERE status_norm IS NULL;

  RAISE NOTICE 'Backfilled % invoices', (SELECT COUNT(*) FROM invoices WHERE status_norm IS NOT NULL);
END;
$$;

-- Fonction de backfill pour missions
CREATE OR REPLACE FUNCTION backfill_mission_status_norm()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE missions
  SET status_norm = CASE
    WHEN UPPER(status) IN ('BROUILLON', 'PENDING') THEN 'pending'
    WHEN UPPER(status) IN ('PUBLIEE', 'PUBLIÉE', 'ACCEPTEE', 'ACCEPTED') THEN 'accepted'
    WHEN UPPER(status) IN ('EN_COURS', 'IN_PROGRESS', 'EN_INTERVENTION') THEN 'in_progress'
    WHEN UPPER(status) IN ('TERMINEE', 'TERMINÉ', 'COMPLETED') THEN 'completed'
    WHEN UPPER(status) IN ('VALIDEE', 'VALIDATED', 'FACTURABLE') THEN 'validated'
    WHEN UPPER(status) IN ('FACTUREE', 'BILLED') THEN 'billed'
    WHEN UPPER(status) IN ('PAYEE', 'PAID') THEN 'paid'
    WHEN UPPER(status) IN ('ANNULEE', 'CANCELLED') THEN 'cancelled'
    ELSE 'pending'
  END::mission_status_normalized
  WHERE status_norm IS NULL;

  RAISE NOTICE 'Backfilled % missions', (SELECT COUNT(*) FROM missions WHERE status_norm IS NOT NULL);
END;
$$;

-- Fonction de backfill pour reports
CREATE OR REPLACE FUNCTION backfill_report_status_norm()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE intervention_reports
  SET status_norm = CASE
    WHEN status ILIKE 'draft%' OR status ILIKE 'brouillon%' THEN 'draft'
    WHEN status ILIKE 'en_cours%' OR status ILIKE 'in_progress%' THEN 'en_cours'
    WHEN status ILIKE 'termin%' OR status ILIKE 'complet%' THEN 'terminé'
    WHEN status ILIKE 'valid%' THEN 'validé'
    WHEN status ILIKE 'submit%' THEN 'submitted'
    WHEN status ILIKE 'reject%' THEN 'rejected'
    ELSE 'draft'
  END::report_status_normalized
  WHERE status_norm IS NULL;

  RAISE NOTICE 'Backfilled % reports', (SELECT COUNT(*) FROM intervention_reports WHERE status_norm IS NOT NULL);
END;
$$;

-- Exécuter backfills (safe, idempotent)
SELECT backfill_invoice_status_norm();
SELECT backfill_mission_status_norm();
SELECT backfill_report_status_norm();

-- ═══════════════════════════════════════════════════════════════
-- 6. COMMENTAIRES
-- ═══════════════════════════════════════════════════════════════

COMMENT ON FUNCTION update_invoice_on_payment() IS 'Trigger: met à jour paid_cents et status_norm facture après paiement';
COMMENT ON FUNCTION on_report_validated_extended() IS 'Trigger: actions auto après validation rapport (enquête, logs)';
COMMENT ON FUNCTION create_report_on_mission_start() IS 'Trigger: crée rapport d''intervention auto quand mission → in_progress';
COMMENT ON FUNCTION log_mission_status_change() IS 'Trigger: log automatique changements status missions dans activity_log';
COMMENT ON FUNCTION log_invoice_status_change() IS 'Trigger: log automatique changements status factures dans activity_log';

COMMENT ON FUNCTION backfill_invoice_status_norm() IS 'Fonction one-time: backfill status_norm depuis status text existant (invoices)';
COMMENT ON FUNCTION backfill_mission_status_norm() IS 'Fonction one-time: backfill status_norm depuis status text existant (missions)';
COMMENT ON FUNCTION backfill_report_status_norm() IS 'Fonction one-time: backfill status_norm depuis status text existant (reports)';
