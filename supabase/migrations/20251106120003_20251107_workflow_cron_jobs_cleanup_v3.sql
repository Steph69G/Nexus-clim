/*
  # Workflow Cron Jobs & Cleanup

  ## Objectif
  Ajouter fonctions de nettoyage automatique et monitoring :
  - Nettoyage idempotency expirée
  - Nettoyage notifications expirées
  - Détection missions bloquées (SLA)
  - Alertes automatiques
  - Stats quotidiennes

  ## Modifications
  1. Fonctions cleanup_expired_*
  2. Fonctions detect_stuck_missions
  3. Fonctions generate_daily_stats
  4. Vue monitoring dashboard
  5. Instructions pg_cron (dans README)

  ## Sécurité
  - Cleanup respecte RLS
  - Alertes admin uniquement
  - Stats anonymisées
*/

-- =====================================================
-- 1) FONCTION CLEANUP IDEMPOTENCY EXPIRÉE
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_idempotency()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count int;
  v_oldest_kept timestamptz;
BEGIN
  WITH deleted AS (
    DELETE FROM rpc_idempotency
    WHERE expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  SELECT MIN(created_at) INTO v_oldest_kept
  FROM rpc_idempotency;
  
  RETURN jsonb_build_object(
    'deleted_count', COALESCE(v_deleted_count, 0),
    'oldest_kept', v_oldest_kept,
    'cleaned_at', now()
  );
END;
$$;

COMMENT ON FUNCTION cleanup_expired_idempotency IS 
'Nettoie entrées idempotency expirées (> 24h). À exécuter quotidiennement via cron.';

-- =====================================================
-- 2) FONCTION CLEANUP NOTIFICATIONS EXPIRÉES
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count int;
  v_failed_count int;
  v_oldest_kept timestamptz;
BEGIN
  SELECT COUNT(*) INTO v_failed_count
  FROM notifications_queue
  WHERE expires_at < now() AND status = 'failed';
  
  WITH deleted AS (
    DELETE FROM notifications_queue
    WHERE expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  SELECT MIN(created_at) INTO v_oldest_kept
  FROM notifications_queue;
  
  RETURN jsonb_build_object(
    'deleted_count', COALESCE(v_deleted_count, 0),
    'failed_count', v_failed_count,
    'oldest_kept', v_oldest_kept,
    'cleaned_at', now()
  );
END;
$$;

COMMENT ON FUNCTION cleanup_expired_notifications IS 
'Nettoie notifications expirées (> 7j). À exécuter quotidiennement via cron.';

-- =====================================================
-- 3) FONCTION DETECT STUCK MISSIONS (SLA)
-- =====================================================

CREATE OR REPLACE FUNCTION detect_stuck_missions(
  p_threshold_hours int DEFAULT 48
)
RETURNS TABLE(
  mission_id uuid,
  status text,
  stuck_since timestamptz,
  hours_stuck numeric,
  assigned_user_id uuid,
  pause_reason text,
  client_name text,
  alert_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as mission_id,
    m.status::text,
    m.updated_at as stuck_since,
    ROUND(EXTRACT(EPOCH FROM (now() - m.updated_at))/3600, 1) as hours_stuck,
    m.assigned_user_id,
    m.pause_reason::text,
    m.client_name,
    CASE
      WHEN EXTRACT(EPOCH FROM (now() - m.updated_at))/3600 > 96 THEN 'critical'
      WHEN EXTRACT(EPOCH FROM (now() - m.updated_at))/3600 > 72 THEN 'high'
      WHEN EXTRACT(EPOCH FROM (now() - m.updated_at))/3600 > 48 THEN 'medium'
      ELSE 'low'
    END as alert_level
  FROM missions m
  WHERE
    m.status IN ('EN_PAUSE', 'EN_ROUTE', 'EN_INTERVENTION', 'PLANIFIEE')
    AND EXTRACT(EPOCH FROM (now() - m.updated_at))/3600 > p_threshold_hours
    AND m.closed_at IS NULL
  ORDER BY hours_stuck DESC;
END;
$$;

COMMENT ON FUNCTION detect_stuck_missions IS 
'Détecte missions bloquées au-delà du SLA (défaut: 48h). Retourne liste avec niveau alerte.';

-- =====================================================
-- 4) FONCTION AUTO-ROLLBACK EN_ROUTE STUCK (SLA)
-- =====================================================

CREATE OR REPLACE FUNCTION auto_rollback_stuck_en_route(
  p_threshold_hours int DEFAULT 8
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rollback_count int := 0;
  v_mission_ids uuid[];
  v_mission_id uuid;
BEGIN
  SELECT ARRAY_AGG(id) INTO v_mission_ids
  FROM missions
  WHERE status = 'EN_ROUTE'
    AND EXTRACT(EPOCH FROM (now() - updated_at))/3600 > p_threshold_hours
    AND closed_at IS NULL;
  
  IF v_mission_ids IS NOT NULL THEN
    FOREACH v_mission_id IN ARRAY v_mission_ids
    LOOP
      UPDATE missions
      SET 
        status = 'PLANIFIEE',
        updated_at = now()
      WHERE id = v_mission_id;
      
      PERFORM log_mission_workflow(
        v_mission_id,
        'EN_ROUTE',
        'PLANIFIEE',
        format('auto_rollback_sla_%sh', p_threshold_hours)
      );
      
      v_rollback_count := v_rollback_count + 1;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'rollback_count', v_rollback_count,
    'mission_ids', v_mission_ids,
    'threshold_hours', p_threshold_hours,
    'executed_at', now()
  );
END;
$$;

COMMENT ON FUNCTION auto_rollback_stuck_en_route IS 
'Rollback automatique missions EN_ROUTE > threshold vers PLANIFIEE (SLA protection).';

-- =====================================================
-- 5) FONCTION GENERATE DAILY STATS
-- =====================================================

CREATE OR REPLACE FUNCTION generate_daily_stats(
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'date', p_date,
    'missions', jsonb_build_object(
      'created', (SELECT COUNT(*) FROM missions WHERE DATE(created_at) = p_date),
      'published', (SELECT COUNT(*) FROM mission_workflow_log WHERE DATE(created_at) = p_date AND to_status = 'PUBLIEE'),
      'accepted', (SELECT COUNT(*) FROM mission_workflow_log WHERE DATE(created_at) = p_date AND to_status = 'ACCEPTEE'),
      'completed', (SELECT COUNT(*) FROM mission_workflow_log WHERE DATE(created_at) = p_date AND to_status = 'TERMINEE'),
      'cancelled', (SELECT COUNT(*) FROM mission_workflow_log WHERE DATE(created_at) = p_date AND to_status = 'ANNULEE')
    ),
    'reports', jsonb_build_object(
      'submitted', (SELECT COUNT(*) FROM report_status_log WHERE DATE(created_at) = p_date AND to_status = 'SOUMIS'),
      'validated', (SELECT COUNT(*) FROM report_status_log WHERE DATE(created_at) = p_date AND to_status = 'VALIDE'),
      'rejected', (SELECT COUNT(*) FROM report_status_log WHERE DATE(created_at) = p_date AND rejection_reason IS NOT NULL)
    ),
    'billing', jsonb_build_object(
      'invoiced', (SELECT COUNT(*) FROM invoices WHERE DATE(created_at) = p_date),
      'paid', (SELECT COUNT(*) FROM invoices WHERE DATE(paid_at) = p_date)
    ),
    'notifications', jsonb_build_object(
      'queued', (SELECT COUNT(*) FROM notifications_queue WHERE DATE(created_at) = p_date),
      'sent', (SELECT COUNT(*) FROM notifications_queue WHERE DATE(sent_at) = p_date),
      'failed', (SELECT COUNT(*) FROM notifications_queue WHERE DATE(processed_at) = p_date AND status = 'failed')
    ),
    'no_shows', jsonb_build_object(
      'client', (SELECT COUNT(*) FROM missions WHERE DATE(no_show_at) = p_date AND no_show_type = 'client'),
      'tech', (SELECT COUNT(*) FROM missions WHERE DATE(no_show_at) = p_date AND no_show_type = 'tech')
    ),
    'rescheduled', (SELECT COUNT(*) FROM mission_workflow_log 
                    WHERE DATE(created_at) = p_date 
                    AND reason LIKE 'rescheduled_%')
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$;

COMMENT ON FUNCTION generate_daily_stats IS 
'Génère statistiques quotidiennes (missions, rapports, facturation, notifications).';

-- =====================================================
-- 6) TABLE DAILY_STATS (cache)
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_stats (
  stat_date date PRIMARY KEY,
  stats jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date
  ON daily_stats(stat_date DESC);

COMMENT ON TABLE daily_stats IS 
'Cache des statistiques quotidiennes (refresh quotidien via cron)';

-- =====================================================
-- 7) FONCTION REFRESH DAILY STATS (upsert)
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_daily_stats(
  p_date date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  v_stats := generate_daily_stats(p_date);
  
  INSERT INTO daily_stats (stat_date, stats)
  VALUES (p_date, v_stats)
  ON CONFLICT (stat_date) 
  DO UPDATE SET
    stats = EXCLUDED.stats,
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION refresh_daily_stats IS 
'Refresh cache statistiques pour date donnée (upsert).';

-- =====================================================
-- 8) VUE MONITORING DASHBOARD
-- =====================================================

CREATE OR REPLACE VIEW v_monitoring_dashboard AS
SELECT
  (SELECT COUNT(*) FROM missions WHERE status IN ('EN_ROUTE', 'EN_INTERVENTION') AND closed_at IS NULL) as missions_active,
  (SELECT COUNT(*) FROM missions WHERE status = 'EN_PAUSE' AND closed_at IS NULL) as missions_paused,
  (SELECT COUNT(*) FROM missions WHERE status = 'PLANIFIEE' AND scheduled_start < now() AND closed_at IS NULL) as missions_overdue,
  (SELECT COUNT(*) FROM missions WHERE report_status = 'A_VALIDER') as reports_pending,
  (SELECT COUNT(*) FROM missions WHERE billing_status = 'FACTURABLE') as missions_billable,
  (SELECT COUNT(*) FROM invoices WHERE paid_at IS NULL AND created_at IS NOT NULL) as invoices_unpaid,
  (SELECT COUNT(*) FROM notifications_queue WHERE status = 'pending') as notifications_pending,
  (SELECT COUNT(*) FROM notifications_queue WHERE status = 'failed' AND retry_count >= max_retries) as notifications_failed,
  (SELECT COUNT(*) FROM missions 
   WHERE status = 'EN_PAUSE' 
   AND EXTRACT(EPOCH FROM (now() - updated_at))/3600 > 48
   AND closed_at IS NULL) as missions_stuck_48h,
  (SELECT COUNT(*) FROM rpc_idempotency WHERE expires_at > now()) as idempotency_cache_size,
  (SELECT COUNT(*) FROM notifications_queue WHERE expires_at > now()) as notifications_cache_size,
  now() as snapshot_at;

COMMENT ON VIEW v_monitoring_dashboard IS 
'Dashboard monitoring temps réel (missions actives, alertes, cache)';

-- =====================================================
-- 9) FONCTION CREATE ALERT (notifications admin)
-- =====================================================

CREATE OR REPLACE FUNCTION create_admin_alert(
  p_alert_type text,
  p_title text,
  p_body text,
  p_mission_id uuid DEFAULT NULL,
  p_priority text DEFAULT 'high'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_users jsonb;
  v_notification_id uuid;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', p.user_id,
      'email', au.email,
      'name', p.full_name
    )
  )
  INTO v_admin_users
  FROM profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.role IN ('admin', 'manager');
  
  v_notification_id := enqueue_notification(
    p_mission_id,
    p_alert_type,
    'alert-admin',
    v_admin_users,
    ARRAY['in_app', 'email'],
    p_title,
    p_body,
    CASE WHEN p_mission_id IS NOT NULL 
         THEN format('/admin/missions/%s', p_mission_id)
         ELSE '/admin/operations'
    END,
    p_priority
  );
  
  RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION create_admin_alert IS 
'Crée alerte pour tous admins/managers (in_app + email).';

-- =====================================================
-- 10) RLS POLICIES
-- =====================================================

ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_stats_admin_read ON daily_stats
  FOR SELECT
  USING (current_user_role() IN ('admin', 'manager'));

CREATE POLICY daily_stats_system_write ON daily_stats
  FOR INSERT
  WITH CHECK (current_user_role() IN ('admin', 'manager'));

CREATE POLICY daily_stats_system_update ON daily_stats
  FOR UPDATE
  USING (current_user_role() IN ('admin', 'manager'))
  WITH CHECK (current_user_role() IN ('admin', 'manager'));

-- =====================================================
-- FIN MIGRATION CRON JOBS & CLEANUP
-- =====================================================
