/*
  # Mission Updated Trigger - Significant Changes

  1. New Trigger Function
    - `notify_mission_updated()` - Triggers on mission UPDATE
    - Detects significant changes: status, date, address
    - Notifies assigned technician only
    - Idempotent per day + changed fields

  2. Significant Changes Tracked
    - status: Critical status changes (especially Annulée, Bloqué)
    - scheduled_at / appointment_date: Date/time changes
    - address / city: Location changes

  3. Benefits
    - Keeps technicians informed of changes
    - Reduces missed appointments
    - Better coordination
    - Automatic updates without phone calls
*/

-- Notifie le technicien assigné si des champs critiques changent
CREATE OR REPLACE FUNCTION public.notify_mission_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  changed text[] := ARRAY[]::text[];
  v_msg text;
  v_dedup text;
  v_priority text := 'normal';
BEGIN
  -- Si pas d'assigné, pas de notification
  IF NEW.assigned_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Détecte changements significatifs
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    changed := array_append(changed, 'statut');
    -- Statuts critiques = priorité haute
    IF NEW.status IN ('Annulée', 'Bloqué', 'En pause') THEN
      v_priority := 'high';
    END IF;
  END IF;

  -- Date de RDV (scheduled_at ou appointment_date selon schéma)
  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
    changed := array_append(changed, 'date de RDV');
    v_priority := 'high';
  END IF;

  -- Adresse
  IF NEW.address IS DISTINCT FROM OLD.address OR NEW.city IS DISTINCT FROM OLD.city THEN
    changed := array_append(changed, 'adresse');
    v_priority := 'high';
  END IF;

  -- Si aucun changement significatif, exit
  IF array_length(changed, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Construire message
  v_msg := 'Mise à jour mission : ' || COALESCE(NEW.title, 'Mission #' || substring(NEW.id::text, 1, 8)) ||
           E'\n\nChangements: ' || array_to_string(changed, ', ');

  -- Idempotence par jour + champs changés
  v_dedup := format(
    'mission_updated:%s:%s:%s',
    NEW.id,
    to_char(now()::date, 'YYYY-MM-DD'),
    array_to_string(changed, '|')
  );

  BEGIN
    PERFORM public.create_notification_secure(
      NEW.assigned_user_id,
      'mission_updated',
      'Mission mise à jour',
      v_msg,
      ARRAY['in_app', 'push']::text[],
      v_priority,
      NEW.id,
      NULL,
      NULL,
      NULL,
      '/missions/' || NEW.id,
      'Voir la mission',
      jsonb_build_object(
        'mission_id', NEW.id,
        'changed_fields', changed,
        'old_status', OLD.status,
        'new_status', NEW.status
      ),
      v_dedup
    );
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mission_updated ON public.missions;

CREATE TRIGGER trg_mission_updated
  AFTER UPDATE OF status, scheduled_at, address, city, title ON public.missions
  FOR EACH ROW
  WHEN (OLD.assigned_user_id IS NOT NULL)
  EXECUTE FUNCTION public.notify_mission_updated();

COMMENT ON FUNCTION public.notify_mission_updated IS
'Trigger: notifies assigned technician when mission has significant changes';
