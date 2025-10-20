/*
  # Create KPI Snapshots System

  1. New Tables
    - `kpi_snapshots`
      - Periodic aggregation of key performance indicators
      - Weekly, monthly, quarterly views
      - Business metrics (quotes, conversions, revenue)
      - Operational metrics (interventions, delays, satisfaction)
      - Subcontractor performance

  2. Security
    - Enable RLS
    - Admin and managers can view all KPIs
    - Dashboard integration

  3. Features
    - Automated snapshot calculation (via cron)
    - Historical trend analysis
    - Multiple aggregation periods
    - Comprehensive business metrics
*/

-- Create kpi_snapshots table
CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Time period
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  
  -- Quotes & Conversion Metrics
  quotes_sent integer DEFAULT 0,
  quotes_signed integer DEFAULT 0,
  quotes_rejected integer DEFAULT 0,
  quotes_expired integer DEFAULT 0,
  quotes_pending integer DEFAULT 0,
  conversion_rate numeric(5,2), -- percentage
  
  -- Revenue Metrics
  total_revenue_ht numeric(12,2) DEFAULT 0,
  total_revenue_ttc numeric(12,2) DEFAULT 0,
  average_transaction_value_ttc numeric(10,2),
  
  -- Mission Metrics
  missions_created integer DEFAULT 0,
  missions_assigned integer DEFAULT 0,
  missions_completed integer DEFAULT 0,
  missions_cancelled integer DEFAULT 0,
  missions_delayed integer DEFAULT 0,
  
  -- Performance Metrics
  average_intervention_delay_hours numeric(10,2),
  average_mission_duration_minutes numeric(10,2),
  on_time_completion_rate numeric(5,2), -- percentage
  
  -- Client Satisfaction Metrics
  surveys_sent integer DEFAULT 0,
  surveys_completed integer DEFAULT 0,
  survey_response_rate numeric(5,2), -- percentage
  average_client_rating numeric(3,2), -- /10
  nps_score numeric(5,2), -- Net Promoter Score
  recommendation_rate numeric(5,2), -- percentage
  promoters_count integer DEFAULT 0,
  passives_count integer DEFAULT 0,
  detractors_count integer DEFAULT 0,
  
  -- Contract Metrics
  active_contracts integer DEFAULT 0,
  new_contracts integer DEFAULT 0,
  expiring_contracts integer DEFAULT 0,
  cancelled_contracts integer DEFAULT 0,
  contract_renewal_rate numeric(5,2), -- percentage
  maintenance_revenue_ttc numeric(10,2) DEFAULT 0,
  
  -- Emergency Request Metrics
  emergency_requests_received integer DEFAULT 0,
  emergency_requests_resolved integer DEFAULT 0,
  average_response_time_hours numeric(10,2),
  sla_compliance_rate numeric(5,2), -- percentage (met promised intervention date)
  
  -- Subcontractor Metrics
  subcontractor_missions integer DEFAULT 0,
  subcontractor_acceptance_rate numeric(5,2), -- percentage of offers accepted
  subcontractor_completion_rate numeric(5,2), -- percentage completed on time
  subcontractor_payments_released numeric(10,2) DEFAULT 0,
  
  -- Financial Metrics
  invoices_sent integer DEFAULT 0,
  invoices_paid integer DEFAULT 0,
  invoices_overdue integer DEFAULT 0,
  average_payment_delay_days numeric(10,2),
  cash_collected_ttc numeric(12,2) DEFAULT 0,
  
  -- Margin Metrics
  average_margin_percentage numeric(5,2),
  total_margin_euros numeric(12,2) DEFAULT 0,
  
  -- Staff Productivity
  average_missions_per_tech numeric(5,2),
  average_revenue_per_tech numeric(10,2),
  
  -- Client Metrics
  new_clients integer DEFAULT 0,
  returning_clients integer DEFAULT 0,
  total_active_clients integer DEFAULT 0,
  client_retention_rate numeric(5,2), -- percentage
  
  -- Quality Metrics
  checklists_completed integer DEFAULT 0,
  checklists_approved integer DEFAULT 0,
  checklists_rejected integer DEFAULT 0,
  quality_approval_rate numeric(5,2), -- percentage
  
  -- Calculation metadata
  calculated_at timestamptz NOT NULL DEFAULT now(),
  calculation_duration_seconds numeric(10,3),
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_snapshots_period ON kpi_snapshots(period_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_period_start ON kpi_snapshots(period_start DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_period_type ON kpi_snapshots(period_type);

-- Enable RLS
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies

CREATE POLICY "Admin and managers can view all KPIs"
  ON kpi_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'development_manager', 'coordinator')
    )
  );

CREATE POLICY "Admin can manage KPIs"
  ON kpi_snapshots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to calculate KPI snapshot for a given period
CREATE OR REPLACE FUNCTION calculate_kpi_snapshot(
  p_period_start date,
  p_period_end date,
  p_period_type text
)
RETURNS uuid AS $$
DECLARE
  v_snapshot_id uuid;
  v_start_time timestamptz;
  v_quotes_signed integer;
  v_quotes_sent integer;
  v_nps_promoters integer;
  v_nps_passives integer;
  v_nps_detractors integer;
  v_nps_total integer;
  v_nps_score numeric;
BEGIN
  v_start_time := now();
  
  -- Count quotes by status
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('sent', 'viewed', 'accepted', 'rejected')) as sent,
    COUNT(*) FILTER (WHERE status = 'accepted') as signed
  INTO v_quotes_sent, v_quotes_signed
  FROM quotes
  WHERE issue_date BETWEEN p_period_start AND p_period_end;
  
  -- Calculate NPS
  SELECT 
    COUNT(*) FILTER (WHERE would_recommend >= 9) as promoters,
    COUNT(*) FILTER (WHERE would_recommend BETWEEN 7 AND 8) as passives,
    COUNT(*) FILTER (WHERE would_recommend BETWEEN 0 AND 6) as detractors,
    COUNT(*) as total
  INTO v_nps_promoters, v_nps_passives, v_nps_detractors, v_nps_total
  FROM client_satisfaction_surveys
  WHERE completed_at BETWEEN p_period_start AND p_period_end
  AND would_recommend IS NOT NULL;
  
  IF v_nps_total > 0 THEN
    v_nps_score := ((v_nps_promoters::numeric - v_nps_detractors::numeric) / v_nps_total::numeric) * 100;
  ELSE
    v_nps_score := NULL;
  END IF;
  
  -- Insert or update snapshot
  INSERT INTO kpi_snapshots (
    period_start,
    period_end,
    period_type,
    
    -- Quotes
    quotes_sent,
    quotes_signed,
    quotes_rejected,
    quotes_expired,
    conversion_rate,
    
    -- Revenue
    total_revenue_ttc,
    average_transaction_value_ttc,
    
    -- Missions
    missions_created,
    missions_completed,
    missions_cancelled,
    
    -- Satisfaction
    surveys_completed,
    average_client_rating,
    nps_score,
    promoters_count,
    passives_count,
    detractors_count,
    
    -- Contracts
    new_contracts,
    active_contracts,
    
    -- Emergency
    emergency_requests_received,
    emergency_requests_resolved,
    
    -- Invoices
    invoices_sent,
    invoices_paid,
    cash_collected_ttc,
    
    calculation_duration_seconds
  )
  VALUES (
    p_period_start,
    p_period_end,
    p_period_type,
    
    v_quotes_sent,
    v_quotes_signed,
    (SELECT COUNT(*) FROM quotes WHERE status = 'rejected' AND issue_date BETWEEN p_period_start AND p_period_end),
    (SELECT COUNT(*) FROM quotes WHERE status = 'expired' AND issue_date BETWEEN p_period_start AND p_period_end),
    CASE WHEN v_quotes_sent > 0 THEN (v_quotes_signed::numeric / v_quotes_sent::numeric * 100) ELSE 0 END,
    
    (SELECT COALESCE(SUM(total_cents), 0) / 100.0 FROM invoices WHERE created_at BETWEEN p_period_start AND p_period_end),
    (SELECT COALESCE(AVG(total_cents), 0) / 100.0 FROM invoices WHERE created_at BETWEEN p_period_start AND p_period_end),
    
    (SELECT COUNT(*) FROM missions WHERE created_at BETWEEN p_period_start AND p_period_end),
    (SELECT COUNT(*) FROM missions WHERE finished_at BETWEEN p_period_start AND p_period_end),
    (SELECT COUNT(*) FROM missions WHERE status = 'ANNULE' AND updated_at BETWEEN p_period_start AND p_period_end),
    
    (SELECT COUNT(*) FROM client_satisfaction_surveys WHERE completed_at BETWEEN p_period_start AND p_period_end),
    (SELECT COALESCE(AVG(overall_rating), 0) FROM client_satisfaction_surveys WHERE completed_at BETWEEN p_period_start AND p_period_end),
    v_nps_score,
    v_nps_promoters,
    v_nps_passives,
    v_nps_detractors,
    
    (SELECT COUNT(*) FROM maintenance_contracts WHERE created_at BETWEEN p_period_start AND p_period_end),
    (SELECT COUNT(*) FROM maintenance_contracts WHERE status = 'active' AND p_period_end BETWEEN start_date AND end_date),
    
    (SELECT COUNT(*) FROM emergency_requests WHERE created_at BETWEEN p_period_start AND p_period_end),
    (SELECT COUNT(*) FROM emergency_requests WHERE resolved_at BETWEEN p_period_start AND p_period_end),
    
    (SELECT COUNT(*) FROM invoices WHERE created_at BETWEEN p_period_start AND p_period_end),
    (SELECT COUNT(*) FROM invoices WHERE paid_at BETWEEN p_period_start AND p_period_end),
    (SELECT COALESCE(SUM(paid_amount_cents), 0) / 100.0 FROM invoices WHERE paid_at BETWEEN p_period_start AND p_period_end),
    
    EXTRACT(EPOCH FROM (now() - v_start_time))
  )
  ON CONFLICT (period_type, period_start, period_end)
  DO UPDATE SET
    quotes_sent = EXCLUDED.quotes_sent,
    quotes_signed = EXCLUDED.quotes_signed,
    quotes_rejected = EXCLUDED.quotes_rejected,
    quotes_expired = EXCLUDED.quotes_expired,
    conversion_rate = EXCLUDED.conversion_rate,
    total_revenue_ttc = EXCLUDED.total_revenue_ttc,
    average_transaction_value_ttc = EXCLUDED.average_transaction_value_ttc,
    missions_created = EXCLUDED.missions_created,
    missions_completed = EXCLUDED.missions_completed,
    missions_cancelled = EXCLUDED.missions_cancelled,
    surveys_completed = EXCLUDED.surveys_completed,
    average_client_rating = EXCLUDED.average_client_rating,
    nps_score = EXCLUDED.nps_score,
    promoters_count = EXCLUDED.promoters_count,
    passives_count = EXCLUDED.passives_count,
    detractors_count = EXCLUDED.detractors_count,
    new_contracts = EXCLUDED.new_contracts,
    active_contracts = EXCLUDED.active_contracts,
    emergency_requests_received = EXCLUDED.emergency_requests_received,
    emergency_requests_resolved = EXCLUDED.emergency_requests_resolved,
    invoices_sent = EXCLUDED.invoices_sent,
    invoices_paid = EXCLUDED.invoices_paid,
    cash_collected_ttc = EXCLUDED.cash_collected_ttc,
    calculated_at = now(),
    calculation_duration_seconds = EXCLUDED.calculation_duration_seconds,
    updated_at = now()
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate current month snapshot
CREATE OR REPLACE FUNCTION calculate_current_month_kpis()
RETURNS uuid AS $$
DECLARE
  v_period_start date;
  v_period_end date;
BEGIN
  v_period_start := DATE_TRUNC('month', CURRENT_DATE)::date;
  v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date;
  
  RETURN calculate_kpi_snapshot(v_period_start, v_period_end, 'monthly');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE kpi_snapshots IS 'Periodic KPI snapshots for business analytics and dashboards';
COMMENT ON FUNCTION calculate_kpi_snapshot IS 'Calculate and store KPI snapshot for a given period (call via cron daily/weekly)';
COMMENT ON FUNCTION calculate_current_month_kpis IS 'Helper to calculate current month KPIs (call via cron daily)';
