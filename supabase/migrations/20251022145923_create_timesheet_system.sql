/*
  # Système de Pointage Heures (Timesheet)

  1. Tables
    - time_entries (pointages heures)
      - id, mission_id, user_id
      - start_time, end_time, duration_minutes
      - break_duration_minutes, billable_duration_minutes
      - entry_type (work/travel/pause)
      - status (draft/submitted/validated/rejected)
      - notes, validated_by, validated_at
      - created_at, updated_at

    - time_entry_breaks (pauses détaillées)
      - id, time_entry_id
      - start_time, end_time, duration_minutes
      - break_type (lunch/coffee/other)

  2. Vues
    - time_entries_summary (résumé heures par mission/user)
    - billable_hours_by_user (heures facturables par tech)

  3. Functions
    - calculate_entry_duration() - Calcul auto durées
    - validate_time_entry() - Validation heures
    - get_weekly_hours() - Résumé hebdo

  4. Security
    - RLS complet
    - Tech gèrent leurs entrées
    - Admin/SAL valident
*/

-- Table pointages heures
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE,
  
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_minutes integer DEFAULT 0,
  break_duration_minutes integer DEFAULT 0,
  billable_duration_minutes integer DEFAULT 0,
  
  entry_type text NOT NULL DEFAULT 'work' CHECK (entry_type IN ('work', 'travel', 'pause')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'submitted', 'validated', 'rejected')),
  
  notes text,
  internal_notes text,
  
  validated_by uuid REFERENCES profiles(user_id),
  validated_at timestamptz,
  rejection_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table pauses détaillées
CREATE TABLE IF NOT EXISTS time_entry_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid REFERENCES time_entries(id) ON DELETE CASCADE,
  
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_minutes integer DEFAULT 0,
  break_type text NOT NULL DEFAULT 'other' CHECK (break_type IN ('lunch', 'coffee', 'other')),
  
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_mission ON time_entries(mission_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(start_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entry_breaks_entry ON time_entry_breaks(time_entry_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_time_entries_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_time_entries_timestamp();

-- Trigger calcul durées automatique
CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS TRIGGER AS $$
DECLARE
  total_break_minutes integer;
BEGIN
  IF NEW.end_time IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    
    SELECT COALESCE(SUM(duration_minutes), 0)
    INTO total_break_minutes
    FROM time_entry_breaks
    WHERE time_entry_id = NEW.id;
    
    NEW.break_duration_minutes := total_break_minutes;
    NEW.billable_duration_minutes := GREATEST(0, NEW.duration_minutes - total_break_minutes);
    
    IF NEW.status = 'running' THEN
      NEW.status := 'draft';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entry_calculate_duration
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_duration();

-- Trigger calcul durée pause
CREATE OR REPLACE FUNCTION calculate_break_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER break_calculate_duration
  BEFORE INSERT OR UPDATE ON time_entry_breaks
  FOR EACH ROW
  EXECUTE FUNCTION calculate_break_duration();

-- Fonction validation entrée temps
CREATE OR REPLACE FUNCTION validate_time_entry(
  p_entry_id uuid,
  p_validator_id uuid,
  p_approved boolean,
  p_rejection_reason text DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  IF p_approved THEN
    UPDATE time_entries
    SET 
      status = 'validated',
      validated_by = p_validator_id,
      validated_at = now()
    WHERE id = p_entry_id;
  ELSE
    UPDATE time_entries
    SET 
      status = 'rejected',
      validated_by = p_validator_id,
      validated_at = now(),
      rejection_reason = p_rejection_reason
    WHERE id = p_entry_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Vue résumé heures par mission/user
CREATE OR REPLACE VIEW time_entries_summary AS
SELECT 
  te.mission_id,
  te.user_id,
  m.title as mission_title,
  p.full_name as user_name,
  COUNT(te.id) as entry_count,
  SUM(te.duration_minutes) as total_minutes,
  SUM(te.break_duration_minutes) as total_break_minutes,
  SUM(te.billable_duration_minutes) as total_billable_minutes,
  ROUND(SUM(te.billable_duration_minutes) / 60.0, 2) as billable_hours
FROM time_entries te
LEFT JOIN missions m ON m.id = te.mission_id
LEFT JOIN profiles p ON p.user_id = te.user_id
WHERE te.status IN ('validated', 'submitted')
GROUP BY te.mission_id, te.user_id, m.title, p.full_name;

-- Vue heures facturables par user
CREATE OR REPLACE VIEW billable_hours_by_user AS
SELECT 
  te.user_id,
  p.full_name,
  p.role,
  DATE_TRUNC('week', te.start_time) as week_start,
  COUNT(DISTINCT te.mission_id) as mission_count,
  SUM(te.billable_duration_minutes) as total_billable_minutes,
  ROUND(SUM(te.billable_duration_minutes) / 60.0, 2) as billable_hours
FROM time_entries te
LEFT JOIN profiles p ON p.user_id = te.user_id
WHERE te.status = 'validated'
GROUP BY te.user_id, p.full_name, p.role, DATE_TRUNC('week', te.start_time);

-- RLS time_entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Users can create their own entries"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Users can update their draft entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (
    (user_id = auth.uid() AND status IN ('draft', 'running'))
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  )
  WITH CHECK (
    (user_id = auth.uid() AND status IN ('draft', 'running', 'submitted'))
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Admin/SAL can delete entries"
  ON time_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

-- RLS time_entry_breaks
ALTER TABLE time_entry_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their breaks"
  ON time_entry_breaks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM time_entries te
      WHERE te.id = time_entry_breaks.time_entry_id
      AND (
        te.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role IN ('admin', 'sal')
        )
      )
    )
  );

CREATE POLICY "Users can manage their breaks"
  ON time_entry_breaks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM time_entries te
      WHERE te.id = time_entry_breaks.time_entry_id
      AND te.user_id = auth.uid()
      AND te.status IN ('draft', 'running')
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
      SELECT 1 FROM time_entries te
      WHERE te.id = time_entry_breaks.time_entry_id
      AND te.user_id = auth.uid()
      AND te.status IN ('draft', 'running')
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );
