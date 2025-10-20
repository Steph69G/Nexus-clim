/*
  # Create Installation Checklists System

  1. New Tables
    - `installation_checklists`
      - Digital version of "Fiche de Contrôle Chantier"
      - Links to mission
      - Checklist items (conforme devis, étanchéité, CERFA, etc.)
      - Photos before/after
      - Validation workflow
      - Triggers payment release for subcontractors

  2. Security
    - Enable RLS
    - Admin can view all checklists
    - Techs/ST can complete checklists for their missions
    - Coordinators can validate checklists

  3. Features
    - Comprehensive quality checklist
    - Photo uploads (before/after)
    - Two-step validation (completion + validation)
    - Auto-trigger payment for ST when validated
*/

-- Create installation_checklists table
CREATE TABLE IF NOT EXISTS installation_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL,
  
  -- Checklist items (based on Fiche de Contrôle Chantier)
  conforme_au_devis boolean DEFAULT false,
  test_etancheite_ok boolean DEFAULT false,
  test_pression_ok boolean DEFAULT false,
  cerfa_rempli boolean DEFAULT false,
  explication_client_ok boolean DEFAULT false,
  nettoyage_ok boolean DEFAULT false,
  photos_avant_apres_ok boolean DEFAULT false,
  signature_client_obtenue boolean DEFAULT false,
  
  -- Additional quality checks
  mise_en_service_ok boolean DEFAULT false,
  reglages_optimaux_ok boolean DEFAULT false,
  documentation_remise boolean DEFAULT false,
  garantie_expliquee boolean DEFAULT false,
  
  -- Photos (URLs from Supabase Storage)
  photos_before jsonb DEFAULT '[]'::jsonb,
  photos_after jsonb DEFAULT '[]'::jsonb,
  photos_installation jsonb DEFAULT '[]'::jsonb,
  
  -- Test results
  pression_bar numeric(5,2),
  temperature_soufflage_celsius numeric(5,2),
  puissance_electrique_watts integer,
  
  -- Observations
  observations text,
  client_feedback text,
  issues_encountered text,
  
  -- Completion (by tech or subcontractor)
  completed_by uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  
  -- Validation (by coordinator or admin)
  validated_by uuid,
  validated_at timestamptz,
  validation_status text DEFAULT 'pending' CHECK (validation_status IN (
    'pending',      -- awaiting validation
    'approved',     -- approved by coordinator
    'rejected',     -- rejected - needs corrections
    'corrected'     -- corrections made, awaiting re-validation
  )),
  rejection_reason text,
  
  -- Payment release (for subcontractors)
  payment_released boolean DEFAULT false,
  payment_released_at timestamptz,
  payment_released_by uuid,
  
  -- Client satisfaction (quick rating after installation)
  client_rating integer CHECK (client_rating >= 1 AND client_rating <= 5),
  client_comment text,
  client_signature_url text,
  
  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_installation_checklists_mission_id ON installation_checklists(mission_id);
CREATE INDEX IF NOT EXISTS idx_installation_checklists_completed_by ON installation_checklists(completed_by);
CREATE INDEX IF NOT EXISTS idx_installation_checklists_validated_by ON installation_checklists(validated_by);
CREATE INDEX IF NOT EXISTS idx_installation_checklists_validation_status ON installation_checklists(validation_status);
CREATE INDEX IF NOT EXISTS idx_installation_checklists_payment_released ON installation_checklists(payment_released);

-- Enable RLS
ALTER TABLE installation_checklists ENABLE ROW LEVEL SECURITY;

-- RLS Policies

CREATE POLICY "Admin can view all checklists"
  ON installation_checklists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Admin and coordinators can manage all checklists"
  ON installation_checklists FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Techs and ST can view checklists for assigned missions"
  ON installation_checklists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = installation_checklists.mission_id
      AND missions.assigned_user_id = auth.uid()
    )
  );

CREATE POLICY "Techs and ST can create checklists for assigned missions"
  ON installation_checklists FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = installation_checklists.mission_id
      AND missions.assigned_user_id = auth.uid()
    )
  );

CREATE POLICY "Techs and ST can update own checklists"
  ON installation_checklists FOR UPDATE
  TO authenticated
  USING (
    completed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
    )
  )
  WITH CHECK (
    completed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
    )
  );

-- Function to auto-release payment when checklist is approved
CREATE OR REPLACE FUNCTION handle_checklist_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_is_subcontractor boolean;
BEGIN
  -- Check if validation_status changed to 'approved'
  IF NEW.validation_status = 'approved' AND (OLD.validation_status IS NULL OR OLD.validation_status != 'approved') THEN
    
    -- Check if completed_by is a subcontractor
    SELECT profiles.role = 'subcontractor'
    INTO v_is_subcontractor
    FROM profiles
    WHERE profiles.user_id = NEW.completed_by;
    
    -- If subcontractor and not already released, release payment
    IF v_is_subcontractor AND NOT NEW.payment_released THEN
      NEW.payment_released := true;
      NEW.payment_released_at := now();
      NEW.payment_released_by := NEW.validated_by;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_checklist_approval_trigger ON installation_checklists;
CREATE TRIGGER handle_checklist_approval_trigger
  BEFORE UPDATE OF validation_status ON installation_checklists
  FOR EACH ROW
  EXECUTE FUNCTION handle_checklist_approval();

-- Function to update mission status when checklist is completed
CREATE OR REPLACE FUNCTION update_mission_on_checklist_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- When checklist is approved, update mission work_completed_at if not set
  IF NEW.validation_status = 'approved' THEN
    UPDATE missions
    SET work_completed_at = COALESCE(work_completed_at, NEW.completed_at)
    WHERE id = NEW.mission_id
    AND work_completed_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_mission_on_checklist_completion_trigger ON installation_checklists;
CREATE TRIGGER update_mission_on_checklist_completion_trigger
  AFTER UPDATE OF validation_status ON installation_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_mission_on_checklist_completion();

COMMENT ON TABLE installation_checklists IS 'Digital installation quality checklists (Fiche de Contrôle Chantier)';
COMMENT ON COLUMN installation_checklists.payment_released IS 'Automatically set to true when checklist is approved for subcontractors';
COMMENT ON COLUMN installation_checklists.validation_status IS 'Workflow: pending -> approved/rejected -> (if rejected) corrected -> approved';
