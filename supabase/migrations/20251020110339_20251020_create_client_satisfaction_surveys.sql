/*
  # Create Client Satisfaction Surveys System

  1. New Tables
    - `client_satisfaction_surveys`
      - Post-intervention satisfaction surveys
      - Multiple rating criteria (overall, punctuality, quality, cleanliness, explanation)
      - NPS (Net Promoter Score) tracking
      - Free-form comments
      - Response handling for low scores

  2. Security
    - Enable RLS
    - Admin can view all surveys
    - Clients can view and complete their own surveys
    - Techs can view surveys for their missions

  3. Features
    - Automatic survey sending after mission completion
    - Multiple rating dimensions
    - NPS calculation
    - Alert system for low ratings
    - Response tracking
*/

-- Create client_satisfaction_surveys table
CREATE TABLE IF NOT EXISTS client_satisfaction_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL,
  client_id uuid NOT NULL,
  
  -- Survey delivery
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_via text NOT NULL DEFAULT 'email' CHECK (sent_via IN ('email', 'sms', 'in_person', 'app')),
  
  -- Response tracking
  completed_at timestamptz,
  response_time_minutes integer,
  
  -- Overall satisfaction (1-10 scale)
  overall_rating integer CHECK (overall_rating >= 1 AND overall_rating <= 10),
  
  -- Detailed ratings (1-5 scale)
  punctuality_rating integer CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  quality_rating integer CHECK (quality_rating >= 1 AND quality_rating <= 5),
  cleanliness_rating integer CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  explanation_rating integer CHECK (explanation_rating >= 1 AND explanation_rating <= 5),
  professionalism_rating integer CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  
  -- Net Promoter Score (0-10 scale)
  -- 0-6: Detractors, 7-8: Passives, 9-10: Promoters
  would_recommend integer CHECK (would_recommend >= 0 AND would_recommend <= 10),
  nps_category text, -- 'detractor', 'passive', 'promoter' (auto-calculated)
  
  -- Free-form feedback
  comment text,
  positive_aspects text,
  improvement_suggestions text,
  
  -- Specific questions
  on_time boolean,
  explained_work boolean,
  clean_workspace boolean,
  would_use_again boolean,
  
  -- Follow-up handling
  response_needed boolean DEFAULT false,
  response_priority text CHECK (response_priority IN ('low', 'medium', 'high', 'urgent')),
  response_handled_by uuid,
  response_handled_at timestamptz,
  response_notes text,
  
  -- Public review permission
  allow_public_review boolean DEFAULT false,
  published_as_testimonial boolean DEFAULT false,
  
  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_satisfaction_surveys_mission_id ON client_satisfaction_surveys(mission_id);
CREATE INDEX IF NOT EXISTS idx_client_satisfaction_surveys_client_id ON client_satisfaction_surveys(client_id);
CREATE INDEX IF NOT EXISTS idx_client_satisfaction_surveys_overall_rating ON client_satisfaction_surveys(overall_rating);
CREATE INDEX IF NOT EXISTS idx_client_satisfaction_surveys_nps_category ON client_satisfaction_surveys(nps_category);
CREATE INDEX IF NOT EXISTS idx_client_satisfaction_surveys_response_needed ON client_satisfaction_surveys(response_needed);
CREATE INDEX IF NOT EXISTS idx_client_satisfaction_surveys_completed_at ON client_satisfaction_surveys(completed_at);

-- Enable RLS
ALTER TABLE client_satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- RLS Policies

CREATE POLICY "Admin can view all surveys"
  ON client_satisfaction_surveys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal', 'coordinator')
    )
  );

CREATE POLICY "Admin can manage all surveys"
  ON client_satisfaction_surveys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Clients can view own surveys"
  ON client_satisfaction_surveys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_clients.id = client_satisfaction_surveys.client_id
      AND user_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can complete own surveys"
  ON client_satisfaction_surveys FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_clients.id = client_satisfaction_surveys.client_id
      AND user_clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_clients
      WHERE user_clients.id = client_satisfaction_surveys.client_id
      AND user_clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Techs can view surveys for own missions"
  ON client_satisfaction_surveys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = client_satisfaction_surveys.mission_id
      AND missions.assigned_user_id = auth.uid()
    )
  );

-- Function to calculate NPS category and response priority
CREATE OR REPLACE FUNCTION calculate_survey_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate NPS category
  IF NEW.would_recommend IS NOT NULL THEN
    IF NEW.would_recommend >= 9 THEN
      NEW.nps_category := 'promoter';
    ELSIF NEW.would_recommend >= 7 THEN
      NEW.nps_category := 'passive';
    ELSE
      NEW.nps_category := 'detractor';
    END IF;
  END IF;
  
  -- Calculate response time if just completed
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    NEW.response_time_minutes := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.sent_at)) / 60;
  END IF;
  
  -- Determine if response is needed and priority
  IF NEW.completed_at IS NOT NULL THEN
    -- Overall rating < 7 needs response
    IF NEW.overall_rating IS NOT NULL AND NEW.overall_rating < 7 THEN
      NEW.response_needed := true;
      
      IF NEW.overall_rating <= 4 THEN
        NEW.response_priority := 'urgent';
      ELSIF NEW.overall_rating <= 5 THEN
        NEW.response_priority := 'high';
      ELSE
        NEW.response_priority := 'medium';
      END IF;
    END IF;
    
    -- NPS detractors need response
    IF NEW.nps_category = 'detractor' THEN
      NEW.response_needed := true;
      IF NEW.response_priority IS NULL OR NEW.response_priority = 'low' THEN
        NEW.response_priority := 'medium';
      END IF;
    END IF;
    
    -- Any detailed rating <= 2 needs urgent response
    IF NEW.punctuality_rating <= 2 OR 
       NEW.quality_rating <= 2 OR 
       NEW.cleanliness_rating <= 2 OR 
       NEW.explanation_rating <= 2 OR 
       NEW.professionalism_rating <= 2 THEN
      NEW.response_needed := true;
      NEW.response_priority := 'urgent';
    END IF;
  END IF;
  
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_survey_metrics_trigger ON client_satisfaction_surveys;
CREATE TRIGGER calculate_survey_metrics_trigger
  BEFORE INSERT OR UPDATE ON client_satisfaction_surveys
  FOR EACH ROW
  EXECUTE FUNCTION calculate_survey_metrics();

-- Function to auto-create survey after mission completion
CREATE OR REPLACE FUNCTION auto_create_satisfaction_survey()
RETURNS TRIGGER AS $$
BEGIN
  -- When mission work is completed, create a survey
  IF NEW.work_completed_at IS NOT NULL AND (OLD.work_completed_at IS NULL OR OLD.work_completed_at != NEW.work_completed_at) THEN
    IF NEW.client_id IS NOT NULL THEN
      INSERT INTO client_satisfaction_surveys (mission_id, client_id, sent_at)
      VALUES (NEW.id, NEW.client_id, now())
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_satisfaction_survey_trigger ON missions;
CREATE TRIGGER auto_create_satisfaction_survey_trigger
  AFTER UPDATE OF work_completed_at ON missions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_satisfaction_survey();

COMMENT ON TABLE client_satisfaction_surveys IS 'Client satisfaction surveys sent after mission completion';
COMMENT ON COLUMN client_satisfaction_surveys.nps_category IS 'NPS category: detractor (0-6), passive (7-8), promoter (9-10)';
COMMENT ON COLUMN client_satisfaction_surveys.response_needed IS 'True if rating is low and requires follow-up';
COMMENT ON COLUMN client_satisfaction_surveys.would_recommend IS 'Net Promoter Score question (0-10)';
