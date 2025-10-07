/*
  # Ajouter adresse de domicile à user_clients

  ## Modifications

  1. **Ajout des champs d'adresse de domicile**
     - home_address : Adresse complète du domicile
     - home_zip : Code postal du domicile
     - home_city : Ville du domicile
     - use_home_for_billing : Boolean pour utiliser l'adresse de domicile pour la facturation

  2. **Logique métier**
     - Si use_home_for_billing = true, les champs billing_* sont optionnels
     - Si use_home_for_billing = false, les champs billing_* doivent être renseignés séparément
*/

-- Ajouter les colonnes d'adresse de domicile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_clients' AND column_name = 'home_address'
  ) THEN
    ALTER TABLE user_clients ADD COLUMN home_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_clients' AND column_name = 'home_zip'
  ) THEN
    ALTER TABLE user_clients ADD COLUMN home_zip text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_clients' AND column_name = 'home_city'
  ) THEN
    ALTER TABLE user_clients ADD COLUMN home_city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_clients' AND column_name = 'use_home_for_billing'
  ) THEN
    ALTER TABLE user_clients ADD COLUMN use_home_for_billing boolean DEFAULT true;
  END IF;
END $$;

-- Index pour recherche par ville
CREATE INDEX IF NOT EXISTS idx_user_clients_home_city ON user_clients(home_city);
CREATE INDEX IF NOT EXISTS idx_user_clients_home_zip ON user_clients(home_zip);
