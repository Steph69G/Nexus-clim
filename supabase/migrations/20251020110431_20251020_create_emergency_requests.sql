/*
  # Create Emergency Requests System

  1. New Tables
    - `emergency_requests`
      - Client-initiated emergency/breakdown requests
      - Urgency classification (normal, urgent, critical)
      - 48h max response time tracking
      - Photo uploads for issue documentation
      - Status workflow and assignment
      - Automatic mission creation

  2. Security
    - Enable RLS
    - Admin and coordinators can view all requests
    - Clients can create and view their own requests
    - Techs can view assigned requests

  3. Features
    - Urgency-based SLA tracking
    - Equipment linking to maintenance contracts
    - Photo documentation
    - Automatic mission creation
    - Performance tracking (response time)
*/

-- Create emergency_requests table
CREATE TABLE IF NOT EXISTS emergency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  
  -- Request details
  request_type text NOT NULL CHECK (request_type IN (
    'breakdown',      -- panne complète
    'urgent_repair',  -- réparation urgente
    'no_heating',     -- pas de chauffage (hiver)
    'no_cooling',     -- pas de climatisation (été)
    'leak',           -- fuite
    'noise',          -- bruit anormal
    'smell',          -- odeur suspecte
    'other'           -- autre
  )),
  
  title text NOT NULL,
  description text NOT NULL,
  
  -- Urgency level
  urgency_level text NOT NULL DEFAULT 'normal' CHECK (urgency_level IN (
    'normal',    -- standard request (48-72h)
    'urgent',    -- urgent (24-48h)
    'critical'   -- critical (same day or next day)
  )),
  
  -- Equipment information
  equipment_type text,
  equipment_location text,
  equipment_brand text,
  equipment_model text,
  equipment_age_years integer,
  
  -- Contract link (if client has maintenance contract)
  contract_id uuid,
  covered_by_contract boolean DEFAULT false,
  
  -- Location
  site_address text NOT NULL,
  site_city text NOT NULL,
  site_postal_code text NOT NULL,
  site_coordinates jsonb,
  
  -- Photos (issue documentation)
  photos jsonb DEFAULT '[]'::jsonb,
  
  -- Status workflow
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- awaiting assignment
    'assigned',     -- assigned to tech
    'in_progress',  -- tech is working on it
    'resolved',     -- issue resolved
    'cancelled'     -- request cancelled
  )),
  
  -- Assignment
  assigned_to uuid,
  assigned_at timestamptz,
  
  -- SLA tracking
  promised_intervention_date timestamptz,
  actual_intervention_date timestamptz,
  resolved_at timestamptz,
  
  -- Response time tracking
  first_response_at timestamptz,
  first_response_time_minutes integer,
  resolution_time_minutes integer,
  
  -- Mission link
  mission_id uuid,
  mission_created_at timestamptz,
  
  -- Client satisfaction
  client_rating integer CHECK (client_rating >= 1 AND client_rating <= 10),
  client_comment text,
  
  -- Internal notes
  internal_notes text,
  resolution_notes text,
  
  -- Metadata
  created_by uuid,
  updated_by uuid,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_emergency_requests_client_id ON emergency_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_status ON emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_urgency_level ON emergency_requests(urgency_level);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_assigned_to ON emergency_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_contract_id ON emergency_requests(contract_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_mission_id ON emergency_requests(mission_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_created_at ON emergency_requests(created_at DESC);

-- Enable RLS
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

CREATE POLICY "Admin and coordinators can view all requests"
  ON emergency_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal', 'coordinator')
    )
  );

CREATE POLICY "Admin and coordinators can manage all requests"
  ON emergency_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal', 'coordinator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal', 'coordinator')
    )
  );

CREATE POLICY "Clients can view own requests"
  ON emergency_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_clients.id = emergency_requests.client_id
      AND user_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create requests"
  ON emergency_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_clients.id = emergency_requests.client_id
      AND user_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update own pending requests"
  ON emergency_requests FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_clients.id = emergency_requests.client_id
      AND user_clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_clients.id = emergency_requests.client_id
      AND user_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Techs can view assigned requests"
  ON emergency_requests FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = emergency_requests.mission_id
      AND missions.assigned_user_id = auth.uid()
    )
  );

CREATE POLICY "Techs can update assigned requests"
  ON emergency_requests FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = emergency_requests.mission_id
      AND missions.assigned_user_id = auth.uid()
    )
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = emergency_requests.mission_id
      AND missions.assigned_user_id = auth.uid()
    )
  );

-- Function to calculate promised intervention date based on urgency
CREATE OR REPLACE FUNCTION set_promised_intervention_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.promised_intervention_date IS NULL THEN
    CASE NEW.urgency_level
      WHEN 'critical' THEN
        -- Same day if before 2pm, otherwise next day
        IF EXTRACT(HOUR FROM NEW.created_at) < 14 THEN
          NEW.promised_intervention_date := NEW.created_at + INTERVAL '4 hours';
        ELSE
          NEW.promised_intervention_date := DATE_TRUNC('day', NEW.created_at) + INTERVAL '1 day' + INTERVAL '9 hours';
        END IF;
      WHEN 'urgent' THEN
        -- Within 24-48h
        NEW.promised_intervention_date := NEW.created_at + INTERVAL '36 hours';
      ELSE
        -- Normal: within 48-72h
        NEW.promised_intervention_date := NEW.created_at + INTERVAL '48 hours';
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_promised_intervention_date_trigger ON emergency_requests;
CREATE TRIGGER set_promised_intervention_date_trigger
  BEFORE INSERT ON emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_promised_intervention_date();

-- Function to calculate response and resolution times
CREATE OR REPLACE FUNCTION calculate_request_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate first response time
  IF NEW.first_response_at IS NOT NULL AND (OLD.first_response_at IS NULL OR OLD.first_response_at != NEW.first_response_at) THEN
    NEW.first_response_time_minutes := EXTRACT(EPOCH FROM (NEW.first_response_at - NEW.created_at)) / 60;
  END IF;
  
  -- Calculate resolution time
  IF NEW.resolved_at IS NOT NULL AND (OLD.resolved_at IS NULL OR OLD.resolved_at != NEW.resolved_at) THEN
    NEW.resolution_time_minutes := EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.created_at)) / 60;
  END IF;
  
  -- Auto-set first_response_at when assigned
  IF NEW.assigned_to IS NOT NULL AND OLD.assigned_to IS NULL AND NEW.first_response_at IS NULL THEN
    NEW.first_response_at := now();
  END IF;
  
  -- Auto-set resolved_at when status changes to resolved
  IF NEW.status = 'resolved' AND (OLD.status IS NULL OR OLD.status != 'resolved') AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at := now();
  END IF;
  
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_request_metrics_trigger ON emergency_requests;
CREATE TRIGGER calculate_request_metrics_trigger
  BEFORE UPDATE ON emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION calculate_request_metrics();

-- Function to check contract coverage
CREATE OR REPLACE FUNCTION check_contract_coverage()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if client has an active maintenance contract
  IF NEW.client_id IS NOT NULL THEN
    SELECT mc.id INTO NEW.contract_id
    FROM maintenance_contracts mc
    WHERE mc.client_id = NEW.client_id
    AND mc.status = 'active'
    AND NEW.created_at BETWEEN mc.start_date AND mc.end_date
    ORDER BY mc.created_at DESC
    LIMIT 1;
    
    IF NEW.contract_id IS NOT NULL THEN
      NEW.covered_by_contract := true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_contract_coverage_trigger ON emergency_requests;
CREATE TRIGGER check_contract_coverage_trigger
  BEFORE INSERT ON emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_contract_coverage();

COMMENT ON TABLE emergency_requests IS 'Client-initiated emergency and breakdown requests (dépannages express)';
COMMENT ON COLUMN emergency_requests.urgency_level IS 'critical: same/next day, urgent: 24-48h, normal: 48-72h';
COMMENT ON COLUMN emergency_requests.covered_by_contract IS 'True if client has active maintenance contract covering this equipment';
COMMENT ON COLUMN emergency_requests.promised_intervention_date IS 'Automatically calculated based on urgency level';
