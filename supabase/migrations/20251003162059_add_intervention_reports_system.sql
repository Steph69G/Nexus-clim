/*
  # Système de Rapports d'Intervention et Chartes

  ## Tables créées :
  
  ### 1. procedure_templates
  Modèles de procédures/chartes Clim Passion par type d'intervention.
  Chaque template contient une checklist d'étapes à suivre et valider.
  
  ### 2. intervention_reports
  Rapports d'intervention complétés par les techniciens.
  Lien avec les templates pour suivre les procédures obligatoires.
  
  ## Structure des données :
  
  ### procedure_templates
  - Templates réutilisables par type de mission
  - Steps en JSON : étapes numérotées avec options (photo requise, signature, etc.)
  - Permet d'assurer la qualité et la conformité des interventions
  
  ### intervention_reports
  - Un rapport par mission/intervention
  - Suivi de chaque étape complétée avec timestamps
  - Upload de photos avant/après
  - Signatures client + technicien
  - Matériaux utilisés avec quantités et prix
  - Notes sur travaux additionnels nécessaires
  
  ## Sécurité (RLS)
  
  ### procedure_templates
  - **Admins** : Accès complet (CRUD)
  - **Autres** : Lecture seule
  
  ### intervention_reports
  - **Admins** : Accès complet
  - **Techniciens** : Créer et modifier leurs propres rapports
  - **SAL** : Lecture de tous les rapports
*/

-- Create procedure_templates table
CREATE TABLE IF NOT EXISTS procedure_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  mission_type text NOT NULL,
  
  -- Steps structure: 
  -- [{ 
  --   step_number: 1, 
  --   title: "Vérification équipement", 
  --   description: "...",
  --   is_mandatory: true,
  --   requires_photo: true,
  --   requires_signature: false,
  --   requires_measurement: false
  -- }]
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  is_active boolean DEFAULT true,
  version integer DEFAULT 1,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE procedure_templates ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_procedure_templates_mission_type ON procedure_templates(mission_type);
CREATE INDEX IF NOT EXISTS idx_procedure_templates_active ON procedure_templates(is_active);

-- Create intervention_reports table
CREATE TABLE IF NOT EXISTS intervention_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  procedure_template_id uuid REFERENCES procedure_templates(id) ON DELETE SET NULL,
  technician_user_id uuid REFERENCES profiles(user_id) NOT NULL,
  
  -- Steps completion tracking
  -- [{
  --   step_number: 1,
  --   completed: true,
  --   completed_at: "2025-10-03T10:30:00Z",
  --   notes: "RAS",
  --   photo_urls: ["https://...", "https://..."],
  --   measurements: { temperature: 22, pressure: 5.2 }
  -- }]
  steps_completed jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Photos
  photos_before jsonb DEFAULT '[]'::jsonb,
  photos_after jsonb DEFAULT '[]'::jsonb,
  
  -- Signatures
  client_signature_url text,
  technician_signature_url text,
  client_signature_date timestamptz,
  technician_signature_date timestamptz,
  
  -- General observations
  observations text,
  client_feedback text,
  
  -- Materials used
  -- [{
  --   name: "Climatiseur Daikin 12000 BTU",
  --   reference: "DAI-12K",
  --   quantity: 1,
  --   unit_price_cents: 89900,
  --   total_cents: 89900
  -- }]
  materials_used jsonb DEFAULT '[]'::jsonb,
  
  -- Additional work needed
  additional_work_needed boolean DEFAULT false,
  additional_work_notes text,
  
  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  duration_minutes integer,
  
  -- Status
  status text DEFAULT 'en_cours' CHECK (status IN ('en_cours', 'terminé', 'validé')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE intervention_reports ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intervention_reports_mission ON intervention_reports(mission_id);
CREATE INDEX IF NOT EXISTS idx_intervention_reports_technician ON intervention_reports(technician_user_id);
CREATE INDEX IF NOT EXISTS idx_intervention_reports_status ON intervention_reports(status);
CREATE INDEX IF NOT EXISTS idx_intervention_reports_appointment ON intervention_reports(appointment_id);
CREATE INDEX IF NOT EXISTS idx_intervention_reports_template ON intervention_reports(procedure_template_id);

-- RLS Policies for procedure_templates

-- Everyone authenticated can read templates
CREATE POLICY "Authenticated users can view procedure templates"
  ON procedure_templates FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create/update/delete templates
CREATE POLICY "Admins can create procedure templates"
  ON procedure_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update procedure templates"
  ON procedure_templates FOR UPDATE
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

CREATE POLICY "Admins can delete procedure templates"
  ON procedure_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for intervention_reports

-- Admins: Full access
CREATE POLICY "Admins can view all intervention reports"
  ON intervention_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create intervention reports"
  ON intervention_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update intervention reports"
  ON intervention_reports FOR UPDATE
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

CREATE POLICY "Admins can delete intervention reports"
  ON intervention_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- SAL: Read-only access
CREATE POLICY "SAL can view all intervention reports"
  ON intervention_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  );

-- Techs: Can view and manage their own reports
CREATE POLICY "Techs can view their own intervention reports"
  ON intervention_reports FOR SELECT
  TO authenticated
  USING (
    technician_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'tech'
    )
  );

CREATE POLICY "Techs can create their own intervention reports"
  ON intervention_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    technician_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'tech'
    )
  );

CREATE POLICY "Techs can update their own intervention reports"
  ON intervention_reports FOR UPDATE
  TO authenticated
  USING (
    technician_user_id = auth.uid()
    AND status != 'validé'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'tech'
    )
  )
  WITH CHECK (
    technician_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'tech'
    )
  );

-- Subcontractors: Can view and manage their own reports
CREATE POLICY "Subcontractors can view their own intervention reports"
  ON intervention_reports FOR SELECT
  TO authenticated
  USING (
    technician_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'subcontractor'
    )
  );

CREATE POLICY "Subcontractors can create their own intervention reports"
  ON intervention_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    technician_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'subcontractor'
    )
  );

CREATE POLICY "Subcontractors can update their own intervention reports"
  ON intervention_reports FOR UPDATE
  TO authenticated
  USING (
    technician_user_id = auth.uid()
    AND status != 'validé'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'subcontractor'
    )
  )
  WITH CHECK (
    technician_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'subcontractor'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_procedure_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_intervention_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS set_procedure_templates_updated_at ON procedure_templates;
CREATE TRIGGER set_procedure_templates_updated_at
  BEFORE UPDATE ON procedure_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_procedure_templates_updated_at();

DROP TRIGGER IF EXISTS set_intervention_reports_updated_at ON intervention_reports;
CREATE TRIGGER set_intervention_reports_updated_at
  BEFORE UPDATE ON intervention_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_intervention_reports_updated_at();

-- Function to calculate duration automatically
CREATE OR REPLACE FUNCTION calculate_intervention_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.started_at IS NOT NULL AND NEW.completed_at IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_intervention_duration_trigger ON intervention_reports;
CREATE TRIGGER calculate_intervention_duration_trigger
  BEFORE INSERT OR UPDATE ON intervention_reports
  FOR EACH ROW
  EXECUTE FUNCTION calculate_intervention_duration();