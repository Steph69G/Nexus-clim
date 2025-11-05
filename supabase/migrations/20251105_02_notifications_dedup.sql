/*
  # Notifications Anti-Duplication System

  1. New Column
    - `dedup_key` (text) - Stable key for idempotence
    - Format: "type:resource_id:hash" or custom

  2. Unique Constraint
    - Partial unique index on dedup_key
    - Only enforced when dedup_key IS NOT NULL
    - Prevents duplicate notifications from rapid updates/retries

  3. Use Cases
    - Quote accepted: "quote_accepted:uuid:timestamp"
    - Mission assigned: "mission_assigned:uuid:date"
    - Emergency received: "emergency_received:uuid"

  4. Benefits
    - Prevents notification spam
    - Idempotent operations
    - Safe to retry failed sends
*/

-- Add dedup_key column (idempotent)
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS dedup_key text;

-- Create unique index on dedup_key (partial - only non-null, non-deleted)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_dedup
ON public.notifications(dedup_key)
WHERE dedup_key IS NOT NULL AND deleted_at IS NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_dedup_key
ON public.notifications(dedup_key)
WHERE dedup_key IS NOT NULL;

COMMENT ON COLUMN public.notifications.dedup_key IS
'Idempotency key format: "type:resource_id:hash". Prevents duplicate notifications.';
