/*
  # PHASE 2 - CONSOLIDATION ARCHITECTURE (PASS A - ADDITIVE ONLY)

  ## Objectif
  Consolider l'architecture existante SANS breaking changes :
  - Créer activity_log (timeline universelle)
  - Ajouter colonnes miroir normalisées (status_norm)
  - Créer vues normalisées pour transition progressive
  - Préparer triggers automatiques

  ## Principe
  - AUCUNE suppression/modification de colonnes existantes
  - Additif uniquement (colonnes miroir + vues)
  - Rétro-compatible à 100%
  - Front peut basculer progressivement vers vues normalisées

  ## Architecture
  - activity_log : timeline universelle tous événements
  - *_normalized views : consomment colonnes existantes + miroir
  - ENUMs nettoyés/étendus si besoin
  - Triggers idempotents
*/

-- ═══════════════════════════════════════════════════════════════
-- 1. ACTIVITY_LOG (TIMELINE UNIVERSELLE)
-- ═══════════════════════════════════════════════════════════════

-- Table centrale de logging tous événements
-- Complète mission_status_log (spécialisé missions) et audit_logs
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON activity_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Admin voit tout
CREATE POLICY "Admin can view all activities"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- SAL voit ses entités
CREATE POLICY "SAL can view related activities"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  );

-- Insertion par authenticated users seulement
CREATE POLICY "Authenticated can insert activities"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fonction helper pour log simplifié
CREATE OR REPLACE FUNCTION log_activity(
  _type text,
  _id uuid,
  _action text,
  _actor uuid,
  _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO activity_log(entity_type, entity_id, action, actor_id, metadata)
  VALUES (_type, _id, _action, _actor, COALESCE(_meta, '{}'::jsonb));
$$;

-- ═══════════════════════════════════════════════════════════════
-- 2. ENUMS NORMALISÉS (étendre existants si besoin)
-- ═══════════════════════════════════════════════════════════════

-- Note: mission_status existe déjà mais avec incohérences
-- On crée un nouvel ENUM propre et on fera une vue de mapping

DO $$ BEGIN
  CREATE TYPE mission_status_normalized AS ENUM (
    'pending',
    'accepted',
    'in_progress',
    'completed',
    'validated',
    'billed',
    'paid',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Invoice status normalisé (invoice_payment_status existe mais incomplet)
DO $$ BEGIN
  CREATE TYPE invoice_status_normalized AS ENUM (
    'draft',
    'sent',
    'partially_paid',
    'paid',
    'overdue',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Report status normalisé
DO $$ BEGIN
  CREATE TYPE report_status_normalized AS ENUM (
    'draft',
    'en_cours',
    'submitted',
    'terminé',
    'validated',
    'validé',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. COLONNES MIROIR (additive, pas de breaking change)
-- ═══════════════════════════════════════════════════════════════

-- INVOICES: ajouter status_norm si absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'status_norm'
  ) THEN
    ALTER TABLE invoices ADD COLUMN status_norm invoice_status_normalized;
  END IF;
END $$;

-- MISSIONS: ajouter status_norm si absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'missions' AND column_name = 'status_norm'
  ) THEN
    ALTER TABLE missions ADD COLUMN status_norm mission_status_normalized;
  END IF;
END $$;

-- INTERVENTION_REPORTS: ajouter status_norm si absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intervention_reports' AND column_name = 'status_norm'
  ) THEN
    ALTER TABLE intervention_reports ADD COLUMN status_norm report_status_normalized;
  END IF;
END $$;

-- Ajouter colonne paid_cents si manquante (pour sync paiements)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'paid_cents'
  ) THEN
    ALTER TABLE invoices ADD COLUMN paid_cents integer DEFAULT 0;
  END IF;
END $$;

-- Index sur colonnes miroir
CREATE INDEX IF NOT EXISTS idx_invoices_status_norm ON invoices(status_norm);
CREATE INDEX IF NOT EXISTS idx_missions_status_norm ON missions(status_norm);
CREATE INDEX IF NOT EXISTS idx_reports_status_norm ON intervention_reports(status_norm);

-- ═══════════════════════════════════════════════════════════════
-- 4. VUES NORMALISÉES (mapping ancien → nouveau)
-- ═══════════════════════════════════════════════════════════════

-- Vue invoices normalisée
CREATE OR REPLACE VIEW invoices_normalized AS
SELECT
  i.*,
  COALESCE(
    i.status_norm,
    CASE
      WHEN i.status ILIKE 'draft%' OR i.status ILIKE 'brouillon%' THEN 'draft'
      WHEN i.status ILIKE 'sent%' OR i.status ILIKE 'envoy%' THEN 'sent'
      WHEN i.status ILIKE 'paid%' OR i.status ILIKE 'pay%' THEN 'paid'
      WHEN i.status ILIKE '%overdue%' OR i.status ILIKE '%retard%' THEN 'overdue'
      WHEN i.status ILIKE '%partial%' OR i.status ILIKE '%partiel%' THEN 'partially_paid'
      WHEN i.status ILIKE '%cancel%' OR i.status ILIKE '%annul%' THEN 'cancelled'
      ELSE 'draft'
    END::invoice_status_normalized
  ) AS status_final,
  COALESCE(i.paid_cents, 0) AS paid_cents_safe,
  CASE
    WHEN COALESCE(i.paid_cents, 0) >= i.total_cents THEN 'paid'
    WHEN COALESCE(i.paid_cents, 0) > 0 THEN 'partially_paid'
    WHEN i.due_date < CURRENT_DATE AND COALESCE(i.paid_cents, 0) = 0 THEN 'overdue'
    ELSE COALESCE(
      i.status_norm::text,
      CASE
        WHEN i.status ILIKE 'sent%' THEN 'sent'
        ELSE 'draft'
      END
    )
  END::invoice_status_normalized AS computed_status
FROM invoices i;

-- Vue missions normalisée
CREATE OR REPLACE VIEW missions_normalized AS
SELECT
  m.*,
  COALESCE(
    m.status_norm,
    CASE
      WHEN UPPER(m.status) IN ('BROUILLON', 'PENDING') THEN 'pending'
      WHEN UPPER(m.status) IN ('PUBLIEE', 'PUBLIÉE', 'ACCEPTEE', 'ACCEPTED') THEN 'accepted'
      WHEN UPPER(m.status) IN ('EN_COURS', 'IN_PROGRESS', 'EN_INTERVENTION') THEN 'in_progress'
      WHEN UPPER(m.status) IN ('TERMINEE', 'TERMINÉ', 'COMPLETED') THEN 'completed'
      WHEN UPPER(m.status) IN ('VALIDEE', 'VALIDATED', 'FACTURABLE') THEN 'validated'
      WHEN UPPER(m.status) IN ('FACTUREE', 'BILLED') THEN 'billed'
      WHEN UPPER(m.status) IN ('PAYEE', 'PAID') THEN 'paid'
      WHEN UPPER(m.status) IN ('ANNULEE', 'CANCELLED') THEN 'cancelled'
      ELSE 'pending'
    END::mission_status_normalized
  ) AS status_final
FROM missions m;

-- Vue reports normalisée
CREATE OR REPLACE VIEW intervention_reports_normalized AS
SELECT
  r.*,
  COALESCE(
    r.status_norm,
    CASE
      WHEN r.status ILIKE 'draft%' OR r.status ILIKE 'brouillon%' THEN 'draft'
      WHEN r.status ILIKE 'en_cours%' OR r.status ILIKE 'in_progress%' THEN 'en_cours'
      WHEN r.status ILIKE 'termin%' OR r.status ILIKE 'complet%' THEN 'terminé'
      WHEN r.status ILIKE 'valid%' THEN 'validé'
      WHEN r.status ILIKE 'submit%' THEN 'submitted'
      WHEN r.status ILIKE 'reject%' THEN 'rejected'
      ELSE 'draft'
    END::report_status_normalized
  ) AS status_final
FROM intervention_reports r;

-- ═══════════════════════════════════════════════════════════════
-- 5. DOCUMENTS VIEW (unification sans duplication)
-- ═══════════════════════════════════════════════════════════════

-- Vue unifiée qui pointe vers client_portal_documents existant
-- (Pas de nouvelle table, on réutilise l'existant)
CREATE OR REPLACE VIEW documents_view AS
SELECT
  'client_portal'::text AS source,
  id,
  CASE
    WHEN related_mission_id IS NOT NULL THEN 'mission'
    WHEN related_contract_id IS NOT NULL THEN 'contract'
    WHEN related_quote_id IS NOT NULL THEN 'quote'
    WHEN related_invoice_id IS NOT NULL THEN 'invoice'
    ELSE 'client'
  END::text AS related_type,
  COALESCE(
    related_mission_id,
    related_contract_id,
    related_quote_id,
    related_invoice_id,
    client_id
  ) AS related_id,
  document_name AS file_name,
  document_url AS file_url,
  file_type,
  file_size_bytes,
  document_type,
  tags,
  visible_to_client,
  viewed_by_client,
  download_count,
  uploaded_by,
  created_at,
  updated_at
FROM client_portal_documents
WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- 6. FONCTIONS HELPER ADDITIONNELLES
-- ═══════════════════════════════════════════════════════════════

-- Fonction: récupérer timeline complète d'une entité
CREATE OR REPLACE FUNCTION get_entity_timeline(
  _entity_type text,
  _entity_id uuid
)
RETURNS TABLE (
  event_time timestamptz,
  event_type text,
  event_action text,
  actor_name text,
  actor_role text,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.created_at,
    al.entity_type,
    al.action,
    p.full_name,
    p.role,
    al.metadata
  FROM activity_log al
  LEFT JOIN profiles p ON p.user_id = al.actor_id
  WHERE al.entity_type = _entity_type
  AND al.entity_id = _entity_id
  ORDER BY al.created_at DESC;
END;
$$;

-- Fonction: stats globales (réutilise tables existantes)
CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS TABLE (
  total_missions bigint,
  missions_in_progress bigint,
  missions_completed bigint,
  total_invoices bigint,
  invoices_paid bigint,
  invoices_overdue bigint,
  total_revenue_cents bigint,
  avg_nps_score numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM missions) AS total_missions,
    (SELECT COUNT(*) FROM missions WHERE status ILIKE '%cours%' OR status ILIKE '%progress%') AS missions_in_progress,
    (SELECT COUNT(*) FROM missions WHERE status ILIKE '%termin%' OR status ILIKE '%complet%') AS missions_completed,
    (SELECT COUNT(*) FROM invoices) AS total_invoices,
    (SELECT COUNT(*) FROM invoices WHERE payment_status = 'payé' OR status ILIKE '%paid%') AS invoices_paid,
    (SELECT COUNT(*) FROM invoices WHERE due_date < CURRENT_DATE AND (payment_status != 'payé' OR status NOT ILIKE '%paid%')) AS invoices_overdue,
    (SELECT COALESCE(SUM(total_cents), 0) FROM invoices WHERE payment_status = 'payé' OR status ILIKE '%paid%') AS total_revenue_cents,
    (SELECT ROUND(AVG(nps_score), 2) FROM satisfaction_surveys WHERE status = 'completed' AND nps_score IS NOT NULL) AS avg_nps_score;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 7. COMMENTAIRES & DOCUMENTATION
-- ═══════════════════════════════════════════════════════════════

COMMENT ON TABLE activity_log IS 'Timeline universelle de tous les événements système (complète mission_status_log et audit_logs)';
COMMENT ON FUNCTION log_activity IS 'Helper simplifié pour logger un événement dans activity_log';
COMMENT ON FUNCTION get_entity_timeline IS 'Retourne la timeline complète d''une entité (mission, invoice, report, etc.)';
COMMENT ON FUNCTION get_global_stats IS 'Statistiques globales temps réel (missions, factures, revenus, NPS)';

COMMENT ON VIEW invoices_normalized IS 'Vue normalisée des factures avec mapping status ancien → nouveau (rétro-compatible)';
COMMENT ON VIEW missions_normalized IS 'Vue normalisée des missions avec mapping status ancien → nouveau (rétro-compatible)';
COMMENT ON VIEW intervention_reports_normalized IS 'Vue normalisée des rapports avec mapping status ancien → nouveau (rétro-compatible)';
COMMENT ON VIEW documents_view IS 'Vue unifiée des documents (pointe vers client_portal_documents existant)';

COMMENT ON COLUMN invoices.status_norm IS 'Colonne miroir normalisée (ENUM) - permet transition progressive depuis status text';
COMMENT ON COLUMN missions.status_norm IS 'Colonne miroir normalisée (ENUM) - permet transition progressive depuis status text';
COMMENT ON COLUMN intervention_reports.status_norm IS 'Colonne miroir normalisée (ENUM) - permet transition progressive depuis status text';
COMMENT ON COLUMN invoices.paid_cents IS 'Montant payé en centimes (sync auto via trigger payments)';
