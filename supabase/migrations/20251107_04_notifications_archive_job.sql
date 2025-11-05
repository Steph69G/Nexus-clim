/*
  # Notification Archive Scheduled Jobs

  1. Functions
    - `archive_old_notifications()` - Move notifications > 90 days to archive (batch)
    - `cleanup_notification_events()` - Delete notification_events > 180 days

  2. Scheduled Jobs (pg_cron)
    - Weekly archiving: Sunday 03:40 UTC (moves 2000 old notifications)
    - Weekly events cleanup: Sunday 03:50 UTC (removes old events)

  3. Performance
    - Batch processing (2000 per run prevents long locks)
    - Ordered by created_at ASC (oldest first)
    - CTE pattern for atomic move operation

  4. Benefits
    - Keep notifications table fast (< 90 days only)
    - Reduce notification_events bloat
    - Preserve historical data in archive
    - Automatic maintenance (no manual intervention)
*/

CREATE OR REPLACE FUNCTION public.archive_old_notifications(
  p_before timestamptz,
  p_batch int DEFAULT 500
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  moved int;
BEGIN
  WITH cte AS (
    SELECT id
    FROM public.notifications
    WHERE created_at < p_before
    ORDER BY created_at ASC
    LIMIT p_batch
  )
  INSERT INTO public.notifications_archive
  SELECT n.*, now() AS moved_at
  FROM public.notifications n
  JOIN cte USING (id);

  GET DIAGNOSTICS moved = ROW_COUNT;

  DELETE FROM public.notifications n
  USING (
    SELECT id
    FROM public.notifications
    WHERE created_at < p_before
    ORDER BY created_at ASC
    LIMIT p_batch
  ) cte
  WHERE n.id = cte.id;

  RETURN moved;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_notification_events(p_before timestamptz)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH del AS (
    DELETE FROM public.notification_events
    WHERE created_at < p_before
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM del;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE 'pg_cron extension not available, skipping cron job creation';
  ELSE
    PERFORM cron.schedule(
      'notifications_archive_weekly',
      '40 3 * * 0',
      $$SELECT public.archive_old_notifications(now() - interval '90 days', 2000);$$
    );

    PERFORM cron.schedule(
      'notification_events_cleanup_weekly',
      '50 3 * * 0',
      $$SELECT public.cleanup_notification_events(now() - interval '180 days');$$
    );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'cron.schedule not available, jobs not created';
  WHEN duplicate_object THEN
    RAISE NOTICE 'Cron jobs already exist, skipping';
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_old_notifications TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_notification_events TO service_role;

COMMENT ON FUNCTION public.archive_old_notifications IS
'Move notifications older than p_before to archive table. Batch size p_batch (default 500). Returns count of moved rows.';

COMMENT ON FUNCTION public.cleanup_notification_events IS
'Delete notification_events older than p_before. Returns count of deleted rows.';
