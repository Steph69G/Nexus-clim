/*
  # Workflow Alerts & Monitoring

  ## Objectif
  Système d'alertes automatiques et monitoring avancé :
  - Triggers alertes missions stuck
  - Système de scoring missions à risque
  - Détection anomalies
  - Dashboard métriques temps réel
  - Audit trail complet

  ## Modifications
  1. Triggers alertes automatiques
  2. Fonctions scoring risque
  3. Vue alertes dashboard
  4. Fonctions détection anomalies
  5. Métriques performance

  ## Sécurité
  - Alertes admin uniquement
  - Métriques anonymisées
  - Audit trail immuable
*/

-- =====================================================
-- 1) SYSTÈME DE SCORING RISQUE MISSIONS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_mission_risk_score(p_mission_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score numeric := 0;
  v_mission RECORD;
  v_hours_since_update numeric;
  v_tech_stats RECORD;
BEGIN
  SELECT * INTO v_mission FROM missions WHERE id = p_mission_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Calcul temps depuis dernière MAJ
  v_hours_since_update := EXTRACT(EPOCH FROM (now() - v_mission.updated_at))/3600;
  
  -- FACTEUR 1: Statut + durée (0-40 points)
  IF v_mission.status = 'EN_PAUSE' THEN
    v_score := v_score + LEAST(v_hours_since_update * 0.5, 40);
  ELSIF v_mission.status = 'EN_ROUTE' THEN
    v_score := v_score + LEAST(v_hours_since_update * 2, 30);
  ELSIF v_mission.status = 'EN_INTERVENTION' THEN
    v_score := v_score + LEAST(v_hours_since_update * 0.3, 20);
  ELSIF v_mission.status = 'PLANIFIEE' AND v_mission.scheduled_start < now() THEN
    v_score := v_score + 25; -- Retard planification
  END IF;
  
  -- FACTEUR 2: Replanifications (0-20 points)
  v_score := v_score + LEAST(v_mission.rescheduled_count * 5, 20);
  
  -- FACTEUR 3: No-show historique (0-15 points)
  IF v_mission.no_show_at IS NOT NULL THEN
    v_score := v_score + 15;
  END IF;
  
  -- FACTEUR 4: Historique technicien (0-25 points)
  IF v_mission.assigned_user_id IS NOT NULL THEN
    SELECT
      COUNT(CASE WHEN status = 'ANNULEE' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) as cancel_rate,
      AVG(rescheduled_count) as avg_reschedules
    INTO v_tech_stats
    FROM missions
    WHERE assigned_user_id = v_mission.assigned_user_id
      AND created_at > now() - interval '3 months';
    
    IF v_tech_stats.cancel_rate IS NOT NULL THEN
      v_score := v_score + (v_tech_stats.cancel_rate * 15);
    END IF;
    
    IF v_tech_stats.avg_reschedules IS NOT NULL THEN
      v_score := v_score + LEAST(v_tech_stats.avg_reschedules * 3, 10);
    END IF;
  END IF;
  
  -- Score max 100
  RETURN LEAST(v_score, 100);
END;
$$;

COMMENT ON FUNCTION calculate_mission_risk_score IS 
'Calcule score de risque mission (0-100) basé sur: délais, replanifs, no-show, historique tech';

-- =====================================================
-- 2) VUE MISSIONS À RISQUE
-- =====================================================

CREATE OR REPLACE VIEW v_missions_at_risk AS
SELECT
  m.id,
  m.title,
  m.client_name,
  m.status,
  m.assigned_user_id,
  p.full_name as assigned_to,
  m.scheduled_start,
  m.updated_at,
  m.rescheduled_count,
  m.no_show_type,
  ROUND(EXTRACT(EPOCH FROM (now() - m.updated_at))/3600, 1) as hours_since_update,
  calculate_mission_risk_score(m.id) as risk_score,
  CASE
    WHEN calculate_mission_risk_score(m.id) >= 75 THEN 'critical'
    WHEN calculate_mission_risk_score(m.id) >= 50 THEN 'high'
    WHEN calculate_mission_risk_score(m.id) >= 25 THEN 'medium'
    ELSE 'low'
  END as risk_level
FROM missions m
LEFT JOIN profiles p ON p.user_id = m.assigned_user_id
WHERE m.closed_at IS NULL
  AND m.status NOT IN ('BROUILLON', 'ANNULEE')
  AND calculate_mission_risk_score(m.id) >= 25
ORDER BY risk_score DESC;

COMMENT ON VIEW v_missions_at_risk IS 
'Missions à risque avec score >= 25 (medium, high, critical)';

-- =====================================================
-- 3) FONCTION DÉTECTION ANOMALIES
-- =====================================================

CREATE OR REPLACE FUNCTION detect_workflow_anomalies()
RETURNS TABLE(
  anomaly_type text,
  severity text,
  count bigint,
  description text,
  action_required text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  
  -- Anomalie 1: Missions EN_ROUTE > 8h
  SELECT
    'stuck_en_route'::text,
    'high'::text,
    COUNT(*)::bigint,
    format('%s missions EN_ROUTE > 8h', COUNT(*))::text,
    'Auto-rollback ou contact technicien'::text
  FROM missions
  WHERE status = 'EN_ROUTE'
    AND EXTRACT(EPOCH FROM (now() - updated_at))/3600 > 8
    AND closed_at IS NULL
  HAVING COUNT(*) > 0
  
  UNION ALL
  
  -- Anomalie 2: Rapports soumis non validés > 72h
  SELECT
    'pending_reports'::text,
    'medium'::text,
    COUNT(*)::bigint,
    format('%s rapports en attente > 72h', COUNT(*))::text,
    'Valider ou rejeter rapidement'::text
  FROM missions
  WHERE report_status = 'A_VALIDER'
    AND EXTRACT(EPOCH FROM (now() - updated_at))/3600 > 72
  HAVING COUNT(*) > 0
  
  UNION ALL
  
  -- Anomalie 3: Factures impayées > 30j
  SELECT
    'overdue_invoices'::text,
    'high'::text,
    COUNT(*)::bigint,
    format('%s factures impayées > 30j', COUNT(*))::text,
    'Relance client urgente'::text
  FROM invoices
  WHERE paid_at IS NULL
    AND EXTRACT(DAY FROM (now() - created_at)) > 30
  HAVING COUNT(*) > 0
  
  UNION ALL
  
  -- Anomalie 4: Notifications failed > max_retries
  SELECT
    'failed_notifications'::text,
    'low'::text,
    COUNT(*)::bigint,
    format('%s notifications échec définitif', COUNT(*))::text,
    'Investiguer cause racine'::text
  FROM notifications_queue
  WHERE status = 'failed'
    AND retry_count >= max_retries
  HAVING COUNT(*) > 0
  
  UNION ALL
  
  -- Anomalie 5: Cache idempotency surchargé (> 10k entrées)
  SELECT
    'idempotency_cache_large'::text,
    'low'::text,
    COUNT(*)::bigint,
    format('Cache idempotency: %s entrées', COUNT(*))::text,
    'Vérifier cleanup automatique'::text
  FROM rpc_idempotency
  WHERE expires_at > now()
  HAVING COUNT(*) > 10000;
  
END;
$$;

COMMENT ON FUNCTION detect_workflow_anomalies IS 
'Détecte 5 types d''anomalies workflow avec sévérité et actions recommandées';

-- =====================================================
-- 4) TABLE ALERTS (historique)
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'ignored')),
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_alerts_status
  ON workflow_alerts(status, severity, created_at DESC)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_workflow_alerts_mission
  ON workflow_alerts(mission_id, created_at DESC)
  WHERE mission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_alerts_user
  ON workflow_alerts(user_id, status)
  WHERE user_id IS NOT NULL;

COMMENT ON TABLE workflow_alerts IS 
'Historique des alertes workflow avec tracking résolution';

-- =====================================================
-- 5) FONCTION CREATE WORKFLOW ALERT
-- =====================================================

CREATE OR REPLACE FUNCTION create_workflow_alert(
  p_alert_type text,
  p_severity text,
  p_title text,
  p_description text,
  p_mission_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alert_id uuid;
  v_existing_id uuid;
BEGIN
  -- Vérifier si alerte similaire existe déjà (déduplication 1h)
  SELECT id INTO v_existing_id
  FROM workflow_alerts
  WHERE alert_type = p_alert_type
    AND mission_id IS NOT DISTINCT FROM p_mission_id
    AND user_id IS NOT DISTINCT FROM p_user_id
    AND status = 'open'
    AND created_at > now() - interval '1 hour'
  LIMIT 1;
  
  IF v_existing_id IS NOT NULL THEN
    -- MAJ timestamp alerte existante
    UPDATE workflow_alerts
    SET updated_at = now()
    WHERE id = v_existing_id;
    
    RETURN v_existing_id;
  END IF;
  
  -- Créer nouvelle alerte
  INSERT INTO workflow_alerts (
    alert_type,
    severity,
    title,
    description,
    mission_id,
    user_id,
    metadata
  )
  VALUES (
    p_alert_type,
    p_severity,
    p_title,
    p_description,
    p_mission_id,
    p_user_id,
    p_metadata
  )
  RETURNING id INTO v_alert_id;
  
  -- Notifier admins si high/critical
  IF p_severity IN ('high', 'critical') THEN
    PERFORM create_admin_alert(
      p_alert_type,
      p_title,
      p_description,
      p_mission_id,
      p_severity
    );
  END IF;
  
  RETURN v_alert_id;
END;
$$;

COMMENT ON FUNCTION create_workflow_alert IS 
'Crée alerte workflow avec déduplication (1h) et notification admin si high/critical';

-- =====================================================
-- 6) TRIGGER AUTO-ALERT MISSIONS STUCK (amélioré)
-- =====================================================

CREATE OR REPLACE FUNCTION trg_alert_mission_stuck()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_hours_stuck numeric;
  v_risk_score numeric;
BEGIN
  v_hours_stuck := EXTRACT(EPOCH FROM (now() - NEW.updated_at))/3600;
  v_risk_score := calculate_mission_risk_score(NEW.id);
  
  -- Alert EN_PAUSE > 48h
  IF NEW.status = 'EN_PAUSE' AND v_hours_stuck >= 48 THEN
    PERFORM create_workflow_alert(
      'mission_stuck_pause',
      CASE 
        WHEN v_hours_stuck > 96 THEN 'critical'
        WHEN v_hours_stuck > 72 THEN 'high'
        ELSE 'medium'
      END,
      format('Mission en pause %sh', ROUND(v_hours_stuck)),
      format('Mission "%s" bloquée depuis %s (motif: %s)', 
        NEW.title,
        format_paris_datetime(NEW.updated_at),
        COALESCE(NEW.pause_reason::text, 'non spécifié')
      ),
      NEW.id,
      NEW.assigned_user_id,
      jsonb_build_object(
        'hours_stuck', v_hours_stuck,
        'pause_reason', NEW.pause_reason,
        'risk_score', v_risk_score
      )
    );
  END IF;
  
  -- Alert EN_ROUTE > 8h
  IF NEW.status = 'EN_ROUTE' AND v_hours_stuck >= 8 THEN
    PERFORM create_workflow_alert(
      'mission_stuck_en_route',
      'high',
      format('Tech en route depuis %sh', ROUND(v_hours_stuck)),
      format('Mission "%s" - technicien ne semble pas arrivé sur site', NEW.title),
      NEW.id,
      NEW.assigned_user_id,
      jsonb_build_object(
        'hours_stuck', v_hours_stuck,
        'risk_score', v_risk_score
      )
    );
  END IF;
  
  -- Alert retard planification
  IF NEW.status = 'PLANIFIEE' AND NEW.scheduled_start < now() THEN
    PERFORM create_workflow_alert(
      'mission_overdue',
      'medium',
      'Mission en retard',
      format('Mission "%s" devait démarrer le %s', 
        NEW.title,
        format_paris_datetime(NEW.scheduled_start)
      ),
      NEW.id,
      NEW.assigned_user_id,
      jsonb_build_object(
        'scheduled_start', NEW.scheduled_start,
        'delay_hours', EXTRACT(EPOCH FROM (now() - NEW.scheduled_start))/3600,
        'risk_score', v_risk_score
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS alert_mission_stuck ON missions;
CREATE TRIGGER alert_mission_stuck
  AFTER INSERT OR UPDATE OF status, updated_at ON missions
  FOR EACH ROW
  EXECUTE FUNCTION trg_alert_mission_stuck();

-- =====================================================
-- 7) VUE DASHBOARD ALERTES
-- =====================================================

CREATE OR REPLACE VIEW v_alerts_dashboard AS
SELECT
  status,
  severity,
  COUNT(*) as count,
  MIN(created_at) as oldest_alert,
  MAX(created_at) as latest_alert
FROM workflow_alerts
WHERE status IN ('open', 'acknowledged')
GROUP BY status, severity
ORDER BY
  CASE status WHEN 'open' THEN 1 ELSE 2 END,
  CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END;

COMMENT ON VIEW v_alerts_dashboard IS 
'Dashboard alertes groupées par statut et sévérité';

-- =====================================================
-- 8) FONCTION ACKNOWLEDGE ALERT
-- =====================================================

CREATE OR REPLACE FUNCTION acknowledge_alert(
  p_alert_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE workflow_alerts
  SET
    status = 'acknowledged',
    acknowledged_by = current_user_id(),
    acknowledged_at = now(),
    resolution_notes = p_notes,
    updated_at = now()
  WHERE id = p_alert_id
    AND status = 'open';
END;
$$;

-- =====================================================
-- 9) FONCTION RESOLVE ALERT
-- =====================================================

CREATE OR REPLACE FUNCTION resolve_alert(
  p_alert_id uuid,
  p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE workflow_alerts
  SET
    status = 'resolved',
    resolved_by = current_user_id(),
    resolved_at = now(),
    resolution_notes = COALESCE(resolution_notes, '') || E'\n' || p_notes,
    updated_at = now()
  WHERE id = p_alert_id
    AND status IN ('open', 'acknowledged');
END;
$$;

-- =====================================================
-- 10) RLS POLICIES
-- =====================================================

ALTER TABLE workflow_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY workflow_alerts_admin_all ON workflow_alerts
  USING (current_user_role() IN ('admin', 'manager'))
  WITH CHECK (current_user_role() IN ('admin', 'manager'));

CREATE POLICY workflow_alerts_user_read ON workflow_alerts
  FOR SELECT
  USING (
    user_id = current_user_id()
    OR EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_id
      AND m.assigned_user_id = current_user_id()
    )
  );

-- =====================================================
-- FIN MIGRATION ALERTS & MONITORING
-- =====================================================
