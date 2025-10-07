/*
  # Ajouter le rayon d'intervention aux profils utilisateur

  1. Modifications
    - Ajouter la colonne `radius_km` à la table `profiles`
    - Type: integer (nombre de kilomètres)
    - Valeur par défaut: 25 km
    - Nullable: true (pour les utilisateurs existants)

  2. Notes
    - Cette colonne permet aux ST/SAL de définir leur périmètre d'intervention
    - Utilisée par la carte admin pour déterminer l'éligibilité aux missions
*/

-- Ajouter la colonne radius_km à la table profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS radius_km integer DEFAULT 25;

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN profiles.radius_km IS 'Rayon d''intervention en kilomètres depuis la ville de base de l''utilisateur';