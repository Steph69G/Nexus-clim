/*
  # Workflow Business Hours & Notifications Queue

  ## Objectif
  Ajouter les contrôles temporels et la queue de notifications :
  - Helpers timezone Europe/Paris
  - Validation heures ouvrées
  - Queue notifications avec retry
  - Tracking no-show et replanification

  ## Modifications
  1. Fonctions timezone : now_paris(), is_business_hours()
  2. Table notifications_queue avec retry logic
  3. Colonnes tracking : no_show_at, rescheduled_count, initial_planned_at
  4. Validation business hours dans RPC

  ## Sécurité
  - Évite planifications hors heures
  - Traçabilité notifications complète
  - Statistiques no-show et replanifs
*/

-- =====================================================
-- 1) HELPERS TIMEZONE EUROPE/PARIS
-- =====================================================

-- Retourner l'heure actuelle en timezone Paris
CREATE OR REPLACE FUNCTION now_paris()
RETURNS timestamptz
LANGUAGE SQL
STABLE
AS $$
  SELECT now() AT TIME ZONE 'Europe/Paris';
$$;

COMMENT ON FUNCTION now_paris() IS 
'Retourne l''heure actuelle en timezone Europe/Paris (CEST/CET)';

-- Convertir timestamp en timezone Paris
CREATE OR REPLACE FUNCTION to_paris(p_timestamp timestamptz)
RETURNS timestamptz
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT p_timestamp AT TIME ZONE 'Europe/Paris';
$$;

COMMENT ON FUNCTION to_paris IS 
'Convertit un timestamp UTC en timezone Europe/Paris';

-- Vérifier si c'est un jour ouvré (lundi-vendredi)
CREATE OR REPLACE FUNCTION is_business_day(p_date timestamptz DEFAULT NULL)
RETURNS boolean
LANGUAGE SQL
STABLE
AS $$
  SELECT EXTRACT(ISODOW FROM COALESCE(to_paris(p_date), now_paris())) BETWEEN 1 AND 5;
$$;

COMMENT ON FUNCTION is_business_day IS 
'Vérifie si la date est un jour ouvré (lundi=1 à vendredi=5)';

-- Vérifier si c'est dans les heures ouvrées (07:00-20:00)
CREATE OR REPLACE FUNCTION is_business_hours(p_timestamp timestamptz DEFAULT NULL)
RETURNS boolean
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    EXTRACT(ISODOW FROM COALESCE(to_paris(p_timestamp), now_paris())) BETWEEN 1 AND 5
    AND (COALESCE(to_paris(p_timestamp), now_paris()))::time BETWEEN time '07:00' AND time '20:00';
$$;

COMMENT ON FUNCTION is_business_hours IS 
'Vérifie si timestamp est en heures ouvrées (lun-ven 07h-20h Paris)';

-- Formater timestamp en format français
CREATE OR REPLACE FUNCTION format_paris_datetime(p_timestamp timestamptz)
RETURNS text
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT to_char(to_paris(p_timestamp), 'DD/MM/YYYY à HH24:MI');
$$;

COMMENT ON FUNCTION format_paris_datetime IS 
'Formate un timestamp en format français (ex: 07/11/2025 à 14:30)';

-- =====================================================
-- 2) COLONNES TRACKING REPLANIFICATION & NO-SHOW
-- =====================================================

-- Ajouter colonnes missions si manquantes
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS initial_planned_at timestamptz,
  ADD COLUMN IF NOT EXISTS rescheduled_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_show_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_type text CHECK (no_show_type IN ('client', 'tech'));

-- Index pour statistiques
CREATE INDEX IF NOT EXISTS idx_missions_rescheduled
  ON missions(rescheduled_count)
  WHERE rescheduled_count > 0;

CREATE INDEX IF NOT EXISTS idx_missions_no_show
  ON missions(no_show_at, no_show_type)
  WHERE no_show_at IS NOT NULL;

COMMENT ON COLUMN missions.initial_planned_at IS 
'Date/heure de première planification (conservé lors de replanifications)';

COMMENT ON COLUMN missions.rescheduled_count IS 
'Nombre de replanifications (pour analytics)';

COMMENT ON COLUMN missions.no_show_at IS 
'Date/heure du no-show (client absent ou tech absent)';

COMMENT ON COLUMN missions.no_show_type IS 
'Type de no-show : client (absent RDV) ou tech (ne s''est pas présenté)';

-- =====================================================
-- 3) TABLE NOTIFICATIONS QUEUE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  template_name text NOT NULL,
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  channels text[] NOT NULL DEFAULT ARRAY['in_app'],
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Contenu notification
  title text NOT NULL,
  body text NOT NULL,
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- État & retry
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3,
  last_error text,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz DEFAULT now(),
  processed_at timestamptz,
  sent_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_notifications_queue_status
  ON notifications_queue(status, scheduled_for)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_notifications_queue_mission
  ON notifications_queue(mission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_queue_expires
  ON notifications_queue(expires_at)
  WHERE status = 'pending';

COMMENT ON TABLE notifications_queue IS 
'Queue de notifications avec retry logic et expiration (7 jours)';

COMMENT ON COLUMN notifications_queue.event_type IS 
'Type événement : mission_published, mission_accepted, mission_scheduled, etc.';

COMMENT ON COLUMN notifications_queue.template_name IS 
'Nom du template email/SMS à utiliser';

COMMENT ON COLUMN notifications_queue.recipients IS 
'Array JSON des destinataires : [{user_id, email, phone, name}]';

COMMENT ON COLUMN notifications_queue.channels IS 
'Canaux de diffusion : in_app, email, sms, push';

COMMENT ON COLUMN notifications_queue.scheduled_for IS 
'Date/heure planifiée d''envoi (permet notifications différées)';

-- =====================================================
-- 4) FONCTIONS HELPERS NOTIFICATIONS
-- =====================================================

-- Enqueue notification
CREATE OR REPLACE FUNCTION enqueue_notification(
  p_mission_id uuid,
  p_event_type text,
  p_template_name text,
  p_recipients jsonb,
  p_channels text[],
  p_title text,
  p_body text,
  p_action_url text DEFAULT NULL,
  p_priority text DEFAULT 'normal',
  p_scheduled_for timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications_queue (
    mission_id,
    event_type,
    template_name,
    recipients,
    channels,
    title,
    body,
    action_url,
    priority,
    scheduled_for
  )
  VALUES (
    p_mission_id,
    p_event_type,
    p_template_name,
    p_recipients,
    p_channels,
    p_title,
    p_body,
    p_action_url,
    p_priority,
    COALESCE(p_scheduled_for, now())
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION enqueue_notification IS 
'Ajoute une notification à la queue (traitement asynchrone)';

-- Marquer notification comme envoyée
CREATE OR REPLACE FUNCTION mark_notification_sent(
  p_notification_id uuid,
  p_sent_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications_queue
  SET 
    status = 'sent',
    sent_at = p_sent_at,
    processed_at = now()
  WHERE id = p_notification_id;
END;
$$;

-- Marquer notification comme échouée (avec retry)
CREATE OR REPLACE FUNCTION mark_notification_failed(
  p_notification_id uuid,
  p_error text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_retry_count int;
  v_max_retries int;
  v_new_status text;
BEGIN
  -- Récupérer compteurs
  SELECT retry_count, max_retries 
  INTO v_retry_count, v_max_retries
  FROM notifications_queue
  WHERE id = p_notification_id;
  
  -- Déterminer nouveau statut
  IF v_retry_count + 1 >= v_max_retries THEN
    v_new_status := 'failed';
  ELSE
    v_new_status := 'pending'; -- Retry
  END IF;
  
  -- Mettre à jour
  UPDATE notifications_queue
  SET 
    status = v_new_status,
    retry_count = retry_count + 1,
    last_error = p_error,
    processed_at = now(),
    scheduled_for = CASE 
      WHEN v_new_status = 'pending' 
      THEN now() + (interval '5 minutes' * (retry_count + 1))
      ELSE scheduled_for
    END
  WHERE id = p_notification_id;
END;
$$;

COMMENT ON FUNCTION mark_notification_failed IS 
'Marque notification échec avec retry exponentiel (5min, 10min, 15min)';

-- =====================================================
-- 5) VALIDATION BUSINESS HOURS DANS RPC SCHEDULE
-- =====================================================

-- Mise à jour rpc_schedule_mission pour valider heures ouvrées
CREATE OR REPLACE FUNCTION rpc_schedule_mission_validated(
  _mission_id uuid,
  _scheduled_start timestamptz,
  _scheduled_end timestamptz DEFAULT NULL,
  _override_business_hours boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
  v_initial_planned_at timestamptz;
  v_user_role text;
BEGIN
  -- Vérifier permissions
  IF NOT check_transition_permission(_mission_id) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;
  
  v_user_role := current_user_role();
  
  -- Valider heures ouvrées (sauf override admin)
  IF NOT _override_business_hours THEN
    IF NOT is_business_hours(_scheduled_start) THEN
      RAISE EXCEPTION 'Planification hors heures ouvrées (lun-ven 07h-20h). Date demandée: %', 
        format_paris_datetime(_scheduled_start);
    END IF;
  ELSIF v_user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Seuls admin/manager peuvent planifier hors heures ouvrées';
  END IF;

  -- Récupérer état actuel
  SELECT status, initial_planned_at 
  INTO v_status, v_initial_planned_at
  FROM missions 
  WHERE id = _mission_id 
  FOR UPDATE;

  IF v_status NOT IN ('ACCEPTEE', 'PLANIFIEE') THEN
    RAISE EXCEPTION 'Transition invalide : % → PLANIFIEE', v_status;
  END IF;

  -- Première planification ou replanification
  IF v_status = 'ACCEPTEE' THEN
    -- Première planification
    UPDATE missions
    SET
      status = 'PLANIFIEE',
      scheduled_start = _scheduled_start,
      scheduled_end = _scheduled_end,
      initial_planned_at = _scheduled_start,
      planned_at = now(),
      updated_at = now()
    WHERE id = _mission_id;
    
    PERFORM log_mission_workflow(_mission_id, v_status, 'PLANIFIEE', 'first_schedule');
  ELSE
    -- Replanification
    UPDATE missions
    SET
      scheduled_start = _scheduled_start,
      scheduled_end = _scheduled_end,
      rescheduled_count = rescheduled_count + 1,
      updated_at = now()
    WHERE id = _mission_id;
    
    PERFORM log_mission_workflow(
      _mission_id, 
      'PLANIFIEE', 
      'PLANIFIEE', 
      format('rescheduled_%s', rescheduled_count + 1)
    );
  END IF;
END;$$;

COMMENT ON FUNCTION rpc_schedule_mission_validated IS 
'Planifier mission avec validation heures ouvrées et tracking replanifications';

-- =====================================================
-- 6) RPC NO-SHOW
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_mark_no_show(
  _mission_id uuid,
  _no_show_type text,
  _note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier permissions
  IF NOT check_transition_permission(_mission_id) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;
  
  -- Valider type
  IF _no_show_type NOT IN ('client', 'tech') THEN
    RAISE EXCEPTION 'no_show_type invalide : %', _no_show_type;
  END IF;
  
  -- Marquer no-show
  UPDATE missions
  SET
    no_show_at = now(),
    no_show_type = _no_show_type,
    status = 'PLANIFIEE', -- Retour à planifiée
    updated_at = now()
  WHERE id = _mission_id;
  
  PERFORM log_mission_workflow(
    _mission_id,
    'EN_ROUTE',
    'PLANIFIEE',
    format('no_show_%s:%s', _no_show_type, COALESCE(_note, ''))
  );
END;$$;

COMMENT ON FUNCTION rpc_mark_no_show IS 
'Marquer no-show (client absent ou tech absent) et retour PLANIFIEE';

-- =====================================================
-- 7) RLS NOTIFICATIONS QUEUE
-- =====================================================

ALTER TABLE notifications_queue ENABLE ROW LEVEL SECURITY;

-- Admin/Manager voient tout
CREATE POLICY notifications_queue_admin_all ON notifications_queue
  USING (current_user_role() IN ('admin', 'manager'))
  WITH CHECK (current_user_role() IN ('admin', 'manager'));

-- Users voient leurs notifications (via mission)
CREATE POLICY notifications_queue_user_read ON notifications_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_id
      AND m.assigned_user_id = current_user_id()
    )
  );

-- =====================================================
-- FIN MIGRATION BUSINESS HOURS & NOTIFICATIONS
-- =====================================================
