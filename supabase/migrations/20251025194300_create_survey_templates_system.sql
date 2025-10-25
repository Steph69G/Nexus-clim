/*
  # Survey Templates System - Système d'Enquêtes Personnalisables

  ## Vue d'ensemble
  Système flexible de création d'enquêtes de satisfaction avec templates pré-définis et personnalisables.

  ## Nouvelles Tables

  ### survey_templates
  Templates d'enquêtes (Installation, Maintenance, Commercial, Custom)
  - `id` (uuid, PK)
  - `name` (text) - Nom du template
  - `description` (text) - Description
  - `type` (enum) - Type d'enquête
  - `is_active` (boolean) - Template actif
  - `is_system` (boolean) - Template système non supprimable
  - `created_by` (uuid) - Créateur
  - `created_at` (timestamptz)

  ### survey_questions
  Questions des templates
  - `id` (uuid, PK)
  - `template_id` (uuid, FK)
  - `section` (text) - Section de regroupement
  - `question_text` (text) - Texte de la question
  - `question_type` (enum) - Type de question
  - `options` (jsonb) - Options pour choix multiples
  - `is_required` (boolean) - Question obligatoire
  - `order_index` (int) - Ordre d'affichage

  ### survey_responses
  Réponses aux questions (remplace colonnes fixes)
  - `id` (uuid, PK)
  - `survey_id` (uuid, FK)
  - `question_id` (uuid, FK)
  - `response_type` (text) - Type de réponse
  - `rating_value` (int) - Pour étoiles/NPS
  - `text_value` (text) - Pour texte libre
  - `choice_values` (jsonb) - Pour choix multiples
  - `created_at` (timestamptz)

  ## Modifications

  ### satisfaction_surveys
  - Ajout de `template_id` (FK vers survey_templates)

  ## Sécurité RLS
  - Admin: CRUD complet sur tous les templates
  - SAL: Peut créer templates type "commercial"
  - Tech: Lecture seule
  - Public: Aucun accès aux templates

  ## Data Seed
  3 templates par défaut:
  1. Installation Premium (7 questions)
  2. Maintenance Express (6 questions)
  3. Commercial Devis (5 questions)
*/

-- Type d'enquête
DO $$ BEGIN
  CREATE TYPE survey_template_type AS ENUM (
    'installation',
    'maintenance', 
    'urgency',
    'commercial',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Type de question
DO $$ BEGIN
  CREATE TYPE survey_question_type AS ENUM (
    'rating_stars',
    'rating_nps',
    'text_short',
    'text_long',
    'choice_single',
    'choice_multiple',
    'yes_no'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table des templates
CREATE TABLE IF NOT EXISTS survey_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type survey_template_type NOT NULL DEFAULT 'custom',
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  created_by uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Table des questions
CREATE TABLE IF NOT EXISTS survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES survey_templates(id) ON DELETE CASCADE,
  section text NOT NULL,
  question_text text NOT NULL,
  question_type survey_question_type NOT NULL,
  options jsonb DEFAULT '[]'::jsonb,
  is_required boolean DEFAULT true,
  order_index int NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table des réponses
CREATE TABLE IF NOT EXISTS survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES satisfaction_surveys(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  response_type text NOT NULL,
  rating_value int,
  text_value text,
  choice_values jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Ajouter template_id à satisfaction_surveys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'satisfaction_surveys' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE satisfaction_surveys 
    ADD COLUMN template_id uuid REFERENCES survey_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_survey_questions_template ON survey_questions(template_id, order_index);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_question ON survey_responses(question_id);

-- RLS pour survey_templates
ALTER TABLE survey_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage all templates" ON survey_templates;
CREATE POLICY "Admin can manage all templates"
  ON survey_templates FOR ALL
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

DROP POLICY IF EXISTS "SAL can manage commercial templates" ON survey_templates;
CREATE POLICY "SAL can manage commercial templates"
  ON survey_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'sal'
    )
    AND (type = 'commercial' OR created_by = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'sal'
    )
    AND type = 'commercial'
  );

DROP POLICY IF EXISTS "Everyone can view active templates" ON survey_templates;
CREATE POLICY "Everyone can view active templates"
  ON survey_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS pour survey_questions
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage all questions" ON survey_questions;
CREATE POLICY "Admin can manage all questions"
  ON survey_questions FOR ALL
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

DROP POLICY IF EXISTS "SAL can manage commercial template questions" ON survey_questions;
CREATE POLICY "SAL can manage commercial template questions"
  ON survey_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN survey_templates st ON st.id = survey_questions.template_id
      WHERE p.user_id = auth.uid() 
      AND p.role = 'sal'
      AND (st.type = 'commercial' OR st.created_by = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN survey_templates st ON st.id = survey_questions.template_id
      WHERE p.user_id = auth.uid() 
      AND p.role = 'sal'
      AND st.type = 'commercial'
    )
  );

DROP POLICY IF EXISTS "Everyone can view questions of active templates" ON survey_questions;
CREATE POLICY "Everyone can view questions of active templates"
  ON survey_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_templates 
      WHERE survey_templates.id = survey_questions.template_id 
      AND survey_templates.is_active = true
    )
  );

DROP POLICY IF EXISTS "Public can view questions via token" ON survey_questions;
CREATE POLICY "Public can view questions via token"
  ON survey_questions FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM survey_templates 
      WHERE survey_templates.id = survey_questions.template_id 
      AND survey_templates.is_active = true
    )
  );

-- RLS pour survey_responses
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all responses" ON survey_responses;
CREATE POLICY "Admin can view all responses"
  ON survey_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "SAL can view commercial responses" ON survey_responses;
CREATE POLICY "SAL can view commercial responses"
  ON survey_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN satisfaction_surveys ss ON ss.id = survey_responses.survey_id
      JOIN survey_templates st ON st.id = ss.template_id
      WHERE p.user_id = auth.uid() 
      AND p.role = 'sal'
      AND st.type = 'commercial'
    )
  );

DROP POLICY IF EXISTS "Public can insert responses" ON survey_responses;
CREATE POLICY "Public can insert responses"
  ON survey_responses FOR INSERT
  TO anon
  WITH CHECK (true);

-- Seed data avec UUIDs générés
DO $$
DECLARE
  template_installation_id uuid := gen_random_uuid();
  template_maintenance_id uuid := gen_random_uuid();
  template_commercial_id uuid := gen_random_uuid();
BEGIN
  -- Template 1: Installation Premium
  INSERT INTO survey_templates (id, name, description, type, is_active, is_system)
  VALUES (
    template_installation_id,
    'Installation Premium',
    'Enquête de satisfaction après installation de climatisation',
    'installation',
    true,
    true
  );

  INSERT INTO survey_questions (template_id, section, question_text, question_type, is_required, order_index)
  VALUES
    (template_installation_id, 'Satisfaction Générale', 'Quelle est votre satisfaction globale ?', 'rating_stars', true, 1),
    (template_installation_id, 'Intervention', 'Comment évaluez-vous la qualité de l''installation ?', 'rating_stars', true, 2),
    (template_installation_id, 'Intervention', 'Le chantier a-t-il été laissé propre et rangé ?', 'rating_stars', true, 3),
    (template_installation_id, 'Technicien', 'Les explications sur le fonctionnement vous ont-elles été claires ?', 'rating_stars', true, 4),
    (template_installation_id, 'Équipement', 'Tout fonctionne-t-il correctement ?', 'yes_no', true, 5),
    (template_installation_id, 'Commentaires', 'Avez-vous des remarques ou suggestions ?', 'text_long', false, 6),
    (template_installation_id, 'Recommandation', 'Recommanderiez-vous nos services ? (0 = Pas du tout, 10 = Certainement)', 'rating_nps', true, 7);

  -- Template 2: Maintenance Express
  INSERT INTO survey_templates (id, name, description, type, is_active, is_system)
  VALUES (
    template_maintenance_id,
    'Maintenance Express',
    'Enquête de satisfaction après intervention de maintenance',
    'maintenance',
    true,
    true
  );

  INSERT INTO survey_questions (template_id, section, question_text, question_type, options, is_required, order_index)
  VALUES
    (template_maintenance_id, 'Satisfaction Générale', 'Quelle est votre satisfaction globale ?', 'rating_stars', '[]', true, 1),
    (template_maintenance_id, 'Intervention', 'Êtes-vous satisfait de la rapidité d''intervention ?', 'rating_stars', '[]', true, 2),
    (template_maintenance_id, 'Technicien', 'Le technicien a-t-il été efficace et professionnel ?', 'rating_stars', '[]', true, 3),
    (template_maintenance_id, 'Intervention', 'Type d''intervention effectuée', 'choice_single', '["Maintenance préventive", "Réparation", "Dépannage urgent", "Autre"]', true, 4),
    (template_maintenance_id, 'Commentaires', 'Commentaires ou suggestions', 'text_long', '[]', false, 5),
    (template_maintenance_id, 'Recommandation', 'Recommanderiez-vous nos services ? (0-10)', 'rating_nps', '[]', true, 6);

  -- Template 3: Commercial Devis
  INSERT INTO survey_templates (id, name, description, type, is_active, is_system)
  VALUES (
    template_commercial_id,
    'Commercial Devis',
    'Enquête de satisfaction après rendez-vous commercial ou devis',
    'commercial',
    true,
    true
  );

  INSERT INTO survey_questions (template_id, section, question_text, question_type, options, is_required, order_index)
  VALUES
    (template_commercial_id, 'Accueil', 'Comment évaluez-vous la qualité de l''accueil ?', 'rating_stars', '[]', true, 1),
    (template_commercial_id, 'Commercial', 'Les explications étaient-elles claires et compréhensibles ?', 'rating_stars', '[]', true, 2),
    (template_commercial_id, 'Proposition', 'La solution proposée répond-elle à vos besoins ?', 'rating_stars', '[]', true, 3),
    (template_commercial_id, 'Décision', 'Avez-vous accepté le devis ?', 'yes_no', '[]', true, 4),
    (template_commercial_id, 'Commentaires', 'Remarques ou suggestions', 'text_long', '[]', false, 5);
END $$;
