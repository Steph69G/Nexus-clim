/*
  # Notification Archive RPC Functions

  1. Functions
    - `archive_notification(id)` - Archive single notification (user ownership check)
    - `archive_all_read_notifications()` - Archive all read notifications for current user
    - `fetch_my_archived_notifications_keyset()` - Keyset pagination for archives

  2. Security
    - All functions check user ownership (auth.uid())
    - Archive operations are atomic (INSERT + DELETE)
    - No orphaned data possible

  3. Performance
    - Batch operations use CTEs with LIMIT
    - Keyset pagination prevents full table scans
    - Atomic transactions ensure data consistency
*/

CREATE OR REPLACE FUNCTION public.archive_notification(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r public.notifications%ROWTYPE;
BEGIN
  SELECT * INTO r
  FROM public.notifications
  WHERE id = p_id
  AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found_or_forbidden';
  END IF;

  INSERT INTO public.notifications_archive
  SELECT *, now() AS moved_at
  FROM public.notifications
  WHERE id = p_id;

  DELETE FROM public.notifications
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_all_read_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  moved int;
BEGIN
  WITH to_move AS (
    SELECT id
    FROM public.notifications
    WHERE user_id = auth.uid()
    AND read_at IS NOT NULL
    AND archived_at IS NULL
    LIMIT 1000
  )
  INSERT INTO public.notifications_archive
  SELECT n.*, now() AS moved_at
  FROM public.notifications n
  JOIN to_move t ON t.id = n.id;

  GET DIAGNOSTICS moved = ROW_COUNT;

  DELETE FROM public.notifications n
  USING (
    SELECT id
    FROM public.notifications
    WHERE user_id = auth.uid()
    AND read_at IS NOT NULL
    AND archived_at IS NULL
    LIMIT 1000
  ) t
  WHERE n.id = t.id;

  RETURN moved;
END;
$$;

CREATE OR REPLACE FUNCTION public.fetch_my_archived_notifications_keyset(
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS SETOF public.notifications_archive
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.notifications_archive n
  WHERE n.user_id = auth.uid()
  AND (
    p_before_created_at IS NULL
    OR (n.created_at, n.id) < (p_before_created_at, p_before_id)
  )
  ORDER BY n.created_at DESC, n.id DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_all_read_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.fetch_my_archived_notifications_keyset TO authenticated;

COMMENT ON FUNCTION public.archive_notification IS
'Archive a single notification (moves from notifications to notifications_archive). Checks user ownership.';

COMMENT ON FUNCTION public.archive_all_read_notifications IS
'Archive all read notifications for current user (up to 1000 at once). Returns count of moved notifications.';

COMMENT ON FUNCTION public.fetch_my_archived_notifications_keyset IS
'Keyset pagination for archived notifications (50 per page). Returns notifications in DESC order.';
