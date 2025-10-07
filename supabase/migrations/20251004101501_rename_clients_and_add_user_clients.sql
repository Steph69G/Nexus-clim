/*
  # Renommer la table clients et créer user_clients

  ## Modifications

  1. **Renommer `clients` en `client_contacts`**
     - Cette table contient les clients anonymes (utilisés dans les missions)
     - Pas de lien avec auth.users
     - Garde les données existantes

  2. **Créer nouvelle table `user_clients`**
     - Clients avec compte utilisateur
     - Lien avec auth.users et profiles
     - Type : particulier/professionnel
     - Infos entreprise + facturation

  3. **Permissions RLS**
     - user_clients : clients voient leurs données, admins voient tout
*/

-- 1. Renommer l'ancienne table clients
ALTER TABLE IF EXISTS clients RENAME TO client_contacts;

-- 2. Créer la nouvelle table user_clients
CREATE TABLE IF NOT EXISTS user_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Type de client
  client_type text NOT NULL DEFAULT 'particulier' CHECK (client_type IN ('particulier', 'professionnel')),
  
  -- Informations entreprise
  company_name text,
  siret text,
  vat_number text,
  
  -- Facturation
  billing_address text,
  billing_zip text,
  billing_city text,
  
  -- Métadonnées
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_user_clients_user_id ON user_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_user_clients_client_type ON user_clients(client_type);
CREATE INDEX IF NOT EXISTS idx_user_clients_company_name ON user_clients(company_name);

-- 4. RLS
ALTER TABLE user_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User clients can view own data"
  ON user_clients FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "User clients can update own data"
  ON user_clients FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all user clients"
  ON user_clients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all user clients"
  ON user_clients FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- 5. Trigger pour créer l'entrée automatiquement
CREATE OR REPLACE FUNCTION create_user_client_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'client' THEN
    INSERT INTO user_clients (user_id, client_type)
    VALUES (NEW.user_id, 'particulier')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_user_client_created ON profiles;
CREATE TRIGGER on_profile_user_client_created
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_client_entry();

-- 6. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_user_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_clients_updated_at ON user_clients;
CREATE TRIGGER user_clients_updated_at
  BEFORE UPDATE ON user_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_user_clients_updated_at();
