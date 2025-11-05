/*
  # Notifications Archive System

  1. New Table
    - `notifications_archive` - Archive storage for old notifications
    - Same schema as notifications table
    - Additional `moved_at` timestamp

  2. RLS Policies
    - Users can read their own archived notifications
    - Admins can read all archived notifications
    - No insert/update/delete from frontend (managed by RPCs)

  3. Indexes
    - Composite index for keyset pagination (user_id, created_at DESC, id DESC)
    - Index on notification_type for filtering

  4. Benefits
    - Keep notifications table lean and fast
    - Preserve historical data
    - Enable compliance (data retention)
    - Improve query performance on active notifications
*/

CREATE TABLE IF NOT EXISTS public.notifications_archive (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  channels text[] NOT NULL,
  priority text DEFAULT 'normal',
  read_at timestamptz,
  archived_at timestamptz,
  action_url text,
  action_label text,
  data jsonb DEFAULT '{}'::jsonb,
  related_mission_id uuid,
  related_quote_id uuid,
  related_invoice_id uuid,
  related_contract_id uuid,
  email_status text,
  email_sent_at timestamptz,
  email_error text,
  sms_status text,
  sms_sent_at timestamptz,
  sms_error text,
  push_status text,
  push_sent_at timestamptz,
  push_error text,
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3,
  next_retry_at timestamptz,
  dedup_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  moved_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own archived notifications"
ON public.notifications_archive
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admin read all archived notifications"
ON public.notifications_archive
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role = 'admin'
  )
);

CREATE INDEX IF NOT EXISTS idx_notif_arch_user_created_id
ON public.notifications_archive(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_notif_arch_type
ON public.notifications_archive(notification_type);

CREATE INDEX IF NOT EXISTS idx_notif_arch_moved_at
ON public.notifications_archive(moved_at DESC);

COMMENT ON TABLE public.notifications_archive IS
'Archive storage for old notifications (> 90 days). Maintains same schema as notifications table.';

COMMENT ON COLUMN public.notifications_archive.moved_at IS
'Timestamp when notification was moved from active table to archive';

COMMENT ON INDEX idx_notif_arch_user_created_id IS
'Composite index for keyset pagination on archived notifications';
