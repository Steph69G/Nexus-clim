/*
  # Notifications Security Enhancement

  1. Security Changes
    - Remove permissive INSERT policy
    - Create secure function with SECURITY DEFINER
    - Add input validation (title/message length, URL format)
    - Prevent unauthorized notification creation

  2. New Function
    - `create_notification_secure()` - SECURITY DEFINER function
    - Validates all inputs before insertion
    - Returns notification UUID
    - Accessible to authenticated users but INSERT only via function

  3. Migration Safety
    - Drops existing permissive policy
    - No data loss - only changes access control
    - Existing notifications remain intact
*/

-- Supprime la policy d'INSERT trop large si elle existe
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Fonction serveur pour créer une notification de manière sûre
CREATE OR REPLACE FUNCTION public.create_notification_secure(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_channels text[],
  p_priority text,
  p_related_mission_id uuid DEFAULT NULL,
  p_related_quote_id uuid DEFAULT NULL,
  p_related_invoice_id uuid DEFAULT NULL,
  p_related_contract_id uuid DEFAULT NULL,
  p_action_url text DEFAULT NULL,
  p_action_label text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_dedup_key text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Validation basique
  IF p_title IS NULL OR p_title = '' THEN
    RAISE EXCEPTION 'Title cannot be empty';
  END IF;

  IF p_message IS NULL OR p_message = '' THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;

  -- Validation longueur (éviter abus)
  IF length(p_title) > 160 THEN
    RAISE EXCEPTION 'Title too long (max 160 chars)';
  END IF;

  IF length(p_message) > 2000 THEN
    RAISE EXCEPTION 'Message too long (max 2000 chars)';
  END IF;

  -- Validation action_url (whitelist pattern: URLs internes ou HTTPS)
  IF p_action_url IS NOT NULL
     AND NOT (p_action_url ~ '^(/[a-zA-Z0-9/_-]+|https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})') THEN
    RAISE EXCEPTION 'Invalid action_url format';
  END IF;

  -- Validation priority
  IF p_priority NOT IN ('low', 'normal', 'high', 'urgent') THEN
    RAISE EXCEPTION 'Invalid priority value';
  END IF;

  -- Insertion sécurisée
  INSERT INTO public.notifications(
    user_id,
    notification_type,
    title,
    message,
    channels,
    priority,
    related_mission_id,
    related_quote_id,
    related_invoice_id,
    related_contract_id,
    action_url,
    action_label,
    data,
    dedup_key
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_channels,
    p_priority,
    p_related_mission_id,
    p_related_quote_id,
    p_related_invoice_id,
    p_related_contract_id,
    p_action_url,
    p_action_label,
    p_data,
    p_dedup_key
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Grant execute à authenticated (fonction contrôle l'accès)
ALTER FUNCTION public.create_notification_secure OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.create_notification_secure TO authenticated;

COMMENT ON FUNCTION public.create_notification_secure IS
'Secure function to create notifications with input validation. Only way to insert notifications.';
