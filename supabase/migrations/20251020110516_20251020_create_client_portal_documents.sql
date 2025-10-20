/*
  # Create Client Portal Documents System

  1. New Tables
    - `client_portal_documents`
      - Document repository for client portal
      - Multiple document types (quotes, invoices, contracts, attestations, warranties)
      - Visibility control
      - View tracking
      - Download counters

  2. Security
    - Enable RLS
    - Admin can manage all documents
    - Clients can view their own visible documents
    - Document URLs from Supabase Storage

  3. Features
    - Multi-type document support
    - Link to missions, contracts, quotes, invoices
    - View/download tracking
    - Visibility toggle
    - Automatic document indexing
*/

-- Create client_portal_documents table
CREATE TABLE IF NOT EXISTS client_portal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  
  -- Document classification
  document_type text NOT NULL CHECK (document_type IN (
    'quote',           -- devis
    'invoice',         -- facture
    'contract',        -- contrat de maintenance
    'attestation',     -- attestation d'entretien
    'warranty',        -- garantie
    'certificate',     -- certificat (RGE, etc.)
    'report',          -- rapport d'intervention
    'photo',           -- photo avant/après
    'manual',          -- manuel d'utilisation
    'other'            -- autre document
  )),
  
  -- Document details
  document_name text NOT NULL,
  document_description text,
  document_url text NOT NULL,
  file_size_bytes bigint,
  file_type text,
  
  -- Relations (nullable - document may relate to multiple entities)
  related_mission_id uuid,
  related_contract_id uuid,
  related_quote_id uuid,
  related_invoice_id uuid,
  
  -- Visibility control
  visible_to_client boolean DEFAULT true,
  visibility_reason text,
  
  -- Tags for organization
  tags text[] DEFAULT ARRAY[]::text[],
  
  -- Tracking
  viewed_by_client boolean DEFAULT false,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer DEFAULT 0,
  download_count integer DEFAULT 0,
  
  -- Document version (if applicable)
  version_number integer DEFAULT 1,
  superseded_by_document_id uuid,
  
  -- Expiry (for time-sensitive documents like certificates)
  expires_at timestamptz,
  expiry_reminder_sent boolean DEFAULT false,
  
  -- Metadata
  uploaded_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_portal_documents_client_id ON client_portal_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_documents_document_type ON client_portal_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_client_portal_documents_visible_to_client ON client_portal_documents(visible_to_client);
CREATE INDEX IF NOT EXISTS idx_client_portal_documents_related_mission_id ON client_portal_documents(related_mission_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_documents_related_contract_id ON client_portal_documents(related_contract_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_documents_related_quote_id ON client_portal_documents(related_quote_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_documents_related_invoice_id ON client_portal_documents(related_invoice_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_documents_created_at ON client_portal_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_portal_documents_expires_at ON client_portal_documents(expires_at);

-- Enable RLS
ALTER TABLE client_portal_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies

CREATE POLICY "Admin can view all documents"
  ON client_portal_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal', 'coordinator')
    )
  );

CREATE POLICY "Admin can manage all documents"
  ON client_portal_documents FOR ALL
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

CREATE POLICY "Clients can view own visible documents"
  ON client_portal_documents FOR SELECT
  TO authenticated
  USING (
    visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_clients.id = client_portal_documents.client_id
      AND user_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update own document tracking"
  ON client_portal_documents FOR UPDATE
  TO authenticated
  USING (
    visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_clients.id = client_portal_documents.client_id
      AND user_clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_clients.id = client_portal_documents.client_id
      AND user_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Techs can view documents for assigned missions"
  ON client_portal_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = client_portal_documents.related_mission_id
      AND missions.assigned_user_id = auth.uid()
    )
  );

-- Function to increment view counter
CREATE OR REPLACE FUNCTION increment_document_view()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.viewed_by_client = true AND (OLD.viewed_by_client = false OR OLD.viewed_by_client IS NULL) THEN
    NEW.first_viewed_at := COALESCE(OLD.first_viewed_at, now());
    NEW.last_viewed_at := now();
    NEW.view_count := COALESCE(OLD.view_count, 0) + 1;
  END IF;
  
  IF NEW.last_viewed_at IS NOT NULL AND (OLD.last_viewed_at IS NULL OR OLD.last_viewed_at != NEW.last_viewed_at) THEN
    NEW.view_count := COALESCE(NEW.view_count, OLD.view_count, 0);
    IF OLD.last_viewed_at IS NOT NULL AND OLD.last_viewed_at != NEW.last_viewed_at THEN
      NEW.view_count := NEW.view_count + 1;
    END IF;
  END IF;
  
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increment_document_view_trigger ON client_portal_documents;
CREATE TRIGGER increment_document_view_trigger
  BEFORE UPDATE OF viewed_by_client, last_viewed_at ON client_portal_documents
  FOR EACH ROW
  EXECUTE FUNCTION increment_document_view();

-- Function to auto-create documents when entities are created

-- Auto-create document when quote PDF is generated
CREATE OR REPLACE FUNCTION auto_create_quote_document()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pdf_url IS NOT NULL AND (OLD.pdf_url IS NULL OR OLD.pdf_url != NEW.pdf_url) THEN
    INSERT INTO client_portal_documents (
      client_id,
      document_type,
      document_name,
      document_url,
      related_quote_id,
      uploaded_by,
      visible_to_client
    )
    SELECT 
      uc.id,
      'quote',
      'Devis ' || NEW.quote_number,
      NEW.pdf_url,
      NEW.id,
      NEW.created_by_user_id,
      true
    FROM user_clients uc
    JOIN profiles p ON p.user_id = uc.user_id
    WHERE p.email = NEW.client_email
    LIMIT 1
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_quote_document_trigger ON quotes;
CREATE TRIGGER auto_create_quote_document_trigger
  AFTER UPDATE OF pdf_url ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_quote_document();

-- Auto-create document when invoice PDF is generated
CREATE OR REPLACE FUNCTION auto_create_invoice_document()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pdf_url IS NOT NULL AND (OLD.pdf_url IS NULL OR OLD.pdf_url != NEW.pdf_url) THEN
    INSERT INTO client_portal_documents (
      client_id,
      document_type,
      document_name,
      document_url,
      related_invoice_id,
      related_mission_id,
      uploaded_by,
      visible_to_client
    )
    SELECT 
      m.client_id,
      'invoice',
      'Facture ' || NEW.invoice_number,
      NEW.pdf_url,
      NEW.id,
      NEW.mission_id,
      NEW.created_by_user_id,
      true
    FROM missions m
    WHERE m.id = NEW.mission_id
    AND m.client_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_invoice_document_trigger ON invoices;
CREATE TRIGGER auto_create_invoice_document_trigger
  AFTER UPDATE OF pdf_url ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_invoice_document();

COMMENT ON TABLE client_portal_documents IS 'Document repository for client portal (quotes, invoices, contracts, attestations, etc.)';
COMMENT ON COLUMN client_portal_documents.visible_to_client IS 'Controls whether document appears in client portal';
COMMENT ON COLUMN client_portal_documents.viewed_by_client IS 'True when client has viewed the document';
COMMENT ON COLUMN client_portal_documents.superseded_by_document_id IS 'Links to newer version if document was updated';
