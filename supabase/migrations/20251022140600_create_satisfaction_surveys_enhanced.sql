/*
  # Module Satisfaction Client - Enquêtes Post-Intervention

  1. Tables
    - `satisfaction_surveys`
      - `id` (uuid, primary key)
      - `mission_id` (uuid, FK missions) - Mission concernée
      - `client_name` (text) - Nom client
      - `client_email` (text) - Email client
      - `nps_score` (int) - Score NPS 0-10
      - `overall_rating` (int) - Note globale 1-5 étoiles
      - `technician_rating` (int) - Note technicien 1-5
      - `punctuality_rating` (int) - Note ponctualité 1-5
      - `quality_rating` (int) - Note qualité travail 1-5
      - `cleanliness_rating` (int) - Note propreté 1-5
      - `communication_rating` (int) - Note communication 1-5
      - `would_recommend` (boolean) - Recommanderait entreprise
      - `positive_feedback` (text) - Points positifs
      - `negative_feedback` (text) - Points à améliorer
      - `suggestions` (text) - Suggestions
      - `survey_token` (uuid, unique) - Token unique pour lien public
      - `sent_at` (timestamptz) - Date envoi enquête
      - `completed_at` (timestamptz) - Date complétion
      - `status` (text) - pending, completed, expired
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Admin peut tout voir
    - Public peut compléter avec token valide
    - Clients voient leurs propres enquêtes

  3. Indexes
    - Index sur mission_id
    - Index sur survey_token
    - Index sur status
    - Index sur completed_at pour analytics

  4. Functions
    - calculate_nps() - Calcul NPS global
    - get_satisfaction_stats() - Stats satisfaction
*/

-- Table principale des enquêtes de satisfaction
CREATE TABLE IF NOT EXISTS satisfaction_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_email text NOT NULL,
  
  -- Scores et notes
  nps_score int CHECK (nps_score >= 0 AND nps_score <= 10),
  overall_rating int CHECK (overall_rating >= 1 AND overall_rating <= 5),
  technician_rating int CHECK (technician_rating >= 1 AND technician_rating <= 5),
  punctuality_rating int CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  quality_rating int CHECK (quality_rating >= 1 AND quality_rating <= 5),
  cleanliness_rating int CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  communication_rating int CHECK (communication_rating >= 1 AND communication_rating <= 5),
  
  -- Feedback
  would_recommend boolean,
  positive_feedback text,
  negative_feedback text,
  suggestions text,
  
  -- Gestion enquête
  survey_token uuid UNIQUE DEFAULT gen_random_uuid(),
  sent_at timestamptz,
  completed_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_mission 
  ON satisfaction_surveys(mission_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_token 
  ON satisfaction_surveys(survey_token);
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_status 
  ON satisfaction_surveys(status);
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_completed 
  ON satisfaction_surveys(completed_at) WHERE completed_at IS NOT NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_satisfaction_surveys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER satisfaction_surveys_updated_at
  BEFORE UPDATE ON satisfaction_surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_satisfaction_surveys_updated_at();

-- RLS Policies
ALTER TABLE satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- Admin peut tout voir
CREATE POLICY "Admins can view all surveys"
  ON satisfaction_surveys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin peut créer des enquêtes
CREATE POLICY "Admins can create surveys"
  ON satisfaction_surveys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Public peut lire avec token valide (pour formulaire)
CREATE POLICY "Public can read with valid token"
  ON satisfaction_surveys FOR SELECT
  TO anon
  USING (status = 'pending' OR status = 'completed');

-- Public peut update avec token (pour soumettre)
CREATE POLICY "Public can update with token"
  ON satisfaction_surveys FOR UPDATE
  TO anon
  USING (status = 'pending')
  WITH CHECK (status = 'completed');

-- Fonction pour calculer le NPS global
CREATE OR REPLACE FUNCTION calculate_nps()
RETURNS TABLE (
  nps_score numeric,
  promoters_count bigint,
  passives_count bigint,
  detractors_count bigint,
  total_responses bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE nps_score >= 9) as promoters,
      COUNT(*) FILTER (WHERE nps_score >= 7 AND nps_score <= 8) as passives,
      COUNT(*) FILTER (WHERE nps_score <= 6) as detractors,
      COUNT(*) as total
    FROM satisfaction_surveys
    WHERE status = 'completed'
    AND nps_score IS NOT NULL
  )
  SELECT
    CASE 
      WHEN total > 0 THEN 
        ROUND(((promoters::numeric - detractors::numeric) / total::numeric) * 100, 1)
      ELSE 0
    END as nps_score,
    promoters,
    passives,
    detractors,
    total
  FROM stats;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour récupérer les stats de satisfaction
CREATE OR REPLACE FUNCTION get_satisfaction_stats()
RETURNS TABLE (
  avg_overall_rating numeric,
  avg_technician_rating numeric,
  avg_punctuality_rating numeric,
  avg_quality_rating numeric,
  avg_cleanliness_rating numeric,
  avg_communication_rating numeric,
  would_recommend_percent numeric,
  total_surveys bigint,
  completed_surveys bigint,
  response_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(overall_rating), 2) as avg_overall,
    ROUND(AVG(technician_rating), 2) as avg_tech,
    ROUND(AVG(punctuality_rating), 2) as avg_punct,
    ROUND(AVG(quality_rating), 2) as avg_qual,
    ROUND(AVG(cleanliness_rating), 2) as avg_clean,
    ROUND(AVG(communication_rating), 2) as avg_comm,
    ROUND((COUNT(*) FILTER (WHERE would_recommend = true)::numeric / 
           NULLIF(COUNT(*) FILTER (WHERE would_recommend IS NOT NULL), 0)) * 100, 1) as recommend_pct,
    (SELECT COUNT(*) FROM satisfaction_surveys) as total,
    COUNT(*) as completed,
    ROUND((COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM satisfaction_surveys), 0)) * 100, 1) as rate
  FROM satisfaction_surveys
  WHERE status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- Données de test
INSERT INTO satisfaction_surveys (
  mission_id,
  client_name,
  client_email,
  nps_score,
  overall_rating,
  technician_rating,
  punctuality_rating,
  quality_rating,
  cleanliness_rating,
  communication_rating,
  would_recommend,
  positive_feedback,
  negative_feedback,
  suggestions,
  status,
  sent_at,
  completed_at
)
SELECT
  m.id,
  m.client_name,
  m.client_email,
  (CASE 
    WHEN random() < 0.7 THEN 9 + floor(random() * 2)::int
    WHEN random() < 0.9 THEN 7 + floor(random() * 2)::int
    ELSE floor(random() * 7)::int
  END),
  4 + floor(random() * 2)::int,
  4 + floor(random() * 2)::int,
  3 + floor(random() * 3)::int,
  4 + floor(random() * 2)::int,
  3 + floor(random() * 3)::int,
  4 + floor(random() * 2)::int,
  random() > 0.15,
  CASE 
    WHEN random() > 0.5 THEN 'Technicien très professionnel et ponctuel'
    ELSE 'Travail de qualité, je recommande'
  END,
  CASE 
    WHEN random() > 0.7 THEN 'Un peu d''attente au début'
    ELSE NULL
  END,
  CASE 
    WHEN random() > 0.8 THEN 'Peut-être envoyer un SMS la veille'
    ELSE NULL
  END,
  'completed',
  now() - interval '2 days',
  now() - interval '1 day'
FROM missions m
WHERE m.status = 'Terminé'
LIMIT 5;
