/*
  # Ajouter les champs d'adresse aux profils

  1. Nouvelles colonnes
    - `address` (text) - Adresse complète
    - `zip` (text) - Code postal  
    - `lat` (double precision) - Latitude
    - `lng` (double precision) - Longitude

  2. Notes
    - Même structure que la table missions
    - Permet l'utilisation de Google Places
    - Coordonnées pour géolocalisation
*/

-- Ajouter les colonnes d'adresse aux profils (comme dans missions)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;