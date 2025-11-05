/*
  # Notification Events - Audit Trail & Observability

  1. New Table
    - `notification_events` - Complete audit trail of all notification lifecycle events
    - Tracks: created, queued, sent, delivered, failed, read, archived
    - Per-channel tracking (in_app, email, sms, push)

  2. Indexes
    - `idx_notif_events_notif` - Fast lookup by notification_id
    - `idx_notif_events_channel` - Analytics by channel/event/time

  3. Trigger
    - `trg_log_notif_read` - Automatically logs when notifications are read

  4. Benefits
    - Complete audit trail for compliance
    - Performance metrics (delivery latency, success rates)
    - Debugging failed notifications
    - Business analytics (engagement, channel effectiveness)
*/

CREATE TABLE IF NOT EXISTS public.notification_events (
  id            bigserial PRIMARY KEY,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel       text NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push')),
  event         text NOT NULL CHECK (event IN ('created', 'queued', 'sent', 'delivered', 'failed', 'read', 'archived')),
  details       text,
  created_at    timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_events_notif
ON public.notification_events(notification_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_events_channel
ON public.notification_events(channel, event, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_events_created
ON public.notification_events(created_at DESC)
WHERE event IN ('sent', 'failed');

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notification events"
ON public.notification_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.id = notification_events.notification_id
    AND n.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert events"
ON public.notification_events
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins view all events"
ON public.notification_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE OR REPLACE FUNCTION public.log_notification_read()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.read_at IS DISTINCT FROM OLD.read_at AND NEW.read_at IS NOT NULL THEN
    INSERT INTO public.notification_events (notification_id, channel, event, details)
    VALUES (NEW.id, 'in_app', 'read', NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_notif_read ON public.notifications;

CREATE TRIGGER trg_log_notif_read
AFTER UPDATE OF read_at ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.log_notification_read();

CREATE OR REPLACE FUNCTION public.log_notification_archived()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at AND NEW.archived_at IS NOT NULL THEN
    INSERT INTO public.notification_events (notification_id, channel, event, details)
    VALUES (NEW.id, 'in_app', 'archived', NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_notif_archived ON public.notifications;

CREATE TRIGGER trg_log_notif_archived
AFTER UPDATE OF archived_at ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.log_notification_archived();

CREATE OR REPLACE FUNCTION public.log_notification_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_channel text;
BEGIN
  FOREACH v_channel IN ARRAY NEW.channels
  LOOP
    INSERT INTO public.notification_events (notification_id, channel, event, details)
    VALUES (NEW.id, v_channel, 'created', NULL);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_notif_created ON public.notifications;

CREATE TRIGGER trg_log_notif_created
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.log_notification_created();

COMMENT ON TABLE public.notification_events IS
'Audit trail of all notification lifecycle events for observability and compliance';

COMMENT ON COLUMN public.notification_events.channel IS
'Delivery channel: in_app, email, sms, or push';

COMMENT ON COLUMN public.notification_events.event IS
'Event type: created, queued, sent, delivered, failed, read, archived';

COMMENT ON COLUMN public.notification_events.details IS
'Optional JSON string with event-specific metadata (error messages, provider details, etc)';
