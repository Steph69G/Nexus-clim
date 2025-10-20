/*
  # Create Subcontractor Certifications System

  1. New Tables
    - `subcontractor_certifications`
      - RGE certification tracking
      - Qualibois certification tracking
      - Décennale insurance tracking
      - Document storage (Supabase Storage URLs)
      - Expiry date monitoring

  2. Security
    - Enable RLS
    - Admin can manage all certifications
    - Subcontractors can view their own certifications

  3. Features
    - Automatic status calculation based on expiry dates
    - Document attachment
    - Last checked tracking
    - Email alerts for expiring certifications (to be implemented)
*/

-- Create subcontractor_certifications table
CREATE TABLE IF NOT EXISTS subcontractor_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  
  -- RGE Certification
  rge_certified boolean DEFAULT false,
  rge_number text,
  rge_expiry_date date,
  rge_document_url text,
  rge_specialties text[], -- ['climatisation', 'pompe_chaleur', 'poele_granules']
  
  -- Qualibois Certification (specific for wood/pellet stoves)
  qualibois_certified boolean DEFAULT false,
  qualibois_number text,
  qualibois_expiry_date date,
  qualibois_document_url text,
  
  -- QualiPAC Certification (specific for heat pumps)
  qualipac_certified boolean DEFAULT false,
  qualipac_number text,
  qualipac_expiry_date date,
  qualipac_document_url text,
  
  -- Décennale Insurance (mandatory)
  decennale_valid boolean DEFAULT false,
  decennale_insurer text,
  decennale_policy_number text,
  decennale_expiry_date date,
  decennale_document_url text,
  decennale_coverage_amount_euros integer,
  
  -- RC Pro Insurance
  rc_pro_valid boolean DEFAULT false,
  rc_pro_insurer text,
  rc_pro_policy_number text,
  rc_pro_expiry_date date,
  rc_pro_document_url text,
  
  -- Overall status (calculated automatically)
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'valid',            -- all required certifications are valid
    'expired',          -- one or more certifications expired
    'expiring_soon',    -- one or more expire within 60 days
    'pending_renewal',  -- renewal in progress
    'incomplete'        -- missing required certifications
  )),
  
  -- Monitoring
  last_checked_at timestamptz DEFAULT now(),
  last_checked_by uuid,
  next_check_date date,
  
  -- Alerts
  expiry_alert_sent_at timestamptz,
  expiry_alert_count integer DEFAULT 0,
  
  -- Notes
  internal_notes text,
  
  -- Metadata
  created_by uuid NOT NULL,
  updated_by uuid,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subcontractor_certifications_user_id ON subcontractor_certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_subcontractor_certifications_status ON subcontractor_certifications(status);
CREATE INDEX IF NOT EXISTS idx_subcontractor_certifications_rge_expiry ON subcontractor_certifications(rge_expiry_date);
CREATE INDEX IF NOT EXISTS idx_subcontractor_certifications_decennale_expiry ON subcontractor_certifications(decennale_expiry_date);

-- Enable RLS
ALTER TABLE subcontractor_certifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

CREATE POLICY "Admin can view all certifications"
  ON subcontractor_certifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can manage all certifications"
  ON subcontractor_certifications FOR ALL
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

CREATE POLICY "Subcontractors can view own certifications"
  ON subcontractor_certifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'subcontractor'
    )
  );

-- Function to calculate certification status
CREATE OR REPLACE FUNCTION calculate_certification_status()
RETURNS TRIGGER AS $$
DECLARE
  v_status text;
  v_expiring_soon boolean;
  v_expired boolean;
  v_incomplete boolean;
BEGIN
  v_expiring_soon := false;
  v_expired := false;
  v_incomplete := false;
  
  -- Check if décennale is missing or expired (mandatory)
  IF NEW.decennale_valid = false OR NEW.decennale_expiry_date IS NULL THEN
    v_incomplete := true;
  ELSIF NEW.decennale_expiry_date < CURRENT_DATE THEN
    v_expired := true;
  ELSIF NEW.decennale_expiry_date < CURRENT_DATE + INTERVAL '60 days' THEN
    v_expiring_soon := true;
  END IF;
  
  -- Check RGE if certified
  IF NEW.rge_certified = true THEN
    IF NEW.rge_expiry_date IS NULL THEN
      v_incomplete := true;
    ELSIF NEW.rge_expiry_date < CURRENT_DATE THEN
      v_expired := true;
    ELSIF NEW.rge_expiry_date < CURRENT_DATE + INTERVAL '60 days' THEN
      v_expiring_soon := true;
    END IF;
  END IF;
  
  -- Check Qualibois if certified
  IF NEW.qualibois_certified = true THEN
    IF NEW.qualibois_expiry_date IS NULL THEN
      v_incomplete := true;
    ELSIF NEW.qualibois_expiry_date < CURRENT_DATE THEN
      v_expired := true;
    ELSIF NEW.qualibois_expiry_date < CURRENT_DATE + INTERVAL '60 days' THEN
      v_expiring_soon := true;
    END IF;
  END IF;
  
  -- Check QualiPAC if certified
  IF NEW.qualipac_certified = true THEN
    IF NEW.qualipac_expiry_date IS NULL THEN
      v_incomplete := true;
    ELSIF NEW.qualipac_expiry_date < CURRENT_DATE THEN
      v_expired := true;
    ELSIF NEW.qualipac_expiry_date < CURRENT_DATE + INTERVAL '60 days' THEN
      v_expiring_soon := true;
    END IF;
  END IF;
  
  -- Determine final status
  IF v_incomplete THEN
    v_status := 'incomplete';
  ELSIF v_expired THEN
    v_status := 'expired';
  ELSIF v_expiring_soon THEN
    v_status := 'expiring_soon';
  ELSE
    v_status := 'valid';
  END IF;
  
  NEW.status := v_status;
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_certification_status_trigger ON subcontractor_certifications;
CREATE TRIGGER calculate_certification_status_trigger
  BEFORE INSERT OR UPDATE ON subcontractor_certifications
  FOR EACH ROW
  EXECUTE FUNCTION calculate_certification_status();

-- Function to check for expiring certifications (to be called by cron)
CREATE OR REPLACE FUNCTION check_expiring_certifications()
RETURNS void AS $$
BEGIN
  -- Update status for all certifications
  UPDATE subcontractor_certifications
  SET updated_at = now()
  WHERE deleted_at IS NULL;
  
  -- This will trigger the status calculation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE subcontractor_certifications IS 'Subcontractor certifications (RGE, Qualibois, QualiPAC, Décennale, RC Pro)';
COMMENT ON COLUMN subcontractor_certifications.status IS 'Automatically calculated based on expiry dates and completeness';
COMMENT ON FUNCTION check_expiring_certifications IS 'Call this function daily via cron to update certification statuses';
