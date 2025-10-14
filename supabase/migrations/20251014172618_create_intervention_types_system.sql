/*
  # Système de gestion des types d'interventions

  1. Nouvelles tables
    - `intervention_types`
      - `id` (uuid, primary key)
      - `code` (text, unique) - Code court (ex: "ENTR", "DEP")
      - `label` (text) - Libellé affiché (ex: "Entretien")
      - `icon_name` (text) - Nom de l'icône Lucide React
      - `color` (text) - Couleur (emerald, amber, blue, etc.)
      - `is_active` (boolean) - Type actif ou désactivé
      - `display_order` (integer) - Ordre d'affichage
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, foreign key to auth.users)
      - `updated_by` (uuid, foreign key to auth.users)

    - `intervention_types_history`
      - `id` (uuid, primary key)
      - `intervention_type_id` (uuid, foreign key)
      - `action` (text) - CREATE, UPDATE, DELETE, ACTIVATE, DEACTIVATE
      - `old_values` (jsonb) - Anciennes valeurs
      - `new_values` (jsonb) - Nouvelles valeurs
      - `changed_by` (uuid, foreign key to auth.users)
      - `changed_at` (timestamptz)

  2. Sécurité
    - RLS activé sur les deux tables
    - Lecture publique pour intervention_types actifs
    - Modification réservée aux admins
    - Historique visible uniquement aux admins

  3. Données initiales
    - Insert des 6 types existants par défaut
*/

-- Table principale des types d'interventions
CREATE TABLE IF NOT EXISTS intervention_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  icon_name text NOT NULL DEFAULT 'Wrench',
  color text NOT NULL DEFAULT 'blue',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Table d'historique des modifications
CREATE TABLE IF NOT EXISTS intervention_types_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_type_id uuid REFERENCES intervention_types(id) ON DELETE CASCADE,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_intervention_types_active ON intervention_types(is_active);
CREATE INDEX IF NOT EXISTS idx_intervention_types_order ON intervention_types(display_order);
CREATE INDEX IF NOT EXISTS idx_intervention_types_history_type ON intervention_types_history(intervention_type_id);
CREATE INDEX IF NOT EXISTS idx_intervention_types_history_changed_at ON intervention_types_history(changed_at DESC);

-- RLS sur intervention_types
ALTER TABLE intervention_types ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les types actifs
CREATE POLICY "Anyone can view active intervention types"
  ON intervention_types
  FOR SELECT
  USING (is_active = true);

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all intervention types"
  ON intervention_types
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seuls les admins peuvent créer
CREATE POLICY "Admins can create intervention types"
  ON intervention_types
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seuls les admins peuvent modifier
CREATE POLICY "Admins can update intervention types"
  ON intervention_types
  FOR UPDATE
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

-- Seuls les admins peuvent supprimer (soft delete recommandé via is_active)
CREATE POLICY "Admins can delete intervention types"
  ON intervention_types
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS sur intervention_types_history
ALTER TABLE intervention_types_history ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent voir l'historique
CREATE POLICY "Admins can view intervention types history"
  ON intervention_types_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seuls les admins peuvent créer des entrées d'historique
CREATE POLICY "Admins can create intervention types history"
  ON intervention_types_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_intervention_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS set_intervention_types_updated_at ON intervention_types;
CREATE TRIGGER set_intervention_types_updated_at
  BEFORE UPDATE ON intervention_types
  FOR EACH ROW
  EXECUTE FUNCTION update_intervention_types_updated_at();

-- Insertion des types par défaut
INSERT INTO intervention_types (code, label, icon_name, color, display_order, is_active)
VALUES
  ('ENTR', 'Entretien', 'Wrench', 'emerald', 1, true),
  ('DEP', 'Dépannage', 'Zap', 'amber', 2, true),
  ('INST', 'Installation', 'Package', 'blue', 3, true),
  ('PACS', 'PAC / Clim', 'Wind', 'cyan', 4, true),
  ('CHAUDIERE', 'Chaudière', 'Flame', 'orange', 5, true),
  ('PLOMBERIE', 'Plomberie', 'Droplets', 'sky', 6, true)
ON CONFLICT (code) DO NOTHING;
