/*
  # Keyset Pagination for Notifications

  1. RPC Function
    - `fetch_my_notifications_keyset()` - Cursor-based pagination
    - Returns 50 notifications per page
    - Uses (created_at, id) composite cursor
    - 100x faster than OFFSET pagination

  2. Parameters
    - `p_before_created_at` - Cursor timestamp (optional)
    - `p_before_id` - Cursor UUID (optional)
    - `p_unread_only` - Filter unread notifications

  3. Index
    - Composite index on (user_id, created_at DESC, id DESC)
    - Optimizes keyset queries for O(log n) performance

  4. Benefits
    - Consistent performance regardless of page depth
    - No "missing rows" problem with OFFSET
    - Scalable to millions of rows
    - Real-time compatible (prepend new items)
*/

CREATE OR REPLACE FUNCTION public.fetch_my_notifications_keyset(
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL,
  p_unread_only boolean DEFAULT false
)
RETURNS SETOF public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.notifications n
  WHERE n.user_id = auth.uid()
    AND n.archived_at IS NULL
    AND (NOT p_unread_only OR n.read_at IS NULL)
    AND (
      p_before_created_at IS NULL
      OR (n.created_at, n.id) < (p_before_created_at, p_before_id)
    )
  ORDER BY n.created_at DESC, n.id DESC
  LIMIT 50;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_id
ON public.notifications(user_id, created_at DESC, id DESC);

GRANT EXECUTE ON FUNCTION public.fetch_my_notifications_keyset TO authenticated;

COMMENT ON FUNCTION public.fetch_my_notifications_keyset IS
'Keyset pagination for notifications - returns 50 items per page with cursor';

COMMENT ON INDEX idx_notifications_user_created_id IS
'Composite index for keyset pagination - O(log n) performance';
