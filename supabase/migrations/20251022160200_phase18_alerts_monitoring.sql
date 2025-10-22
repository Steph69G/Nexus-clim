/*
  # Phase 18 - Alerts & Monitoring

  1. Alert Configuration
    - Define thresholds for automated alerts
    - Configurable per alert type

  2. Alert Views
    - Emergencies pending too long
    - Overdue invoices by age
    - Stock critically low

  3. Alert Functions
    - Check and trigger alerts
    - Daily/hourly scheduled checks

  4. Notification Integration
    - Create notifications for alert conditions
*/

-- ============================================================================
-- ALERT CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_config (
  alert_type TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  threshold_value INTEGER,
  threshold_unit TEXT,
  check_interval_minutes INTEGER DEFAULT 60,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  notify_roles TEXT[] DEFAULT ARRAY['admin'],
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed alert configurations
INSERT INTO alert_config (alert_type, threshold_value, threshold_unit, check_interval_minutes, severity, notify_roles)
VALUES
  ('emergency_pending', 5, 'minutes', 5, 'critical', ARRAY['admin', 'sal']),
  ('invoice_overdue_7days', 7, 'days', 1440, 'warning', ARRAY['admin']),
  ('invoice_overdue_30days', 30, 'days', 1440, 'critical', ARRAY['admin']),
  ('stock_critical', 0, 'units', 360, 'warning', ARRAY['admin', 'sal']),
  ('mission_blocked', 60, 'minutes', 60, 'warning', ARRAY['admin', 'sal']),
  ('timesheet_unapproved', 7, 'days', 1440, 'info', ARRAY['admin'])
ON CONFLICT (alert_type) DO NOTHING;

-- Enable RLS
ALTER TABLE alert_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alert config"
  ON alert_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- ALERT VIEWS
-- ============================================================================

-- View: Emergencies pending too long
CREATE OR REPLACE VIEW alert_emergencies_pending AS
SELECT
  er.id,
  er.client_id,
  er.urgency_level,
  er.description,
  er.created_at,
  EXTRACT(EPOCH FROM (now() - er.created_at))/60 as minutes_pending,
  ac.threshold_value as threshold_minutes,
  p.full_name as client_name,
  p.phone as client_phone
FROM emergency_requests er
CROSS JOIN alert_config ac
LEFT JOIN profiles p ON p.id = er.client_id
WHERE er.status = 'pending'
  AND ac.alert_type = 'emergency_pending'
  AND ac.enabled = true
  AND EXTRACT(EPOCH FROM (now() - er.created_at))/60 > ac.threshold_value
ORDER BY er.created_at ASC;

-- View: Overdue invoices by severity
CREATE OR REPLACE VIEW alert_invoices_overdue AS
SELECT
  i.id,
  i.invoice_number,
  i.client_id,
  i.total_cents,
  i.currency,
  i.due_date,
  EXTRACT(DAY FROM (now() - i.due_date)) as days_overdue,
  CASE
    WHEN EXTRACT(DAY FROM (now() - i.due_date)) >= 30 THEN 'critical'
    WHEN EXTRACT(DAY FROM (now() - i.due_date)) >= 7 THEN 'warning'
    ELSE 'info'
  END as severity,
  uc.first_name || ' ' || uc.last_name as client_name,
  uc.email as client_email,
  uc.phone as client_phone
FROM invoices i
LEFT JOIN user_clients uc ON uc.id = i.client_id
WHERE i.payment_status = 'overdue'
  AND i.due_date IS NOT NULL
  AND i.due_date < now()
ORDER BY days_overdue DESC;

-- View: Stock critically low (below or at 0)
CREATE OR REPLACE VIEW alert_stock_critical AS
SELECT
  si.id,
  si.name,
  si.reference,
  si.quantity,
  si.min_stock,
  si.location,
  si.updated_at,
  (si.min_stock - si.quantity) as shortage,
  CASE
    WHEN si.quantity <= 0 THEN 'critical'
    WHEN si.quantity < (si.min_stock * 0.5) THEN 'warning'
    ELSE 'info'
  END as severity
FROM stock_items si
WHERE si.quantity < si.min_stock
ORDER BY
  CASE WHEN si.quantity <= 0 THEN 0 ELSE 1 END,
  shortage DESC;

-- View: Missions blocked for too long
CREATE OR REPLACE VIEW alert_missions_blocked AS
SELECT
  m.id,
  m.title,
  m.status,
  m.assigned_user_id,
  m.updated_at,
  EXTRACT(EPOCH FROM (now() - m.updated_at))/60 as minutes_blocked,
  p.full_name as assigned_to,
  ac.threshold_value as threshold_minutes
FROM missions m
CROSS JOIN alert_config ac
LEFT JOIN profiles p ON p.id = m.assigned_user_id
WHERE m.status = 'Bloqué'
  AND ac.alert_type = 'mission_blocked'
  AND ac.enabled = true
  AND EXTRACT(EPOCH FROM (now() - m.updated_at))/60 > ac.threshold_value
ORDER BY m.updated_at ASC;

-- View: Unapproved timesheets
CREATE OR REPLACE VIEW alert_timesheets_unapproved AS
SELECT
  t.id,
  t.user_id,
  t.mission_id,
  t.date,
  t.hours_worked,
  t.created_at,
  EXTRACT(DAY FROM (now() - t.created_at)) as days_pending,
  p.full_name as tech_name,
  m.title as mission_title,
  ac.threshold_value as threshold_days
FROM timesheets t
CROSS JOIN alert_config ac
LEFT JOIN profiles p ON p.id = t.user_id
LEFT JOIN missions m ON m.id = t.mission_id
WHERE t.approved_by IS NULL
  AND ac.alert_type = 'timesheet_unapproved'
  AND ac.enabled = true
  AND EXTRACT(DAY FROM (now() - t.created_at)) > ac.threshold_value
ORDER BY t.created_at ASC;

-- ============================================================================
-- ALERT NOTIFICATION FUNCTIONS
-- ============================================================================

-- Function to create notification for alert
CREATE OR REPLACE FUNCTION create_alert_notification(
  p_alert_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_severity TEXT,
  p_target_roles TEXT[],
  p_metadata JSONB DEFAULT '{}'
) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  notification_count INTEGER := 0;
  target_user RECORD;
BEGIN
  -- Create notifications for all users with target roles
  FOR target_user IN
    SELECT id FROM profiles
    WHERE role = ANY(p_target_roles)
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      read
    ) VALUES (
      target_user.id,
      p_alert_type,
      p_title,
      p_message,
      p_metadata,
      false
    );

    notification_count := notification_count + 1;
  END LOOP;

  -- Log the alert
  PERFORM log_app_event(
    p_alert_type,
    p_severity,
    NULL,
    'alert',
    NULL,
    jsonb_build_object(
      'notification_count', notification_count,
      'target_roles', p_target_roles,
      'title', p_title
    )
  );

  RETURN notification_count;
END;
$$;

-- Function to check and process emergency alerts
CREATE OR REPLACE FUNCTION check_emergency_alerts()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  alert RECORD;
  alert_count INTEGER := 0;
BEGIN
  FOR alert IN SELECT * FROM alert_emergencies_pending LOOP
    PERFORM create_alert_notification(
      'emergency_pending',
      format('Urgence en attente: %s min', ROUND(alert.minutes_pending)),
      format('Demande urgente de %s non traitée depuis %s minutes',
        alert.client_name, ROUND(alert.minutes_pending)),
      'critical',
      ARRAY['admin', 'sal'],
      jsonb_build_object(
        'emergency_id', alert.id,
        'client_id', alert.client_id,
        'minutes_pending', alert.minutes_pending
      )
    );

    alert_count := alert_count + 1;
  END LOOP;

  RETURN alert_count;
END;
$$;

-- Function to check overdue invoice alerts
CREATE OR REPLACE FUNCTION check_invoice_alerts()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  alert RECORD;
  alert_count INTEGER := 0;
BEGIN
  FOR alert IN
    SELECT * FROM alert_invoices_overdue
    WHERE severity IN ('warning', 'critical')
  LOOP
    PERFORM create_alert_notification(
      format('invoice_overdue_%s', alert.severity),
      format('Facture impayée: %s', alert.invoice_number),
      format('Facture %s en retard de %s jours (Client: %s)',
        alert.invoice_number, alert.days_overdue, alert.client_name),
      alert.severity,
      ARRAY['admin'],
      jsonb_build_object(
        'invoice_id', alert.id,
        'client_id', alert.client_id,
        'days_overdue', alert.days_overdue,
        'amount', alert.total_cents
      )
    );

    alert_count := alert_count + 1;
  END LOOP;

  RETURN alert_count;
END;
$$;

-- Function to check stock alerts
CREATE OR REPLACE FUNCTION check_stock_alerts()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  alert RECORD;
  alert_count INTEGER := 0;
BEGIN
  FOR alert IN
    SELECT * FROM alert_stock_critical
    WHERE severity = 'critical'
  LOOP
    PERFORM create_alert_notification(
      'stock_critical',
      format('Stock critique: %s', alert.name),
      format('Article "%s" en rupture ou stock très bas: %s unités (min: %s)',
        alert.name, alert.quantity, alert.min_stock),
      'warning',
      ARRAY['admin', 'sal'],
      jsonb_build_object(
        'item_id', alert.id,
        'quantity', alert.quantity,
        'min_stock', alert.min_stock,
        'shortage', alert.shortage
      )
    );

    alert_count := alert_count + 1;
  END LOOP;

  RETURN alert_count;
END;
$$;

-- Master function to run all alert checks
CREATE OR REPLACE FUNCTION run_all_alert_checks()
RETURNS TABLE (
  check_name TEXT,
  alerts_created INTEGER
) LANGUAGE plpgsql AS $$
DECLARE
  emergency_alerts INTEGER;
  invoice_alerts INTEGER;
  stock_alerts INTEGER;
BEGIN
  emergency_alerts := check_emergency_alerts();
  invoice_alerts := check_invoice_alerts();
  stock_alerts := check_stock_alerts();

  RETURN QUERY SELECT 'Emergencies'::TEXT, emergency_alerts
  UNION ALL SELECT 'Invoices'::TEXT, invoice_alerts
  UNION ALL SELECT 'Stock'::TEXT, stock_alerts;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE alert_config IS 'Configuration for automated alerts and monitoring thresholds';
COMMENT ON VIEW alert_emergencies_pending IS 'Emergency requests pending beyond threshold time';
COMMENT ON VIEW alert_invoices_overdue IS 'Overdue invoices categorized by severity';
COMMENT ON VIEW alert_stock_critical IS 'Stock items at critical levels requiring immediate attention';
COMMENT ON VIEW alert_missions_blocked IS 'Missions stuck in blocked status too long';
COMMENT ON FUNCTION create_alert_notification IS 'Creates notifications for users based on alert conditions';
COMMENT ON FUNCTION run_all_alert_checks IS 'Master function to run all alert checks - schedule this with pg_cron';
