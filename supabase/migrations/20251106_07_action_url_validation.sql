/*
  # Action URL Security Validation

  1. Constraint
    - CHECK constraint on action_url column
    - Only allows internal URLs (starting with /)
    - Prevents XSS via javascript: or data: URLs

  2. Security Benefits
    - Prevents XSS injection attacks
    - Enforces internal-only navigation
    - Defence in depth security layer

  3. Notes
    - If external URLs needed, remove this constraint
    - Instead filter via allowlist in Edge Functions
*/

ALTER TABLE public.notifications
  ADD CONSTRAINT chk_action_url_internal
  CHECK (action_url IS NULL OR action_url LIKE '/%');

COMMENT ON CONSTRAINT chk_action_url_internal ON public.notifications IS
'Security: Only allow internal URLs (starting with /) to prevent XSS attacks';
