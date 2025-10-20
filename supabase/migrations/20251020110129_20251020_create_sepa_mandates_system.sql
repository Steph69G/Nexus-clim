/*
  # Create SEPA Mandates System

  1. New Tables
    - `sepa_mandates`
      - SEPA direct debit mandates for maintenance contract payments
      - Secure IBAN storage (should be encrypted at application level)
      - Signature tracking (electronic or paper)
      - Revocation management

  2. Security
    - Enable RLS
    - Admin can view all mandates
    - Clients can view their own mandates
    - Sensitive IBAN data should be encrypted at app level

  3. Features
    - Unique mandate references
    - Signature tracking
    - Status management (active, revoked, expired)
    - Usage counter (how many contracts use this mandate)
*/

-- Create sepa_mandates table
CREATE TABLE IF NOT EXISTS sepa_mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  
  -- Mandate reference (unique identifier for SEPA)
  mandate_reference text UNIQUE NOT NULL,
  
  -- Bank account details (IBAN should be encrypted at application level)
  iban text NOT NULL,
  bic text,
  account_holder_name text NOT NULL,
  bank_name text,
  
  -- Signature
  signed_at timestamptz NOT NULL DEFAULT now(),
  signature_method text NOT NULL CHECK (signature_method IN ('electronic', 'paper')),
  signature_ip text,
  signature_document_url text,
  
  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  revoked_at timestamptz,
  revoked_reason text,
  
  -- Usage tracking
  contracts_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  
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
CREATE INDEX IF NOT EXISTS idx_sepa_mandates_client_id ON sepa_mandates(client_id);
CREATE INDEX IF NOT EXISTS idx_sepa_mandates_mandate_reference ON sepa_mandates(mandate_reference);
CREATE INDEX IF NOT EXISTS idx_sepa_mandates_status ON sepa_mandates(status);

-- Enable RLS
ALTER TABLE sepa_mandates ENABLE ROW LEVEL SECURITY;

-- RLS Policies

CREATE POLICY "Admin and SAL can view all mandates"
  ON sepa_mandates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Admin and SAL can insert mandates"
  ON sepa_mandates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Admin and SAL can update mandates"
  ON sepa_mandates FOR UPDATE
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

CREATE POLICY "Clients can view own mandates"
  ON sepa_mandates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_clients.id = sepa_mandates.client_id
      AND user_clients.user_id = auth.uid()
    )
  );

-- Function to generate mandate reference
CREATE OR REPLACE FUNCTION generate_mandate_reference()
RETURNS text AS $$
DECLARE
  year_part text;
  sequence_num integer;
  new_reference text;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(mandate_reference FROM '[0-9]+$') AS integer
    )
  ), 0) + 1
  INTO sequence_num
  FROM sepa_mandates
  WHERE mandate_reference LIKE 'SEPA-' || year_part || '-%';
  
  new_reference := 'SEPA-' || year_part || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN new_reference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update contracts_count when mandate is used
CREATE OR REPLACE FUNCTION update_mandate_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sepa_mandate_id IS NOT NULL AND (OLD.sepa_mandate_id IS NULL OR OLD.sepa_mandate_id != NEW.sepa_mandate_id) THEN
    UPDATE sepa_mandates
    SET 
      contracts_count = contracts_count + 1,
      last_used_at = now(),
      updated_at = now()
    WHERE id = NEW.sepa_mandate_id;
  END IF;
  
  IF OLD.sepa_mandate_id IS NOT NULL AND (NEW.sepa_mandate_id IS NULL OR NEW.sepa_mandate_id != OLD.sepa_mandate_id) THEN
    UPDATE sepa_mandates
    SET 
      contracts_count = GREATEST(contracts_count - 1, 0),
      updated_at = now()
    WHERE id = OLD.sepa_mandate_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_mandate_usage_on_contract_change ON maintenance_contracts;
CREATE TRIGGER update_mandate_usage_on_contract_change
  AFTER INSERT OR UPDATE OF sepa_mandate_id ON maintenance_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_mandate_usage();

COMMENT ON TABLE sepa_mandates IS 'SEPA direct debit mandates for maintenance contract payments';
COMMENT ON COLUMN sepa_mandates.iban IS 'IBAN - Should be encrypted at application level before storage';
COMMENT ON COLUMN sepa_mandates.mandate_reference IS 'Unique SEPA mandate reference (SEPA-YYYY-NNNN)';
