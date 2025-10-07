/*
  # Système Espace Client (Optionnel)

  ## Tables créées :
  
  ### 1. client_accounts
  Comptes clients pour suivre leurs demandes et factures.
  Optionnel : un client peut créer un compte ou rester anonyme.
  
  ### 2. client_requests
  Demandes de service émises par les clients (formulaire en ligne).
  Point d'entrée pour les nouveaux clients avant création de devis.
  
  ## Fonctionnalités :
  
  - **Sans compte** : Client remplit un formulaire, reçoit des emails
  - **Avec compte** : Client peut suivre ses demandes, voir ses factures, historique
  
  ## Workflow client :
  
  1. **Demande initiale** → Formulaire en ligne (client_requests)
  2. **Type choisi** :
     - Devis à distance → Admin crée devis
     - Visite pour devis → RDV planifié
  3. **Suivi** → Client peut voir statut de sa demande
  4. **Quote accepté** → Mission créée
  5. **Intervention** → Client notifié
  6. **Facture** → Client peut télécharger facture
  
  ## Sécurité (RLS)
  
  ### client_accounts
  - **Admins/SAL** : Accès complet
  - **Clients** : Lecture/modification de leur propre compte uniquement
  
  ### client_requests
  - **Admins/SAL** : Accès complet
  - **Clients** : Lecture/modification de leurs propres demandes
*/

-- Create enum for client request types
DO $$ BEGIN
  CREATE TYPE client_request_type AS ENUM ('devis_distance', 'devis_visite', 'urgence', 'information');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for client request status
DO $$ BEGIN
  CREATE TYPE client_request_status AS ENUM ('nouveau', 'en_cours', 'devis_envoyé', 'rdv_planifié', 'accepté', 'terminé', 'annulé');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create client_accounts table
CREATE TABLE IF NOT EXISTS client_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Authentication (optional - client can link to auth.users)
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  
  -- Contact information
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  name text NOT NULL,
  
  -- Company info (optional for B2B)
  company_name text,
  siret text,
  
  -- Address
  address text NOT NULL,
  city text NOT NULL,
  zip text NOT NULL,
  
  -- Preferences
  preferred_contact_method text DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'sms')),
  newsletter_opt_in boolean DEFAULT false,
  
  -- Metadata
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_accounts_email ON client_accounts(email);
CREATE INDEX IF NOT EXISTS idx_client_accounts_phone ON client_accounts(phone);
CREATE INDEX IF NOT EXISTS idx_client_accounts_auth_user ON client_accounts(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Create client_requests table
CREATE TABLE IF NOT EXISTS client_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Client link (optional - can be null for anonymous requests)
  client_account_id uuid REFERENCES client_accounts(id) ON DELETE SET NULL,
  
  -- Contact info (denormalized for anonymous requests)
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text NOT NULL,
  client_address text NOT NULL,
  client_city text NOT NULL,
  client_zip text NOT NULL,
  
  -- Request details
  request_type client_request_type NOT NULL,
  status client_request_status NOT NULL DEFAULT 'nouveau',
  
  -- Description
  subject text NOT NULL,
  description text NOT NULL,
  
  -- Attachments (photos, documents)
  photos jsonb DEFAULT '[]'::jsonb,
  documents jsonb DEFAULT '[]'::jsonb,
  
  -- Scheduling preferences
  preferred_date date,
  preferred_time_slot text CHECK (preferred_time_slot IN ('matin', 'après-midi', 'toute_journée')),
  urgency_level text DEFAULT 'normal' CHECK (urgency_level IN ('bas', 'normal', 'urgent', 'critique')),
  
  -- Links to created resources
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  
  -- Response from company
  admin_notes text,
  response_message text,
  responded_at timestamptz,
  responded_by_user_id uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  
  -- Metadata
  source text DEFAULT 'website',
  ip_address inet,
  user_agent text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_requests ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_requests_client_account ON client_requests(client_account_id) WHERE client_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_requests_status ON client_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_requests_type ON client_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_client_requests_email ON client_requests(client_email);
CREATE INDEX IF NOT EXISTS idx_client_requests_created_at ON client_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_requests_quote ON client_requests(quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_requests_mission ON client_requests(mission_id) WHERE mission_id IS NOT NULL;

-- RLS Policies for client_accounts

-- Admins and SAL: Full access
CREATE POLICY "Admins can view all client accounts"
  ON client_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Admins can create client accounts"
  ON client_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Admins can update client accounts"
  ON client_accounts FOR UPDATE
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

CREATE POLICY "Admins can delete client accounts"
  ON client_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

-- Clients: Can view and update their own account
CREATE POLICY "Clients can view their own account"
  ON client_accounts FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Clients can update their own account"
  ON client_accounts FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- RLS Policies for client_requests

-- Admins and SAL: Full access
CREATE POLICY "Admins can view all client requests"
  ON client_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Admins can update client requests"
  ON client_requests FOR UPDATE
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

CREATE POLICY "Admins can delete client requests"
  ON client_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

-- Public: Can create requests (anonymous or authenticated)
CREATE POLICY "Anyone can create client requests"
  ON client_requests FOR INSERT
  TO public
  WITH CHECK (true);

-- Clients with accounts: Can view their own requests
CREATE POLICY "Clients can view their own requests"
  ON client_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_accounts
      WHERE client_accounts.auth_user_id = auth.uid()
      AND client_accounts.id = client_requests.client_account_id
    )
  );

-- Update timestamps
CREATE OR REPLACE FUNCTION update_client_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_client_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_client_accounts_updated_at ON client_accounts;
CREATE TRIGGER set_client_accounts_updated_at
  BEFORE UPDATE ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_client_accounts_updated_at();

DROP TRIGGER IF EXISTS set_client_requests_updated_at ON client_requests;
CREATE TRIGGER set_client_requests_updated_at
  BEFORE UPDATE ON client_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_client_requests_updated_at();

-- Function to auto-link client request to client account by email
CREATE OR REPLACE FUNCTION auto_link_client_request()
RETURNS TRIGGER AS $$
DECLARE
  existing_account_id uuid;
BEGIN
  -- Try to find existing client account by email
  SELECT id INTO existing_account_id
  FROM client_accounts
  WHERE email = NEW.client_email
  LIMIT 1;
  
  IF existing_account_id IS NOT NULL THEN
    NEW.client_account_id := existing_account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_link_client_request_trigger ON client_requests;
CREATE TRIGGER auto_link_client_request_trigger
  BEFORE INSERT ON client_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_client_request();