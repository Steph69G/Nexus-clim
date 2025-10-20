/*
  # Create Maintenance Contracts System

  1. New Tables
    - `maintenance_contracts`
      - Multi-equipment maintenance contracts (1, 3, or 5 years)
      - Support for new installations and existing equipment
      - Annual debit or one-time payment
      - Auto-renewal management
    
    - `contract_equipment`
      - Equipment list covered by each contract
      - Individual pricing per equipment type
    
    - `contract_scheduled_interventions`
      - Scheduled yearly interventions
      - Links to missions when planned
      - Attestation tracking

  2. Security
    - Enable RLS on all tables
    - Admin can manage all contracts
    - Clients can view their own contracts
    - Techs can view contracts for assigned missions

  3. Features
    - Flexible duration (1, 3, or 5 years)
    - Equipment-based pricing
    - Payment mode selection
    - Auto-renewal with notifications
    - Intervention scheduling
*/

-- Create maintenance_contracts table
CREATE TABLE IF NOT EXISTS maintenance_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE NOT NULL,
  
  -- Client (references user_clients.id)
  client_id uuid NOT NULL,
  
  -- Origin
  origin_type text NOT NULL CHECK (origin_type IN ('new_installation', 'existing_equipment')),
  installation_invoice_id uuid,
  installation_date date,
  
  -- Duration (flexible for existing equipment)
  duration_years integer NOT NULL CHECK (duration_years IN (1, 3, 5)),
  start_date date NOT NULL,
  end_date date NOT NULL,
  
  -- Pricing
  annual_price_ht numeric(10,2) NOT NULL DEFAULT 0,
  annual_price_ttc numeric(10,2) NOT NULL DEFAULT 0,
  vat_rate numeric(5,2) NOT NULL DEFAULT 10.0,
  vat_rate_reason text,
  
  total_price_ht numeric(10,2) NOT NULL DEFAULT 0,
  total_price_ttc numeric(10,2) NOT NULL DEFAULT 0,
  
  -- One-time payment discount (-10%)
  discounted_total_ht numeric(10,2),
  discounted_total_ttc numeric(10,2),
  
  -- Payment mode
  payment_mode text NOT NULL CHECK (payment_mode IN ('annual_debit', 'one_time')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'overdue')),
  
  -- SEPA (if annual_debit)
  sepa_mandate_id uuid,
  sepa_iban_last4 text,
  next_debit_date date,
  
  -- Status
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',           -- being created
    'active',          -- contract is active
    'suspended',       -- temporarily suspended
    'cancelled',       -- cancelled before end
    'expired',         -- reached end_date
    'renewed'          -- auto-renewed to new contract
  )),
  status_reason text,
  
  -- Renewal
  auto_renewal boolean DEFAULT true,
  renewal_notice_sent_at timestamptz,
  renewal_reminder_sent_at timestamptz,
  renewed_to_contract_id uuid,
  
  -- Cancellation
  cancellation_date date,
  cancellation_reason text,
  cancelled_by text CHECK (cancelled_by IN ('client', 'provider')),
  
  -- Notes
  internal_notes text,
  client_notes text,
  
  -- Metadata
  created_by uuid NOT NULL,
  updated_by uuid,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Create contract_equipment table
CREATE TABLE IF NOT EXISTS contract_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  
  -- Equipment details
  equipment_type text NOT NULL,
  equipment_location text,
  equipment_brand text,
  equipment_model text,
  equipment_serial_number text,
  installation_date date,
  
  -- Pricing for this equipment
  annual_price_ht numeric(10,2) NOT NULL DEFAULT 0,
  annual_price_ttc numeric(10,2) NOT NULL DEFAULT 0,
  
  -- Notes
  notes text,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create contract_scheduled_interventions table
CREATE TABLE IF NOT EXISTS contract_scheduled_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  mission_id uuid,
  
  -- Scheduling
  year_number integer NOT NULL CHECK (year_number >= 1 AND year_number <= 5),
  scheduled_date date NOT NULL,
  
  -- Status
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',   -- intervention is scheduled
    'assigned',    -- mission created and assigned
    'completed',   -- intervention completed
    'cancelled'    -- intervention cancelled
  )),
  completed_at timestamptz,
  
  -- Attestation
  attestation_pdf_url text,
  attestation_generated_at timestamptz,
  
  -- Notes
  notes text,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_client_id ON maintenance_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_status ON maintenance_contracts(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_start_date ON maintenance_contracts(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_contract_number ON maintenance_contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contract_equipment_contract_id ON contract_equipment(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_scheduled_interventions_contract_id ON contract_scheduled_interventions(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_scheduled_interventions_mission_id ON contract_scheduled_interventions(mission_id);
CREATE INDEX IF NOT EXISTS idx_contract_scheduled_interventions_scheduled_date ON contract_scheduled_interventions(scheduled_date);

-- Enable RLS
ALTER TABLE maintenance_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_scheduled_interventions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_contracts

CREATE POLICY "Admin and SAL can view all contracts"
  ON maintenance_contracts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Admin and SAL can insert contracts"
  ON maintenance_contracts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Admin and SAL can update contracts"
  ON maintenance_contracts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Clients can view own contracts"
  ON maintenance_contracts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_clients.id = maintenance_contracts.client_id
      AND user_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Techs can view contracts for assigned missions"
  ON maintenance_contracts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN contract_scheduled_interventions csi ON csi.contract_id = maintenance_contracts.id
      JOIN missions ON missions.id = csi.mission_id
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('tech', 'subcontractor')
      AND missions.assigned_user_id = auth.uid()
    )
  );

-- RLS Policies for contract_equipment

CREATE POLICY "Admin and SAL can manage all equipment"
  ON contract_equipment FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Clients can view own contract equipment"
  ON contract_equipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_contracts mc
      JOIN user_clients ON user_clients.id = mc.client_id
      WHERE mc.id = contract_equipment.contract_id
      AND user_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Techs can view equipment for assigned missions"
  ON contract_equipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN contract_scheduled_interventions csi ON csi.contract_id = contract_equipment.contract_id
      JOIN missions ON missions.id = csi.mission_id
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('tech', 'subcontractor')
      AND missions.assigned_user_id = auth.uid()
    )
  );

-- RLS Policies for contract_scheduled_interventions

CREATE POLICY "Admin and SAL can manage all interventions"
  ON contract_scheduled_interventions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Clients can view own scheduled interventions"
  ON contract_scheduled_interventions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_contracts mc
      JOIN user_clients ON user_clients.id = mc.client_id
      WHERE mc.id = contract_scheduled_interventions.contract_id
      AND user_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Techs can view assigned interventions"
  ON contract_scheduled_interventions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN missions ON missions.id = contract_scheduled_interventions.mission_id
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('tech', 'subcontractor')
      AND missions.assigned_user_id = auth.uid()
    )
  );

-- Function to generate contract number
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS text AS $$
DECLARE
  year_part text;
  sequence_num integer;
  new_number text;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(contract_number FROM '[0-9]+$') AS integer
    )
  ), 0) + 1
  INTO sequence_num
  FROM maintenance_contracts
  WHERE contract_number LIKE 'CNT-' || year_part || '-%';
  
  new_number := 'CNT-' || year_part || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate end_date from start_date and duration
CREATE OR REPLACE FUNCTION calculate_contract_end_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_date IS NOT NULL AND NEW.duration_years IS NOT NULL THEN
    NEW.end_date := NEW.start_date + (NEW.duration_years || ' years')::interval;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_contract_end_date ON maintenance_contracts;
CREATE TRIGGER set_contract_end_date
  BEFORE INSERT OR UPDATE OF start_date, duration_years ON maintenance_contracts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_contract_end_date();

-- Function to update contract totals when equipment changes
CREATE OR REPLACE FUNCTION update_contract_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_contract_id uuid;
  v_duration integer;
  v_payment_mode text;
BEGIN
  v_contract_id := COALESCE(NEW.contract_id, OLD.contract_id);
  
  -- Get contract details
  SELECT duration_years, payment_mode
  INTO v_duration, v_payment_mode
  FROM maintenance_contracts
  WHERE id = v_contract_id;
  
  -- Update annual totals
  UPDATE maintenance_contracts
  SET 
    annual_price_ht = (
      SELECT COALESCE(SUM(annual_price_ht), 0)
      FROM contract_equipment
      WHERE contract_id = v_contract_id
    ),
    annual_price_ttc = (
      SELECT COALESCE(SUM(annual_price_ttc), 0)
      FROM contract_equipment
      WHERE contract_id = v_contract_id
    ),
    updated_at = now()
  WHERE id = v_contract_id;
  
  -- Recalculate total prices
  UPDATE maintenance_contracts
  SET
    total_price_ht = annual_price_ht * duration_years,
    total_price_ttc = annual_price_ttc * duration_years,
    discounted_total_ht = CASE 
      WHEN payment_mode = 'one_time' THEN (annual_price_ht * duration_years * 0.9)
      ELSE NULL
    END,
    discounted_total_ttc = CASE 
      WHEN payment_mode = 'one_time' THEN (annual_price_ttc * duration_years * 0.9)
      ELSE NULL
    END
  WHERE id = v_contract_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_contract_totals_on_equipment_insert ON contract_equipment;
CREATE TRIGGER update_contract_totals_on_equipment_insert
  AFTER INSERT ON contract_equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_totals();

DROP TRIGGER IF EXISTS update_contract_totals_on_equipment_update ON contract_equipment;
CREATE TRIGGER update_contract_totals_on_equipment_update
  AFTER UPDATE ON contract_equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_totals();

DROP TRIGGER IF EXISTS update_contract_totals_on_equipment_delete ON contract_equipment;
CREATE TRIGGER update_contract_totals_on_equipment_delete
  AFTER DELETE ON contract_equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_totals();

COMMENT ON TABLE maintenance_contracts IS 'Maintenance contracts with flexible duration (1, 3, or 5 years)';
COMMENT ON TABLE contract_equipment IS 'Equipment list covered by maintenance contracts';
COMMENT ON TABLE contract_scheduled_interventions IS 'Scheduled yearly interventions for contracts';
