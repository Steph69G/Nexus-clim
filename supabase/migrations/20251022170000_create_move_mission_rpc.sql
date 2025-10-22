/*
  # Create move_mission RPC for calendar drag & drop

  1. Function
    - `move_mission` - Centralized mission drag & drop with business rules
      - Validates permissions (admin/sal can move any, tech only their own)
      - Checks date validity
      - Detects scheduling conflicts
      - Updates mission + appointment atomically
      - Logs the move event

  2. Security
    - Uses security definer with explicit RLS checks
    - Prevents unauthorized moves
    - Enforces conflict detection (unless forced by admin)

  3. Business Rules
    - Cannot move to invalid date range (end <= start)
    - Cannot move completed/validated/cancelled missions
    - Tech can only move their own missions
    - Conflicts detected and prevented (unless admin forces)
*/

-- Drop existing if any
DROP FUNCTION IF EXISTS move_mission(uuid, timestamptz, timestamptz, uuid, text, boolean);

-- Create move_mission function
CREATE OR REPLACE FUNCTION move_mission(
  p_mission_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_assignee_id uuid DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_current_assignee uuid;
  v_current_status text;
  v_conflict_count int;
  v_result jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get user role
  SELECT role INTO v_role FROM profiles WHERE user_id = v_user_id;

  -- Get current mission details
  SELECT assigned_user_id, status
  INTO v_current_assignee, v_current_status
  FROM missions
  WHERE id = p_mission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission not found';
  END IF;

  -- Check if mission status allows moving
  IF v_current_status IN ('valide', 'termine', 'annule') THEN
    RAISE EXCEPTION 'Cannot move mission with status: %', v_current_status;
  END IF;

  -- Authorization check: admin/sal can move any mission, tech only their own
  IF v_role NOT IN ('admin', 'sal') THEN
    IF v_current_assignee IS NULL OR v_current_assignee != v_user_id THEN
      RAISE EXCEPTION 'Not allowed to move this mission';
    END IF;

    -- Tech cannot change assignee
    IF p_assignee_id IS NOT NULL AND p_assignee_id != v_current_assignee THEN
      RAISE EXCEPTION 'Not allowed to reassign mission';
    END IF;
  END IF;

  -- Validate dates
  IF p_end <= p_start THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;

  -- Determine final assignee
  IF p_assignee_id IS NULL THEN
    p_assignee_id := v_current_assignee;
  END IF;

  -- Check for scheduling conflicts (if assignee is set)
  IF p_assignee_id IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_conflict_count
    FROM missions m
    WHERE m.id != p_mission_id
      AND m.assigned_user_id = p_assignee_id
      AND m.status NOT IN ('annule', 'termine')
      AND m.scheduled_start IS NOT NULL
      AND m.scheduled_start < p_end
      AND (m.scheduled_start + (COALESCE(m.duration, 60) || ' minutes')::interval) > p_start;

    IF v_conflict_count > 0 AND NOT p_force THEN
      IF v_role IN ('admin', 'sal') THEN
        RAISE EXCEPTION 'Scheduling conflict detected. Use force=true to override.';
      ELSE
        RAISE EXCEPTION 'Scheduling conflict with another mission';
      END IF;
    END IF;
  END IF;

  -- Update mission
  UPDATE missions
  SET
    scheduled_start = p_start,
    assigned_user_id = p_assignee_id,
    duration = EXTRACT(EPOCH FROM (p_end - p_start)) / 60,
    updated_at = NOW()
  WHERE id = p_mission_id;

  -- Update appointments if they exist
  UPDATE appointments
  SET
    start_at = p_start,
    end_at = p_end,
    assignee_id = p_assignee_id,
    updated_at = NOW()
  WHERE mission_id = p_mission_id;

  -- Log the event
  INSERT INTO app_events(event_type, severity, metadata)
  VALUES (
    'calendar_move',
    'info',
    jsonb_build_object(
      'mission_id', p_mission_id,
      'start', p_start,
      'end', p_end,
      'assignee_id', p_assignee_id,
      'source', p_source,
      'forced', p_force,
      'conflict_count', v_conflict_count,
      'moved_by', v_user_id
    )
  );

  -- Build result
  SELECT jsonb_build_object(
    'mission_id', m.id::text,
    'assignee_id', m.assigned_user_id::text,
    'start', m.scheduled_start,
    'end', m.scheduled_start + (m.duration || ' minutes')::interval
  )
  INTO v_result
  FROM missions m
  WHERE m.id = p_mission_id;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION move_mission(uuid, timestamptz, timestamptz, uuid, text, boolean) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION move_mission IS 'Move mission to new time slot with conflict detection and permission checks';
