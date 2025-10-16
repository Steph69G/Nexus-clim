/*
  # Add automatic status logging trigger

  1. Changes
    - Creates a trigger function to automatically log status changes in mission_status_log
    - Creates a trigger on missions table that fires on status updates
    - Logs all status transitions with timestamp, actor, and context
  
  2. Security
    - No RLS changes needed (policies already exist on mission_status_log)
*/

CREATE OR REPLACE FUNCTION log_mission_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO mission_status_log (
      mission_id,
      from_status,
      to_status,
      actor_id,
      via,
      note,
      context
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      'web',
      NULL,
      jsonb_build_object(
        'scheduled_start', NEW.scheduled_start,
        'assigned_user_id', NEW.assigned_user_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_mission_status_change ON missions;
CREATE TRIGGER trg_log_mission_status_change
  AFTER UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION log_mission_status_change();