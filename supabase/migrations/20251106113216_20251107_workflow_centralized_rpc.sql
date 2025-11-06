/*
  # Workflow Centralized RPC

  ## Objectif
  Centraliser la logique de transition dans une fonction générique :
  - Enrichir mission_transitions avec metadata
  - Créer rpc_transition_mission() générique
  - Éviter duplication code dans chaque RPC
  - Faciliter ajout nouvelles transitions

  ## Modifications
  1. Colonnes mission_transitions : allowed_roles[], require_assigned, auto_effects
  2. Fonction rpc_transition_mission() avec validation centralisée
  3. Fonction apply_transition_effects() pour effets automatiques
  4. Documentation transitions

  ## Bénéfices
  - Maintenance simplifiée
  - Ajout transitions sans code SQL
  - Validation uniforme
  - Traçabilité complète
*/

-- =====================================================
-- 1) ENRICHIR TABLE MISSION_TRANSITIONS
-- =====================================================

-- Ajouter colonnes metadata si manquantes
ALTER TABLE mission_transitions
  ADD COLUMN IF NOT EXISTS allowed_roles text[] DEFAULT ARRAY['admin','manager'],
  ADD COLUMN IF NOT EXISTS require_assigned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_scheduled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS checks text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS auto_effects jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

COMMENT ON COLUMN mission_transitions.allowed_roles IS 
'Rôles autorisés à effectuer cette transition';

COMMENT ON COLUMN mission_transitions.require_assigned IS 
'Transition nécessite mission assignée à un technicien';

COMMENT ON COLUMN mission_transitions.require_scheduled IS 
'Transition nécessite dates scheduled_start définies';

COMMENT ON COLUMN mission_transitions.checks IS 
'Liste de validations à effectuer : business_hours, signatures, photos_min';

COMMENT ON COLUMN mission_transitions.auto_effects IS 
'Effets automatiques JSON : {set:{field:value}, create:"report", notify:"template"}';

COMMENT ON COLUMN mission_transitions.description IS 
'Description métier de la transition pour documentation';

-- =====================================================
-- 2) SEED TRANSITIONS ENRICHIES
-- =====================================================

-- Mettre à jour transitions existantes avec metadata
UPDATE mission_transitions SET
  allowed_roles = ARRAY['admin','manager','sal'],
  require_assigned = false,
  checks = ARRAY['draft_only'],
  description = 'Publier la mission pour la rendre visible aux techniciens'
WHERE from_status = 'BROUILLON' AND to_status = 'PUBLIEE';

UPDATE mission_transitions SET
  allowed_roles = ARRAY['tech','st','sal'],
  require_assigned = false,
  auto_effects = '{"set":{"assigned_user_id":"current_user","accepted_at":"now"}}'::jsonb,
  description = 'Technicien accepte la mission (auto-assignation)'
WHERE from_status = 'PUBLIEE' AND to_status = 'ACCEPTEE';

UPDATE mission_transitions SET
  allowed_roles = ARRAY['admin','manager','sal','tech'],
  require_assigned = true,
  require_scheduled = false,
  checks = ARRAY['business_hours'],
  description = 'Planifier la mission avec date/heure intervention'
WHERE from_status = 'ACCEPTEE' AND to_status = 'PLANIFIEE';

UPDATE mission_transitions SET
  allowed_roles = ARRAY['tech','sal'],
  require_assigned = true,
  description = 'Technicien démarre trajet vers le site'
WHERE from_status = 'PLANIFIEE' AND to_status = 'EN_ROUTE';

UPDATE mission_transitions SET
  allowed_roles = ARRAY['tech','sal','admin','manager'],
  require_assigned = true,
  auto_effects = '{"create":"report","set":{"report_status":"A_COMPLETER"}}'::jsonb,
  description = 'Technicien arrive sur site et démarre intervention'
WHERE from_status = 'EN_ROUTE' AND to_status = 'EN_INTERVENTION';

UPDATE mission_transitions SET
  allowed_roles = ARRAY['tech','sal'],
  require_assigned = true,
  description = 'Mettre mission en pause (pièces manquantes, client absent...)'
WHERE from_status = 'EN_INTERVENTION' AND to_status = 'EN_PAUSE';

UPDATE mission_transitions SET
  allowed_roles = ARRAY['tech','sal'],
  require_assigned = true,
  description = 'Reprendre mission après pause'
WHERE from_status = 'EN_PAUSE' AND to_status = 'EN_INTERVENTION';

UPDATE mission_transitions SET
  allowed_roles = ARRAY['tech','sal'],
  require_assigned = true,
  checks = ARRAY['signatures','photos_min'],
  auto_effects = '{"set":{"report_status":"SOUMIS","finished_at":"now"}}'::jsonb,
  description = 'Terminer intervention (nécessite signatures + photos)'
WHERE from_status = 'EN_INTERVENTION' AND to_status = 'TERMINEE';

-- =====================================================
-- 3) FONCTION APPLY TRANSITION EFFECTS
-- =====================================================

CREATE OR REPLACE FUNCTION apply_transition_effects(
  p_mission_id uuid,
  p_effects jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_set_clause jsonb;
  v_create text;
  v_notify text;
  v_key text;
  v_value text;
  v_sql text;
  v_report_exists boolean;
BEGIN
  -- Effets "set" : mettre à jour colonnes
  v_set_clause := p_effects->'set';
  IF v_set_clause IS NOT NULL THEN
    FOR v_key, v_value IN SELECT * FROM jsonb_each_text(v_set_clause)
    LOOP
      -- Gérer valeurs spéciales
      IF v_value = 'current_user' THEN
        v_sql := format('UPDATE missions SET %I = current_user_id() WHERE id = $1', v_key);
      ELSIF v_value = 'now' THEN
        v_sql := format('UPDATE missions SET %I = now() WHERE id = $1', v_key);
      ELSE
        v_sql := format('UPDATE missions SET %I = %L WHERE id = $1', v_key, v_value);
      END IF;
      
      EXECUTE v_sql USING p_mission_id;
    END LOOP;
  END IF;
  
  -- Effet "create" : créer rapport si n'existe pas
  v_create := p_effects->>'create';
  IF v_create = 'report' THEN
    SELECT EXISTS(SELECT 1 FROM intervention_reports WHERE mission_id = p_mission_id)
    INTO v_report_exists;
    
    IF NOT v_report_exists THEN
      INSERT INTO intervention_reports (mission_id)
      VALUES (p_mission_id);
    END IF;
  END IF;
  
  -- Effet "notify" : enqueue notification
  v_notify := p_effects->>'notify';
  IF v_notify IS NOT NULL THEN
    -- TODO: Appeler enqueue_notification avec template
    RAISE NOTICE 'Notification à envoyer: %', v_notify;
  END IF;
END;
$$;

COMMENT ON FUNCTION apply_transition_effects IS 
'Applique effets automatiques d''une transition (set fields, create report, notify)';

-- =====================================================
-- 4) FONCTION CENTRALISÉE RPC_TRANSITION_MISSION
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_transition_mission(
  p_mission_id uuid,
  p_to_status text,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_override_checks boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mission missions%ROWTYPE;
  v_transition mission_transitions%ROWTYPE;
  v_user_role text;
  v_user_id uuid;
  v_can_transition boolean := false;
  v_check text;
BEGIN
  -- Récupérer user info
  v_user_role := current_user_role();
  v_user_id := current_user_id();
  
  -- Lock mission
  SELECT * INTO v_mission 
  FROM missions 
  WHERE id = p_mission_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission introuvable: %', p_mission_id;
  END IF;
  
  -- Récupérer règles transition
  SELECT * INTO v_transition
  FROM mission_transitions
  WHERE from_status = v_mission.status::text
    AND to_status = p_to_status;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transition invalide: % → % (non autorisée)', 
      v_mission.status, p_to_status;
  END IF;
  
  -- Vérifier rôle autorisé
  IF NOT (v_user_role = ANY(v_transition.allowed_roles)) THEN
    RAISE EXCEPTION 'Rôle % non autorisé pour transition % → %', 
      v_user_role, v_mission.status, p_to_status;
  END IF;
  
  -- Vérifier require_assigned
  IF v_transition.require_assigned AND v_mission.assigned_user_id IS NULL THEN
    RAISE EXCEPTION 'Mission non assignée (transition nécessite assignation)';
  END IF;
  
  -- Si tech/st, vérifier assignation
  IF v_user_role IN ('tech', 'st') THEN
    IF v_mission.assigned_user_id != v_user_id THEN
      RAISE EXCEPTION 'Mission assignée à un autre technicien';
    END IF;
  END IF;
  
  -- Vérifier require_scheduled
  IF v_transition.require_scheduled AND v_mission.scheduled_start IS NULL THEN
    RAISE EXCEPTION 'Mission non planifiée (transition nécessite scheduled_start)';
  END IF;
  
  -- Exécuter validations (sauf override admin)
  IF NOT p_override_checks OR v_user_role NOT IN ('admin', 'manager') THEN
    FOREACH v_check IN ARRAY v_transition.checks
    LOOP
      CASE v_check
        WHEN 'business_hours' THEN
          IF NOT is_business_hours() THEN
            RAISE EXCEPTION 'Transition hors heures ouvrées (lun-ven 07h-20h)';
          END IF;
          
        WHEN 'signatures' THEN
          IF NOT validate_report_completion(p_mission_id) THEN
            RAISE EXCEPTION 'Signatures ou photos manquantes';
          END IF;
          
        WHEN 'photos_min' THEN
          IF NOT validate_report_completion(p_mission_id) THEN
            RAISE EXCEPTION 'Photos minimales non fournies';
          END IF;
          
        ELSE
          RAISE NOTICE 'Validation ignorée: %', v_check;
      END CASE;
    END LOOP;
  END IF;
  
  -- Appliquer transition
  UPDATE missions
  SET 
    status = p_to_status::mission_status,
    updated_at = now()
  WHERE id = p_mission_id;
  
  -- Appliquer effets automatiques
  IF v_transition.auto_effects IS NOT NULL AND v_transition.auto_effects != '{}'::jsonb THEN
    PERFORM apply_transition_effects(p_mission_id, v_transition.auto_effects);
  END IF;
  
  -- Logger
  PERFORM log_mission_workflow(
    p_mission_id,
    v_mission.status::text,
    p_to_status,
    COALESCE(p_reason, v_transition.description)
  );
  
  -- Retourner résultat
  RETURN jsonb_build_object(
    'success', true,
    'from_status', v_mission.status,
    'to_status', p_to_status,
    'mission_id', p_mission_id,
    'transitioned_by', v_user_id,
    'transitioned_at', now()
  );
END;
$$;

COMMENT ON FUNCTION rpc_transition_mission IS 
'Fonction centralisée de transition : valide rôles, permissions, checks, applique effets';

-- =====================================================
-- 5) WRAPPERS MÉTIER (gardent API existante)
-- =====================================================

-- Wrapper publish
CREATE OR REPLACE FUNCTION rpc_publish_mission_v2(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM rpc_transition_mission(_mission_id, 'PUBLIEE', 'published_via_rpc');
END;
$$;

-- Wrapper accept
CREATE OR REPLACE FUNCTION rpc_accept_mission_v2(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM rpc_transition_mission(_mission_id, 'ACCEPTEE', 'accepted_via_rpc');
END;
$$;

-- Wrapper start_travel
CREATE OR REPLACE FUNCTION rpc_start_travel_v2(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM rpc_transition_mission(_mission_id, 'EN_ROUTE', 'travel_started');
END;
$$;

-- Wrapper start_intervention
CREATE OR REPLACE FUNCTION rpc_start_intervention_v2(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM rpc_transition_mission(_mission_id, 'EN_INTERVENTION', 'intervention_started');
END;
$$;

-- Wrapper complete_intervention
CREATE OR REPLACE FUNCTION rpc_complete_intervention_v2(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM rpc_transition_mission(_mission_id, 'TERMINEE', 'intervention_completed');
END;
$$;

COMMENT ON FUNCTION rpc_publish_mission_v2 IS 'Wrapper v2 utilisant rpc_transition_mission centralisé';
COMMENT ON FUNCTION rpc_accept_mission_v2 IS 'Wrapper v2 utilisant rpc_transition_mission centralisé';
COMMENT ON FUNCTION rpc_start_travel_v2 IS 'Wrapper v2 utilisant rpc_transition_mission centralisé';
COMMENT ON FUNCTION rpc_start_intervention_v2 IS 'Wrapper v2 utilisant rpc_transition_mission centralisé';
COMMENT ON FUNCTION rpc_complete_intervention_v2 IS 'Wrapper v2 utilisant rpc_transition_mission centralisé';

-- =====================================================
-- 6) VUE DOCUMENTATION TRANSITIONS
-- =====================================================

CREATE OR REPLACE VIEW v_workflow_transitions_doc AS
SELECT
  from_status,
  to_status,
  allowed_roles,
  require_assigned,
  require_scheduled,
  checks,
  description,
  auto_effects
FROM mission_transitions
ORDER BY 
  CASE from_status
    WHEN 'BROUILLON' THEN 1
    WHEN 'PUBLIEE' THEN 2
    WHEN 'ACCEPTEE' THEN 3
    WHEN 'PLANIFIEE' THEN 4
    WHEN 'EN_ROUTE' THEN 5
    WHEN 'EN_INTERVENTION' THEN 6
    WHEN 'EN_PAUSE' THEN 7
    WHEN 'TERMINEE' THEN 8
    ELSE 99
  END;

COMMENT ON VIEW v_workflow_transitions_doc IS 
'Documentation complète des transitions de workflow (contrat API)';

-- =====================================================
-- FIN MIGRATION RPC CENTRALISÉ
-- =====================================================
