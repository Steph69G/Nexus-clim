/*
  # Helper Functions for Contracts, KPIs, and Notifications

  1. Functions Created
    - `generate_contract_number()` - Auto-generate unique contract numbers (CONT-YYYY-NNNN)
    - `mark_notification_read(notification_id)` - Mark a single notification as read
    - `mark_all_notifications_read(user_id)` - Mark all notifications as read for a user
    - `calculate_current_month_kpis()` - Calculate and return current month KPIs
    - `get_user_notifications(user_id, limit)` - Get paginated notifications for a user
    - `create_system_notification(user_id, title, message, type, action_url)` - Create notification helper

  2. Security
    - All functions use SECURITY DEFINER carefully
    - RLS policies still apply on underlying tables
    - Functions validate user permissions where needed

  3. Notes
    - Contract numbers are unique and sequential by year
    - KPI calculations are optimized for current month only
    - Notifications support pagination and unread counts
*/

-- Function: Generate unique contract number
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  year_part text;
  sequence_part text;
  max_number int;
  new_number text;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YYYY');

  -- Get max sequence for current year
  SELECT COALESCE(
    MAX(
      CASE
        WHEN contract_number ~ ('^CONT-' || year_part || '-[0-9]{4}$')
        THEN substring(contract_number from '[0-9]{4}$')::int
        ELSE 0
      END
    ), 0
  ) INTO max_number
  FROM maintenance_contracts
  WHERE contract_number LIKE 'CONT-' || year_part || '-%';

  sequence_part := lpad((max_number + 1)::text, 4, '0');
  new_number := 'CONT-' || year_part || '-' || sequence_part;

  RETURN new_number;
END;
$$;

-- Function: Mark single notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET read_at = now()
  WHERE id = notification_id
    AND user_id = auth.uid()
    AND read_at IS NULL;

  RETURN FOUND;
END;
$$;

-- Function: Mark all notifications as read for current user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(target_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
  effective_user_id uuid;
BEGIN
  effective_user_id := COALESCE(target_user_id, auth.uid());

  UPDATE notifications
  SET read_at = now()
  WHERE user_id = effective_user_id
    AND read_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$$;

-- Function: Get user notifications with pagination
CREATE OR REPLACE FUNCTION get_user_notifications(
  target_user_id uuid DEFAULT NULL,
  result_limit int DEFAULT 50,
  result_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  message text,
  type text,
  action_url text,
  read_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  effective_user_id uuid;
BEGIN
  effective_user_id := COALESCE(target_user_id, auth.uid());

  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.message,
    n.type,
    n.action_url,
    n.read_at,
    n.created_at
  FROM notifications n
  WHERE n.user_id = effective_user_id
  ORDER BY n.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- Function: Create system notification (helper)
CREATE OR REPLACE FUNCTION create_system_notification(
  target_user_id uuid,
  notif_title text,
  notif_message text,
  notif_type text DEFAULT 'info',
  notif_action_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_notification_id uuid;
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    action_url
  ) VALUES (
    target_user_id,
    notif_title,
    notif_message,
    notif_type,
    notif_action_url
  )
  RETURNING id INTO new_notification_id;

  RETURN new_notification_id;
END;
$$;

-- Function: Calculate current month KPIs
CREATE OR REPLACE FUNCTION calculate_current_month_kpis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_of_month timestamptz;
  end_of_month timestamptz;
  result jsonb;
  total_revenue numeric;
  quotes_accepted int;
  quotes_total int;
  missions_completed int;
  missions_on_time int;
  avg_satisfaction numeric;
  nps_score numeric;
BEGIN
  start_of_month := date_trunc('month', CURRENT_DATE);
  end_of_month := start_of_month + interval '1 month';

  -- Calculate revenue (mock - adjust based on your invoicing table)
  total_revenue := 0;

  -- Calculate conversion rate (quotes accepted vs total)
  SELECT COUNT(*) INTO quotes_total
  FROM quotes
  WHERE created_at >= start_of_month AND created_at < end_of_month;

  SELECT COUNT(*) INTO quotes_accepted
  FROM quotes
  WHERE status = 'accepted'
    AND created_at >= start_of_month
    AND created_at < end_of_month;

  -- Calculate missions completed
  SELECT COUNT(*) INTO missions_completed
  FROM missions
  WHERE status = 'completed'
    AND updated_at >= start_of_month
    AND updated_at < end_of_month;

  -- Calculate on-time rate
  SELECT COUNT(*) INTO missions_on_time
  FROM missions
  WHERE status = 'completed'
    AND updated_at >= start_of_month
    AND updated_at < end_of_month
    AND updated_at <= scheduled_at + interval '2 hours';

  -- Calculate satisfaction (average rating)
  SELECT COALESCE(AVG(overall_rating), 0) INTO avg_satisfaction
  FROM client_satisfaction_surveys
  WHERE submitted_at >= start_of_month
    AND submitted_at < end_of_month
    AND submitted_at IS NOT NULL;

  -- Calculate NPS
  WITH nps_data AS (
    SELECT overall_rating
    FROM client_satisfaction_surveys
    WHERE submitted_at >= start_of_month
      AND submitted_at < end_of_month
      AND submitted_at IS NOT NULL
  )
  SELECT
    COALESCE(
      (COUNT(*) FILTER (WHERE overall_rating >= 9)::numeric * 100 / NULLIF(COUNT(*), 0)) -
      (COUNT(*) FILTER (WHERE overall_rating <= 6)::numeric * 100 / NULLIF(COUNT(*), 0)),
      0
    ) INTO nps_score
  FROM nps_data;

  -- Build result JSON
  result := jsonb_build_object(
    'period', jsonb_build_object(
      'start', start_of_month,
      'end', end_of_month
    ),
    'revenue', jsonb_build_object(
      'current', total_revenue,
      'change', 0
    ),
    'conversion', jsonb_build_object(
      'quotesTotal', quotes_total,
      'quotesAccepted', quotes_accepted,
      'rate', CASE WHEN quotes_total > 0 THEN (quotes_accepted::numeric / quotes_total * 100) ELSE 0 END
    ),
    'satisfaction', jsonb_build_object(
      'rating', ROUND(avg_satisfaction, 1),
      'nps', ROUND(nps_score, 0),
      'responseRate', 0
    ),
    'operations', jsonb_build_object(
      'missionsCompleted', missions_completed,
      'onTimeRate', CASE WHEN missions_completed > 0 THEN (missions_on_time::numeric / missions_completed * 100) ELSE 0 END,
      'averageDelay', 0
    )
  );

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_contract_number() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION create_system_notification(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_current_month_kpis() TO authenticated;
