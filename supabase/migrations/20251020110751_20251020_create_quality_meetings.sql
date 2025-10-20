/*
  # Create Quality Meetings System

  1. New Tables
    - `quality_meetings`
      - Quarterly quality meetings with subcontractors
      - Monthly review meetings
      - Urgent quality issue meetings
      - Attendee tracking
      - Topics and action items
      - Minutes/documents

  2. Security
    - Enable RLS
    - Admin and coordinators can manage meetings
    - Subcontractors can view meetings they attended

  3. Features
    - Meeting scheduling
    - Attendee management
    - Topics and agenda
    - Action item tracking
    - Document attachment (minutes)
*/

-- Create quality_meetings table
CREATE TABLE IF NOT EXISTS quality_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Meeting details
  meeting_date timestamptz NOT NULL,
  meeting_type text NOT NULL CHECK (meeting_type IN (
    'quarterly_quality',  -- quarterly with subcontractors
    'monthly_review',     -- monthly internal review
    'urgent_quality',     -- urgent quality issue meeting
    'training',           -- training session
    'onboarding',         -- new subcontractor onboarding
    'other'
  )),
  
  title text NOT NULL,
  description text,
  location text, -- 'Office', 'Video call', 'Site visit', etc.
  
  -- Attendees (array of user IDs)
  attendees uuid[] DEFAULT ARRAY[]::uuid[],
  required_attendees uuid[] DEFAULT ARRAY[]::uuid[],
  optional_attendees uuid[] DEFAULT ARRAY[]::uuid[],
  
  -- Attendance tracking
  actual_attendees uuid[] DEFAULT ARRAY[]::uuid[],
  absent_attendees uuid[] DEFAULT ARRAY[]::uuid[],
  
  -- Agenda
  topics jsonb DEFAULT '[]'::jsonb,
  
  -- Action items from meeting
  action_items jsonb DEFAULT '[]'::jsonb,
  
  -- Meeting outcome
  meeting_status text NOT NULL DEFAULT 'scheduled' CHECK (meeting_status IN (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'postponed'
  )),
  
  -- Minutes/notes
  minutes text,
  key_decisions text,
  next_steps text,
  
  -- Documents
  minutes_document_url text,
  presentation_urls text[] DEFAULT ARRAY[]::text[],
  attachment_urls text[] DEFAULT ARRAY[]::text[],
  
  -- Follow-up
  follow_up_meeting_id uuid,
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  
  -- Duration
  scheduled_duration_minutes integer DEFAULT 60,
  actual_duration_minutes integer,
  
  -- Metadata
  created_by uuid NOT NULL,
  updated_by uuid,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quality_meetings_meeting_date ON quality_meetings(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_quality_meetings_meeting_type ON quality_meetings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_quality_meetings_meeting_status ON quality_meetings(meeting_status);
CREATE INDEX IF NOT EXISTS idx_quality_meetings_attendees ON quality_meetings USING GIN (attendees);
CREATE INDEX IF NOT EXISTS idx_quality_meetings_created_by ON quality_meetings(created_by);

-- Enable RLS
ALTER TABLE quality_meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

CREATE POLICY "Admin and coordinators can view all meetings"
  ON quality_meetings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator', 'development_manager')
    )
  );

CREATE POLICY "Admin and coordinators can manage meetings"
  ON quality_meetings FOR ALL
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

CREATE POLICY "Attendees can view meetings they are invited to"
  ON quality_meetings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = ANY(attendees)
    OR auth.uid() = ANY(required_attendees)
    OR auth.uid() = ANY(optional_attendees)
    OR auth.uid() = ANY(actual_attendees)
  );

CREATE POLICY "Attendees can update their attendance"
  ON quality_meetings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = ANY(attendees)
    OR auth.uid() = ANY(required_attendees)
    OR auth.uid() = ANY(optional_attendees)
  )
  WITH CHECK (
    auth.uid() = ANY(attendees)
    OR auth.uid() = ANY(required_attendees)
    OR auth.uid() = ANY(optional_attendees)
  );

-- Function to schedule next quarterly meeting
CREATE OR REPLACE FUNCTION schedule_next_quarterly_meeting()
RETURNS uuid AS $$
DECLARE
  v_last_meeting_date timestamptz;
  v_next_meeting_date timestamptz;
  v_subcontractors uuid[];
  v_meeting_id uuid;
BEGIN
  -- Get last quarterly meeting date
  SELECT meeting_date
  INTO v_last_meeting_date
  FROM quality_meetings
  WHERE meeting_type = 'quarterly_quality'
  AND meeting_status IN ('completed', 'scheduled')
  ORDER BY meeting_date DESC
  LIMIT 1;
  
  -- Calculate next quarterly date (3 months from last meeting, or 3 months from now if no previous meeting)
  IF v_last_meeting_date IS NOT NULL THEN
    v_next_meeting_date := v_last_meeting_date + INTERVAL '3 months';
  ELSE
    v_next_meeting_date := now() + INTERVAL '3 months';
  END IF;
  
  -- Get all active subcontractors
  SELECT ARRAY_AGG(user_id)
  INTO v_subcontractors
  FROM profiles
  WHERE role = 'subcontractor';
  
  -- Create meeting
  INSERT INTO quality_meetings (
    meeting_date,
    meeting_type,
    title,
    description,
    required_attendees,
    created_by
  )
  VALUES (
    v_next_meeting_date,
    'quarterly_quality',
    'Réunion Qualité Trimestrielle',
    'Réunion qualité avec tous les sous-traitants pour faire le point sur les procédures et les retours terrain.',
    v_subcontractors,
    (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1)
  )
  RETURNING id INTO v_meeting_id;
  
  RETURN v_meeting_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add action item to meeting
CREATE OR REPLACE FUNCTION add_meeting_action_item(
  p_meeting_id uuid,
  p_description text,
  p_assignee_id uuid,
  p_due_date date,
  p_priority text DEFAULT 'medium'
)
RETURNS jsonb AS $$
DECLARE
  v_action_item jsonb;
  v_current_items jsonb;
BEGIN
  v_action_item := jsonb_build_object(
    'id', gen_random_uuid(),
    'description', p_description,
    'assignee_id', p_assignee_id,
    'due_date', p_due_date,
    'priority', p_priority,
    'status', 'pending',
    'created_at', now()
  );
  
  SELECT action_items INTO v_current_items
  FROM quality_meetings
  WHERE id = p_meeting_id;
  
  IF v_current_items IS NULL THEN
    v_current_items := '[]'::jsonb;
  END IF;
  
  UPDATE quality_meetings
  SET 
    action_items = v_current_items || v_action_item,
    updated_at = now()
  WHERE id = p_meeting_id;
  
  RETURN v_action_item;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update action item status
CREATE OR REPLACE FUNCTION update_action_item_status(
  p_meeting_id uuid,
  p_action_item_id uuid,
  p_new_status text
)
RETURNS boolean AS $$
DECLARE
  v_action_items jsonb;
  v_item jsonb;
  v_updated_items jsonb;
BEGIN
  SELECT action_items INTO v_action_items
  FROM quality_meetings
  WHERE id = p_meeting_id;
  
  v_updated_items := '[]'::jsonb;
  
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_action_items)
  LOOP
    IF (v_item->>'id')::uuid = p_action_item_id THEN
      v_item := jsonb_set(v_item, '{status}', to_jsonb(p_new_status));
      v_item := jsonb_set(v_item, '{updated_at}', to_jsonb(now()));
    END IF;
    v_updated_items := v_updated_items || v_item;
  END LOOP;
  
  UPDATE quality_meetings
  SET 
    action_items = v_updated_items,
    updated_at = now()
  WHERE id = p_meeting_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track attendance
CREATE OR REPLACE FUNCTION record_meeting_attendance(
  p_meeting_id uuid,
  p_attendee_id uuid,
  p_attended boolean
)
RETURNS boolean AS $$
BEGIN
  IF p_attended THEN
    UPDATE quality_meetings
    SET 
      actual_attendees = array_append(
        COALESCE(actual_attendees, ARRAY[]::uuid[]),
        p_attendee_id
      ),
      absent_attendees = array_remove(absent_attendees, p_attendee_id),
      updated_at = now()
    WHERE id = p_meeting_id
    AND NOT (p_attendee_id = ANY(actual_attendees));
  ELSE
    UPDATE quality_meetings
    SET 
      absent_attendees = array_append(
        COALESCE(absent_attendees, ARRAY[]::uuid[]),
        p_attendee_id
      ),
      actual_attendees = array_remove(actual_attendees, p_attendee_id),
      updated_at = now()
    WHERE id = p_meeting_id
    AND NOT (p_attendee_id = ANY(absent_attendees));
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE quality_meetings IS 'Quality meetings with subcontractors and internal team (quarterly, monthly, urgent)';
COMMENT ON COLUMN quality_meetings.action_items IS 'Array of action items: [{id, description, assignee_id, due_date, priority, status}]';
COMMENT ON COLUMN quality_meetings.topics IS 'Array of meeting topics: [{title, notes, duration_minutes}]';
COMMENT ON FUNCTION schedule_next_quarterly_meeting IS 'Automatically schedule next quarterly quality meeting (call after completing previous one)';
COMMENT ON FUNCTION add_meeting_action_item IS 'Add an action item to a meeting';
COMMENT ON FUNCTION update_action_item_status IS 'Update status of an action item (pending, in_progress, completed, cancelled)';
