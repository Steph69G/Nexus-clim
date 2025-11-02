/*
  # Workflow V1 - Phase 1: Enums & Colonnes

  ## Objectif
  Ajouter les nouveaux types et colonnes pour le workflow 3-flux
  (Opérationnel, Qualité, Facturation) sans casser l'existant.

  ## Modifications
  1. Nouveaux enums : report_status, billing_status, pause_reason, annulation_reason, rejection_reason
  2. Ajout EN_PAUSE à mission_status existant
  3. Nouvelles colonnes missions : report_status, billing_status, pause_reason, annulation_reason, etc.
  4. Colonnes intervention_reports : template_version, signed_by_tech, signed_by_client
  5. Index de performance

  ## Sécurité
  - Valeurs par défaut conservatrices
  - Pas de suppression de colonnes existantes
  - Compatible avec données existantes
*/

-- =====================================================
-- 1) HELPER FUNCTION: Ajouter valeur enum de manière safe
-- =====================================================
CREATE OR REPLACE FUNCTION _enum_add_value_safe(_enum regtype, _value text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = _enum AND enumlabel = _value
  ) THEN
    EXECUTE format('ALTER TYPE %s ADD VALUE %L', _enum::text, _value);
  END IF;
END;$$;

-- =====================================================
-- 2) NOUVEAUX ENUMS
-- =====================================================

-- Report Status (Qualité)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE report_status AS ENUM (
      'A_COMPLETER',
      'SOUMIS',
      'A_VALIDER',
      'AUTO_VALIDE',
      'VALIDE'
    );
  END IF;
END $$;

-- Billing Status (Facturation)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_status') THEN
    CREATE TYPE billing_status AS ENUM (
      'NON_FACTURABLE',
      'FACTURABLE',
      'FACTUREE',
      'PAYEE',
      'AVOIR_PARTIEL',
      'AVOIR_TOTAL'
    );
  END IF;
END $$;

-- Pause Reason (motifs de pause normés)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pause_reason') THEN
    CREATE TYPE pause_reason AS ENUM (
      'client_absent',
      'acces_impossible',
      'pieces_manquantes',
      'securite',
      'contre_ordre'
    );
  END IF;
END $$;

-- Annulation Reason (motifs d'annulation)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'annulation_reason') THEN
    CREATE TYPE annulation_reason AS ENUM (
      'client_annule',
      'doublon',
      'erreur_saisie',
      'tech_indispo',
      'force_majeure'
    );
  END IF;
END $$;

-- Rejection Reason (motifs de rejet qualité)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rejection_reason') THEN
    CREATE TYPE rejection_reason AS ENUM (
      'photos_insuffisantes',
      'mesures_manquantes',
      'signature_manquante',
      'incoherence_rapport'
    );
  END IF;
END $$;

-- =====================================================
-- 3) AJOUT EN_PAUSE à l'enum mission_status existant
-- =====================================================
SELECT _enum_add_value_safe('mission_status'::regtype, 'EN_PAUSE');

-- =====================================================
-- 4) NOUVELLES COLONNES MISSIONS
-- =====================================================

-- Status des 3 flux
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS report_status report_status DEFAULT 'A_COMPLETER',
  ADD COLUMN IF NOT EXISTS billing_status billing_status DEFAULT 'NON_FACTURABLE';

-- Motifs normés
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS pause_reason pause_reason,
  ADD COLUMN IF NOT EXISTS pause_note text,
  ADD COLUMN IF NOT EXISTS annulation_reason annulation_reason,
  ADD COLUMN IF NOT EXISTS annulation_note text;

-- Template snapshot (version du template au moment de la création du rapport)
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES procedure_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_version int;

-- Parent mission (pour SAV / réouvertures)
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS parent_mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_sav_reopening boolean DEFAULT false;

-- Colonne calculated is_closed (remplace le statut CLOTUREE)
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS is_closed_calculated boolean GENERATED ALWAYS AS (
    status = 'TERMINEE'
    AND (report_status = 'VALIDE' OR report_status = 'AUTO_VALIDE')
    AND billing_status = 'PAYEE'
  ) STORED;

-- =====================================================
-- 5) COLONNES INTERVENTION_REPORTS
-- =====================================================

-- Template versioning
ALTER TABLE intervention_reports
  ADD COLUMN IF NOT EXISTS template_version int;

-- Signatures (flags booléens)
ALTER TABLE intervention_reports
  ADD COLUMN IF NOT EXISTS signed_by_tech boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS signed_by_client boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS signatures jsonb DEFAULT '{}'::jsonb;

-- Photos (si pas déjà là)
ALTER TABLE intervention_reports
  ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;

-- Data (réponses aux étapes)
ALTER TABLE intervention_reports
  ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;

-- Survey tracking
ALTER TABLE intervention_reports
  ADD COLUMN IF NOT EXISTS survey_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS survey_sent_at timestamptz;

-- =====================================================
-- 6) COLONNES PROCEDURE_TEMPLATES
-- =====================================================

-- Règles minimales par template
ALTER TABLE procedure_templates
  ADD COLUMN IF NOT EXISTS min_photos_avant int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_photos_apres int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS measures_schema jsonb DEFAULT '{}'::jsonb;

-- =====================================================
-- 7) INDEX DE PERFORMANCE
-- =====================================================

-- Missions : recherche par statuts combinés
CREATE INDEX IF NOT EXISTS idx_missions_workflow_status
  ON missions(status, report_status, billing_status)
  WHERE status NOT IN ('ANNULEE', 'CLOTUREE');

CREATE INDEX IF NOT EXISTS idx_missions_report_status
  ON missions(report_status)
  WHERE report_status IN ('SOUMIS', 'A_VALIDER');

CREATE INDEX IF NOT EXISTS idx_missions_billing_status
  ON missions(billing_status)
  WHERE billing_status IN ('FACTURABLE', 'FACTUREE');

-- Missions en pause (pour dashboard admin)
CREATE INDEX IF NOT EXISTS idx_missions_paused
  ON missions(status, pause_reason, updated_at)
  WHERE status = 'EN_PAUSE';

-- Parent/child missions (SAV)
CREATE INDEX IF NOT EXISTS idx_missions_parent
  ON missions(parent_mission_id)
  WHERE parent_mission_id IS NOT NULL;

-- Missions closes calculées
CREATE INDEX IF NOT EXISTS idx_missions_closed_calculated
  ON missions(is_closed_calculated, closed_at)
  WHERE is_closed_calculated = true;

-- Intervention reports : recherche par mission
CREATE INDEX IF NOT EXISTS idx_intervention_reports_mission
  ON intervention_reports(mission_id);

-- =====================================================
-- 8) VUES UTILITAIRES
-- =====================================================

-- Vue : Missions à clôturer (conditions remplies)
CREATE OR REPLACE VIEW v_missions_ready_to_close AS
SELECT
  m.id,
  m.title,
  m.status,
  m.report_status,
  m.billing_status,
  m.assigned_user_id,
  m.closed_at,
  m.is_closed_calculated
FROM missions m
WHERE m.status = 'TERMINEE'
  AND m.report_status IN ('VALIDE', 'AUTO_VALIDE')
  AND m.billing_status = 'PAYEE'
  AND m.is_closed_calculated = true
  AND m.closed_at IS NULL;

-- Vue : Rapports à valider (pour admin)
CREATE OR REPLACE VIEW v_reports_awaiting_validation AS
SELECT
  m.id as mission_id,
  m.title,
  m.client_name,
  m.assigned_user_id,
  m.status as mission_status,
  m.report_status,
  r.id as report_id,
  r.signed_by_tech,
  r.signed_by_client,
  jsonb_array_length(COALESCE(r.photos, '[]'::jsonb)) as photo_count,
  m.updated_at
FROM missions m
JOIN intervention_reports r ON r.mission_id = m.id
WHERE m.report_status IN ('SOUMIS', 'A_VALIDER')
ORDER BY m.updated_at ASC;

-- Vue : Missions en pause (dashboard alertes)
CREATE OR REPLACE VIEW v_missions_paused AS
SELECT
  m.id,
  m.title,
  m.client_name,
  m.assigned_user_id,
  m.pause_reason,
  m.pause_note,
  m.updated_at,
  EXTRACT(EPOCH FROM (NOW() - m.updated_at)) / 3600 as hours_paused
FROM missions m
WHERE m.status = 'EN_PAUSE'
ORDER BY m.updated_at ASC;

-- =====================================================
-- 9) FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction : Récupérer l'ID utilisateur courant
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'sub')::uuid,
    auth.uid()
  );
$$;

-- Fonction : Récupérer le rôle utilisateur courant
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role FROM profiles WHERE user_id = current_user_id()),
    'client'
  );
$$;

-- Fonction : Vérifier si user est SAL (salarié)
CREATE OR REPLACE FUNCTION is_user_sal(_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = COALESCE(_user_id, current_user_id())
    AND role = 'sal'
  );
$$;

-- Fonction : Vérifier si user est ST (sous-traitant)
CREATE OR REPLACE FUNCTION is_user_st(_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = COALESCE(_user_id, current_user_id())
    AND role = 'st'
  );
$$;

-- =====================================================
-- 10) COMMENTAIRES DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN missions.report_status IS 'Statut du flux Qualité (rapport d''intervention)';
COMMENT ON COLUMN missions.billing_status IS 'Statut du flux Facturation';
COMMENT ON COLUMN missions.pause_reason IS 'Motif normé de mise en pause';
COMMENT ON COLUMN missions.annulation_reason IS 'Motif normé d''annulation';
COMMENT ON COLUMN missions.is_closed_calculated IS 'Mission close = TERMINEE + VALIDE + PAYEE (calculé)';
COMMENT ON COLUMN missions.parent_mission_id IS 'Mission parente (pour SAV/réouvertures)';

COMMENT ON VIEW v_missions_ready_to_close IS 'Missions remplissant conditions de clôture mais pas encore marquées closed_at';
COMMENT ON VIEW v_reports_awaiting_validation IS 'Rapports d''intervention en attente validation admin';
COMMENT ON VIEW v_missions_paused IS 'Missions en pause avec durée écoulée';

-- =====================================================
-- NETTOYAGE
-- =====================================================
DROP FUNCTION IF EXISTS _enum_add_value_safe(regtype, text);
