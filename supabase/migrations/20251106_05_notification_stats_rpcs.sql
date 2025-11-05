/*
  # Notification Stats RPC Functions

  1. RPC Functions
    - `rpc_stats_notifications_by_channel()` - Volume sent/failed per channel (7 days)
    - `rpc_stats_notifications_top_types()` - Top 10 notification types by volume
    - `rpc_stats_notifications_latency()` - Median delivery latency per channel
    - `rpc_stats_notifications_daily()` - Daily volume trends (30 days)
    - `rpc_stats_notifications_user_engagement()` - User engagement metrics

  2. Benefits
    - Real-time dashboard analytics
    - Performance monitoring (latency, success rates)
    - Business intelligence (engagement, channel effectiveness)
    - Capacity planning (volume trends)

  3. Performance
    - All queries optimized with indexes
    - Time ranges to prevent full table scans
    - Uses notification_events for precise tracking
*/

CREATE OR REPLACE FUNCTION public.rpc_stats_notifications_by_channel()
RETURNS TABLE(channel text, sent bigint, failed bigint, success_rate numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ch.channel,
    SUM(CASE WHEN ch.event = 'sent' THEN 1 ELSE 0 END) AS sent,
    SUM(CASE WHEN ch.event = 'failed' THEN 1 ELSE 0 END) AS failed,
    CASE
      WHEN SUM(CASE WHEN ch.event IN ('sent', 'failed') THEN 1 ELSE 0 END) > 0
      THEN ROUND(
        100.0 * SUM(CASE WHEN ch.event = 'sent' THEN 1 ELSE 0 END) /
        SUM(CASE WHEN ch.event IN ('sent', 'failed') THEN 1 ELSE 0 END),
        2
      )
      ELSE 0
    END AS success_rate
  FROM public.notification_events ch
  WHERE ch.created_at >= now() - interval '7 days'
    AND ch.channel IN ('email', 'sms', 'push')
    AND ch.event IN ('sent', 'failed')
  GROUP BY ch.channel
  ORDER BY sent DESC;
$$;

CREATE OR REPLACE FUNCTION public.rpc_stats_notifications_top_types(
  p_days integer DEFAULT 7,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(notification_type text, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    n.notification_type,
    COUNT(*) AS count
  FROM public.notifications n
  WHERE n.created_at >= now() - (p_days || ' days')::interval
  GROUP BY n.notification_type
  ORDER BY count DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.rpc_stats_notifications_latency()
RETURNS TABLE(
  channel text,
  p50_seconds numeric,
  p95_seconds numeric,
  avg_seconds numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH sent_events AS (
    SELECT
      ne.notification_id,
      ne.channel,
      ne.created_at AS sent_at
    FROM public.notification_events ne
    WHERE ne.event = 'sent'
      AND ne.channel IN ('email', 'sms', 'push')
      AND ne.created_at >= now() - interval '7 days'
  )
  SELECT
    se.channel,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (se.sent_at - n.created_at))
    ), 2) AS p50_seconds,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (se.sent_at - n.created_at))
    ), 2) AS p95_seconds,
    ROUND(AVG(EXTRACT(EPOCH FROM (se.sent_at - n.created_at))), 2) AS avg_seconds
  FROM sent_events se
  JOIN public.notifications n ON n.id = se.notification_id
  GROUP BY se.channel
  ORDER BY se.channel;
$$;

CREATE OR REPLACE FUNCTION public.rpc_stats_notifications_daily(
  p_days integer DEFAULT 30
)
RETURNS TABLE(
  date date,
  total bigint,
  in_app bigint,
  email bigint,
  sms bigint,
  push bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    created_at::date AS date,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE 'in_app' = ANY(channels)) AS in_app,
    COUNT(*) FILTER (WHERE 'email' = ANY(channels)) AS email,
    COUNT(*) FILTER (WHERE 'sms' = ANY(channels)) AS sms,
    COUNT(*) FILTER (WHERE 'push' = ANY(channels)) AS push
  FROM public.notifications
  WHERE created_at >= now() - (p_days || ' days')::interval
  GROUP BY created_at::date
  ORDER BY date DESC;
$$;

CREATE OR REPLACE FUNCTION public.rpc_stats_notifications_user_engagement()
RETURNS TABLE(
  total_users bigint,
  users_with_read bigint,
  avg_read_time_minutes numeric,
  read_rate numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH user_stats AS (
    SELECT
      n.user_id,
      COUNT(*) AS total_notifs,
      COUNT(*) FILTER (WHERE n.read_at IS NOT NULL) AS read_notifs,
      AVG(EXTRACT(EPOCH FROM (n.read_at - n.created_at)) / 60.0) AS avg_read_minutes
    FROM public.notifications n
    WHERE n.created_at >= now() - interval '7 days'
      AND 'in_app' = ANY(n.channels)
    GROUP BY n.user_id
  )
  SELECT
    COUNT(DISTINCT user_id) AS total_users,
    COUNT(*) FILTER (WHERE read_notifs > 0) AS users_with_read,
    ROUND(AVG(avg_read_minutes), 2) AS avg_read_time_minutes,
    CASE
      WHEN SUM(total_notifs) > 0
      THEN ROUND(100.0 * SUM(read_notifs) / SUM(total_notifs), 2)
      ELSE 0
    END AS read_rate
  FROM user_stats;
$$;

CREATE OR REPLACE FUNCTION public.rpc_stats_notifications_by_priority()
RETURNS TABLE(priority text, count bigint, avg_read_time_minutes numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT
    n.priority,
    COUNT(*) AS count,
    ROUND(AVG(EXTRACT(EPOCH FROM (n.read_at - n.created_at)) / 60.0), 2) AS avg_read_time_minutes
  FROM public.notifications n
  WHERE n.created_at >= now() - interval '7 days'
    AND 'in_app' = ANY(n.channels)
  GROUP BY n.priority
  ORDER BY
    CASE n.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_stats_notification_errors(
  p_channel text DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  channel text,
  error_message text,
  count bigint,
  last_occurrence timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ne.channel,
    ne.details AS error_message,
    COUNT(*) AS count,
    MAX(ne.created_at) AS last_occurrence
  FROM public.notification_events ne
  WHERE ne.event = 'failed'
    AND ne.created_at >= now() - interval '7 days'
    AND (p_channel IS NULL OR ne.channel = p_channel)
    AND ne.details IS NOT NULL
  GROUP BY ne.channel, ne.details
  ORDER BY count DESC, last_occurrence DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_stats_notifications_by_channel TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_stats_notifications_top_types TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_stats_notifications_latency TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_stats_notifications_daily TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_stats_notifications_user_engagement TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_stats_notifications_by_priority TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_stats_notification_errors TO authenticated;

COMMENT ON FUNCTION public.rpc_stats_notifications_by_channel IS
'Stats: Volume sent/failed per channel with success rates (7 days)';

COMMENT ON FUNCTION public.rpc_stats_notifications_top_types IS
'Stats: Top notification types by volume';

COMMENT ON FUNCTION public.rpc_stats_notifications_latency IS
'Stats: Delivery latency percentiles per channel (p50, p95, avg)';

COMMENT ON FUNCTION public.rpc_stats_notifications_daily IS
'Stats: Daily notification volume trends by channel';

COMMENT ON FUNCTION public.rpc_stats_notifications_user_engagement IS
'Stats: User engagement metrics (read rates, avg read time)';

COMMENT ON FUNCTION public.rpc_stats_notifications_by_priority IS
'Stats: Notification volume and engagement by priority level';

COMMENT ON FUNCTION public.rpc_stats_notification_errors IS
'Stats: Most common notification errors by channel';
