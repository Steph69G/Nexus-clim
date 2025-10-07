/*
  # Système de Facturation (Pré-factures et Factures)

  ## Tables créées :
  
  ### 1. pre_invoices
  Pré-factures générées après intervention, avant validation finale.
  Permet de vérifier et ajuster les montants avant émission de la facture définitive.
  
  ### 2. invoices
  Factures définitives émises aux clients avec suivi des paiements.
  
  ## Workflow :
  
  1. **Intervention terminée** → Rapport d'intervention complété
  2. **Pré-facture créée** → Basée sur devis + éventuels travaux supplémentaires
  3. **Validation** → Admin/SAL valide la pré-facture
  4. **Facture émise** → Facture définitive générée et envoyée au client
  5. **Paiement** → Suivi du paiement (partiel, complet)
  
  ## Structure des montants :
  
  Tous les montants sont en **centimes** pour éviter les erreurs d'arrondi.
  - subtotal_cents : Total HT
  - tax_cents : Montant TVA
  - total_cents : Total TTC
  
  ## Sécurité (RLS)
  
  ### pre_invoices
  - **Admins** : Accès complet
  - **SAL** : Créer et valider des pré-factures
  - **Techniciens** : Lecture seule de leurs pré-factures
  
  ### invoices
  - **Admins** : Accès complet
  - **SAL** : Créer et gérer les factures
  - **Techniciens** : Lecture seule de leurs factures
*/

-- Create enum for pre-invoice status
DO $$ BEGIN
  CREATE TYPE pre_invoice_status AS ENUM ('brouillon', 'en_validation', 'validé', 'rejeté');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for invoice payment status
DO $$ BEGIN
  CREATE TYPE invoice_payment_status AS ENUM ('en_attente', 'partiel', 'payé', 'en_retard', 'annulé');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create pre_invoices table
CREATE TABLE IF NOT EXISTS pre_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_invoice_number text UNIQUE NOT NULL DEFAULT '',
  
  -- Links to existing tables
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE NOT NULL,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  intervention_report_id uuid REFERENCES intervention_reports(id) ON DELETE SET NULL,
  
  -- Client information
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text NOT NULL,
  client_address text NOT NULL,
  client_city text NOT NULL,
  client_zip text NOT NULL,
  
  -- Status
  status pre_invoice_status NOT NULL DEFAULT 'brouillon',
  
  -- Items from quote + additional work
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Financial breakdown
  quote_items_cents integer NOT NULL DEFAULT 0,
  additional_items_cents integer NOT NULL DEFAULT 0,
  subtotal_cents integer NOT NULL DEFAULT 0,
  tax_rate decimal(5,2) NOT NULL DEFAULT 20.0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  
  -- Validation
  validated_by_user_id uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  validated_at timestamptz,
  rejection_reason text,
  
  -- Notes
  notes text,
  internal_notes text,
  
  -- Audit
  created_by_user_id uuid REFERENCES profiles(user_id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pre_invoices ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pre_invoices_number ON pre_invoices(pre_invoice_number);
CREATE INDEX IF NOT EXISTS idx_pre_invoices_mission ON pre_invoices(mission_id);
CREATE INDEX IF NOT EXISTS idx_pre_invoices_quote ON pre_invoices(quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pre_invoices_status ON pre_invoices(status);
CREATE INDEX IF NOT EXISTS idx_pre_invoices_created_by ON pre_invoices(created_by_user_id);

-- Create invoices table (references pre_invoices)
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL DEFAULT '',
  
  -- Links
  pre_invoice_id uuid REFERENCES pre_invoices(id) ON DELETE SET NULL,
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE NOT NULL,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  
  -- Client information
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text NOT NULL,
  client_address text NOT NULL,
  client_city text NOT NULL,
  client_zip text NOT NULL,
  
  -- Items
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Financial details
  subtotal_cents integer NOT NULL DEFAULT 0,
  tax_rate decimal(5,2) NOT NULL DEFAULT 20.0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  
  -- Payment tracking
  payment_status invoice_payment_status NOT NULL DEFAULT 'en_attente',
  payment_method text CHECK (payment_method IN ('virement', 'cb', 'espèces', 'chèque', 'prélèvement')),
  paid_amount_cents integer NOT NULL DEFAULT 0,
  paid_at timestamptz,
  due_date date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  
  -- PDF and sending
  pdf_url text,
  sent_at timestamptz,
  
  -- Notes
  notes text,
  internal_notes text,
  
  -- Audit
  created_by_user_id uuid REFERENCES profiles(user_id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_mission ON invoices(mission_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quote ON invoices(quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_pre_invoice ON invoices(pre_invoice_id) WHERE pre_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- RLS Policies for pre_invoices

CREATE POLICY "Admins can view all pre-invoices"
  ON pre_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create pre-invoices"
  ON pre_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update pre-invoices"
  ON pre_invoices FOR UPDATE
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

CREATE POLICY "Admins can delete pre-invoices"
  ON pre_invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "SAL can view all pre-invoices"
  ON pre_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  );

CREATE POLICY "SAL can create pre-invoices"
  ON pre_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  );

CREATE POLICY "SAL can update pre-invoices"
  ON pre_invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  );

CREATE POLICY "Techs can view their own pre-invoices"
  ON pre_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = pre_invoices.mission_id
      AND missions.assigned_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'tech'
    )
  );

-- RLS Policies for invoices

CREATE POLICY "Admins can view all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update invoices"
  ON invoices FOR UPDATE
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

CREATE POLICY "Admins can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "SAL can view all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  );

CREATE POLICY "SAL can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  );

CREATE POLICY "SAL can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  );

CREATE POLICY "Techs can view their own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = invoices.mission_id
      AND missions.assigned_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'tech'
    )
  );

-- Auto-generate pre-invoice number
CREATE OR REPLACE FUNCTION generate_pre_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix text;
  next_number integer;
  new_number text;
BEGIN
  year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(pre_invoice_number FROM 'PRE-[0-9]{2}-([0-9]+)') AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM pre_invoices
  WHERE pre_invoice_number LIKE 'PRE-' || year_suffix || '-%';
  
  new_number := 'PRE-' || year_suffix || '-' || LPAD(next_number::text, 4, '0');
  NEW.pre_invoice_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix text;
  next_number integer;
  new_number text;
BEGIN
  year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'FAC-[0-9]{2}-([0-9]+)') AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number LIKE 'FAC-' || year_suffix || '-%';
  
  new_number := 'FAC-' || year_suffix || '-' || LPAD(next_number::text, 4, '0');
  NEW.invoice_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-numbering
DROP TRIGGER IF EXISTS set_pre_invoice_number ON pre_invoices;
CREATE TRIGGER set_pre_invoice_number
  BEFORE INSERT ON pre_invoices
  FOR EACH ROW
  WHEN (NEW.pre_invoice_number IS NULL OR NEW.pre_invoice_number = '')
  EXECUTE FUNCTION generate_pre_invoice_number();

DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_invoice_number();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_pre_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_pre_invoices_updated_at ON pre_invoices;
CREATE TRIGGER set_pre_invoices_updated_at
  BEFORE UPDATE ON pre_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_pre_invoices_updated_at();

DROP TRIGGER IF EXISTS set_invoices_updated_at ON invoices;
CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- Auto-update payment status based on paid amount
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.paid_amount_cents >= NEW.total_cents THEN
    NEW.payment_status := 'payé';
    IF NEW.paid_at IS NULL THEN
      NEW.paid_at := now();
    END IF;
  ELSIF NEW.paid_amount_cents > 0 THEN
    NEW.payment_status := 'partiel';
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.paid_amount_cents = 0 THEN
    NEW.payment_status := 'en_retard';
  ELSE
    NEW.payment_status := 'en_attente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invoice_payment_status_trigger ON invoices;
CREATE TRIGGER update_invoice_payment_status_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_payment_status();