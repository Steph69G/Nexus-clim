/*
  # Amélioration Système Rapports d'Intervention v2

  1. Amélioration table intervention_reports existante
  2. Nouvelle table report_templates (templates structurés)
  3. Nouvelle table report_sections (sections rapport)
  4. Functions génération
  5. Security RLS
*/

-- Amélioration table intervention_reports existante
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_reports' AND column_name = 'work_performed') THEN
    ALTER TABLE intervention_reports ADD COLUMN work_performed text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_reports' AND column_name = 'parts_used_json') THEN
    ALTER TABLE intervention_reports ADD COLUMN parts_used_json jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_reports' AND column_name = 'recommendations') THEN
    ALTER TABLE intervention_reports ADD COLUMN recommendations text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_reports' AND column_name = 'hours_worked') THEN
    ALTER TABLE intervention_reports ADD COLUMN hours_worked decimal(5,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_reports' AND column_name = 'pdf_url') THEN
    ALTER TABLE intervention_reports ADD COLUMN pdf_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_reports' AND column_name = 'sent_to_client_at') THEN
    ALTER TABLE intervention_reports ADD COLUMN sent_to_client_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_reports' AND column_name = 'status') THEN
    ALTER TABLE intervention_reports ADD COLUMN status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'validated', 'sent'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_reports' AND column_name = 'report_date') THEN
    ALTER TABLE intervention_reports ADD COLUMN report_date date DEFAULT CURRENT_DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_reports' AND column_name = 'client_name') THEN
    ALTER TABLE intervention_reports ADD COLUMN client_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intervention_reports' AND column_name = 'intervention_address') THEN
    ALTER TABLE intervention_reports ADD COLUMN intervention_address text;
  END IF;
END $$;

-- Table templates rapports
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  template_type text NOT NULL DEFAULT 'intervention' CHECK (template_type IN ('intervention', 'maintenance', 'diagnostic', 'installation')),
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  html_template text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table sections rapport
CREATE TABLE IF NOT EXISTS report_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES intervention_reports(id) ON DELETE CASCADE,
  section_type text NOT NULL,
  section_title text NOT NULL,
  section_content text,
  section_data jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_sections_report ON report_sections(report_id);
CREATE INDEX IF NOT EXISTS idx_report_sections_type ON report_sections(section_type);

-- Fonction génération rapport depuis mission
CREATE OR REPLACE FUNCTION generate_intervention_report(
  p_mission_id uuid,
  p_technician_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_report_id uuid;
  v_mission record;
  v_total_hours decimal;
BEGIN
  SELECT * INTO v_mission FROM missions WHERE id = p_mission_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission introuvable';
  END IF;
  
  SELECT COALESCE(SUM(billable_duration_minutes) / 60.0, 0)
  INTO v_total_hours
  FROM time_entries
  WHERE mission_id = p_mission_id
  AND user_id = p_technician_id
  AND status = 'validated';
  
  INSERT INTO intervention_reports (
    mission_id,
    technician_user_id,
    report_date,
    client_name,
    intervention_address,
    hours_worked,
    status
  ) VALUES (
    p_mission_id,
    p_technician_id,
    CURRENT_DATE,
    v_mission.client_name,
    v_mission.address || ', ' || v_mission.city,
    v_total_hours,
    'draft'
  ) RETURNING id INTO v_report_id;
  
  INSERT INTO report_sections (
    report_id,
    section_type,
    section_title,
    sort_order
  ) VALUES
    (v_report_id, 'summary', 'Résumé Intervention', 1),
    (v_report_id, 'diagnosis', 'Diagnostic', 2),
    (v_report_id, 'work', 'Travaux Effectués', 3),
    (v_report_id, 'parts', 'Pièces Utilisées', 4),
    (v_report_id, 'recommendations', 'Recommandations', 5);
  
  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql;

-- Template par défaut
INSERT INTO report_templates (name, description, template_type, is_default, sections) VALUES (
  'Standard Intervention',
  'Template standard rapport intervention',
  'intervention',
  true,
  '[
    {"type": "summary", "title": "Résumé", "required": true},
    {"type": "diagnosis", "title": "Diagnostic", "required": true},
    {"type": "work", "title": "Travaux", "required": true},
    {"type": "parts", "title": "Pièces", "required": false},
    {"type": "recommendations", "title": "Recommandations", "required": false},
    {"type": "photos", "title": "Photos", "required": false}
  ]'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- RLS report_templates
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active templates"
  ON report_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin can manage templates"
  ON report_templates FOR ALL
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

-- RLS report_sections
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sections of their reports"
  ON report_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM intervention_reports ir
      WHERE ir.id = report_sections.report_id
      AND (
        ir.technician_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role IN ('admin', 'sal')
        )
      )
    )
  );

CREATE POLICY "Technicians can manage sections of their reports"
  ON report_sections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM intervention_reports ir
      WHERE ir.id = report_sections.report_id
      AND ir.technician_user_id = auth.uid()
      AND ir.status IN ('draft', 'submitted')
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM intervention_reports ir
      WHERE ir.id = report_sections.report_id
      AND ir.technician_user_id = auth.uid()
      AND ir.status IN ('draft', 'submitted')
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );
