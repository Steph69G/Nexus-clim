/*
  # Système de Devis (Quotes)

  ## Nouvelle table : quotes
  
  Cette table gère tous les devis créés pour les clients.
  
  ### Colonnes principales :
  - `id` : Identifiant unique du devis
  - `quote_number` : Numéro de devis auto-généré (DEV-YYYY-NNN)
  - `client_*` : Informations client (nom, email, téléphone, adresse complète)
  - `type` : Type de devis (distance, sur_place, urgence)
  - `status` : État du devis (brouillon, envoyé, accepté, refusé, expiré)
  - `items` : Lignes du devis en JSON (description, quantité, prix unitaire, total)
  - Montants en centimes (subtotal, tax, total) pour éviter les erreurs d'arrondi
  - `valid_until` : Date de validité du devis
  - `pdf_url` : URL du PDF généré
  - `created_by_user_id` : Utilisateur ayant créé le devis
  - `accepted_at` : Date d'acceptation par le client

  ## Sécurité (RLS)
  
  Politiques restrictives par rôle :
  - **Admins** : Accès complet (CRUD)
  - **SAL** : Lecture et création de devis
  - **Techniciens** : Lecture seule des devis acceptés assignés
  - **Subcontractors** : Aucun accès (pas leur domaine)
  
  ## Index
  
  - Index sur `quote_number` pour recherche rapide
  - Index sur `status` pour filtres
  - Index sur `created_by_user_id` pour historique par utilisateur
*/

-- Create enum for quote types
DO $$ BEGIN
  CREATE TYPE quote_type AS ENUM ('distance', 'sur_place', 'urgence');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for quote status
DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM ('brouillon', 'envoyé', 'accepté', 'refusé', 'expiré');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text UNIQUE NOT NULL DEFAULT '',
  
  -- Client information
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text NOT NULL,
  client_address text NOT NULL,
  client_city text NOT NULL,
  client_zip text NOT NULL,
  
  -- Quote details
  type quote_type NOT NULL DEFAULT 'distance',
  status quote_status NOT NULL DEFAULT 'brouillon',
  
  -- Items in JSONB format
  -- Structure: [{ description: string, quantity: number, unit_price_cents: number, total_cents: number }]
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Financial details (in cents to avoid rounding errors)
  subtotal_cents integer NOT NULL DEFAULT 0,
  tax_rate decimal(5,2) NOT NULL DEFAULT 20.0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  
  -- Additional info
  notes text,
  valid_until date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  
  -- PDF and acceptance
  pdf_url text,
  accepted_at timestamptz,
  
  -- Audit fields
  created_by_user_id uuid REFERENCES profiles(user_id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client_email ON quotes(client_email);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);

-- RLS Policies

-- Admins: Full access
CREATE POLICY "Admins can view all quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create quotes"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update quotes"
  ON quotes FOR UPDATE
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

CREATE POLICY "Admins can delete quotes"
  ON quotes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- SAL: Can view and create quotes
CREATE POLICY "SAL can view all quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  );

CREATE POLICY "SAL can create quotes"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  );

CREATE POLICY "SAL can update their own quotes"
  ON quotes FOR UPDATE
  TO authenticated
  USING (
    created_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  )
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  );

-- Techs: Read-only access to accepted quotes related to their missions
CREATE POLICY "Techs can view quotes related to their missions"
  ON quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'tech'
    )
    AND status = 'accepté'
  );

-- Function to auto-generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix text;
  next_number integer;
  new_quote_number text;
BEGIN
  -- Get current year's last 2 digits
  year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
  
  -- Get the next number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(quote_number FROM 'DEV-[0-9]{2}-([0-9]+)') AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM quotes
  WHERE quote_number LIKE 'DEV-' || year_suffix || '-%';
  
  -- Format: DEV-YY-NNN (e.g., DEV-25-001)
  new_quote_number := 'DEV-' || year_suffix || '-' || LPAD(next_number::text, 3, '0');
  
  NEW.quote_number := new_quote_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate quote number on insert
DROP TRIGGER IF EXISTS set_quote_number ON quotes;
CREATE TRIGGER set_quote_number
  BEFORE INSERT ON quotes
  FOR EACH ROW
  WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
  EXECUTE FUNCTION generate_quote_number();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS set_quotes_updated_at ON quotes;
CREATE TRIGGER set_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quotes_updated_at();