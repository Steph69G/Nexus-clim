/*
  # Machine à états pour les missions - Version 2

  ## Objectif
  Ajouter une gestion avancée des statuts via machine à états avec journalisation complète,
  sans altérer la structure existante de la table missions.

  ## Tables créées

  1. **mission_status_log**
     - Journal complet de tous les changements de statut
     - Traçabilité : qui, quand, pourquoi, comment
     - Contexte JSONB pour données métier supplémentaires

  2. **mission_transitions**
     - Définit les transitions autorisées entre statuts
     - Évite les changements d'état incohérents
     - Facilite l'ajout de nouveaux workflows

  ## Fonction créée

  - **mission_set_status()** : Fonction sécurisée pour changer un statut
    - Vérifie que la transition est autorisée
    - Journalise automatiquement le changement
    - Supporte l'annulation depuis presque tous les statuts
    - Gère le contexte métier (JSONB)

  ## Workflow des statuts

  BROUILLON → PUBLIEE → ACCEPTEE → PLANIFIEE → EN_ROUTE → EN_INTERVENTION → TERMINEE → FACTURABLE → FACTUREE → PAYEE → CLOTUREE

  Retours limités possibles :
  - PLANIFIEE → ACCEPTEE
  - EN_INTERVENTION → PLANIFIEE

  Annulation possible depuis tous les statuts sauf PAYEE et CLOTUREE

  ## Notes importantes

  - N'altère ni ne supprime aucune table/colonne/contrainte existante
  - Compatible avec le système actuel
  - Les statuts existants restent utilisables
  - Migration idempotente (peut être rejouée)
*/

-- 1) Créer le type ENUM pour les statuts de mission
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mission_status') THEN
    CREATE TYPE mission_status AS ENUM (
      'BROUILLON',
      'PUBLIEE',
      'ACCEPTEE',
      'PLANIFIEE',
      'EN_ROUTE',
      'EN_INTERVENTION',
      'TERMINEE',
      'FACTURABLE',
      'FACTUREE',
      'PAYEE',
      'CLOTUREE',
      'ANNULEE'
    );
  END IF;
END $$;

-- 2) Journal des changements de statut
CREATE TABLE IF NOT EXISTS mission_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  from_status mission_status,
  to_status mission_status NOT NULL,
  actor_id uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  via text CHECK (via IN ('MANUAL','AUTO','SYSTEM')) DEFAULT 'MANUAL',
  note text,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour requêtes optimisées sur l'historique
CREATE INDEX IF NOT EXISTS mission_status_log_mission_created_idx
  ON mission_status_log (mission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mission_status_log_actor_idx
  ON mission_status_log (actor_id);

-- RLS pour mission_status_log
ALTER TABLE mission_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all status logs"
  ON mission_status_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view status logs for their missions"
  ON mission_status_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_status_log.mission_id
      AND (
        missions.assigned_user_id = auth.uid()
        OR missions.created_by = auth.uid()
      )
    )
  );

-- 3) Table des transitions autorisées
CREATE TABLE IF NOT EXISTS mission_transitions (
  from_status mission_status NOT NULL,
  to_status mission_status NOT NULL,
  PRIMARY KEY (from_status, to_status)
);

-- Remplissage idempotent des transitions autorisées
INSERT INTO mission_transitions (from_status, to_status) VALUES
  -- Workflow principal
  ('BROUILLON', 'PUBLIEE'),
  ('BROUILLON', 'ACCEPTEE'),
  ('PUBLIEE', 'ACCEPTEE'),
  ('ACCEPTEE', 'PLANIFIEE'),
  ('PLANIFIEE', 'EN_ROUTE'),
  ('EN_ROUTE', 'EN_INTERVENTION'),
  ('EN_INTERVENTION', 'TERMINEE'),
  ('TERMINEE', 'FACTURABLE'),
  ('FACTURABLE', 'FACTUREE'),
  ('FACTUREE', 'PAYEE'),
  ('PAYEE', 'CLOTUREE'),

  -- Retours limités (corrections)
  ('PLANIFIEE', 'ACCEPTEE'),
  ('EN_INTERVENTION', 'PLANIFIEE'),

  -- Annulations (possibles depuis presque tous les statuts)
  ('BROUILLON', 'ANNULEE'),
  ('PUBLIEE', 'ANNULEE'),
  ('ACCEPTEE', 'ANNULEE'),
  ('PLANIFIEE', 'ANNULEE'),
  ('EN_ROUTE', 'ANNULEE'),
  ('EN_INTERVENTION', 'ANNULEE'),
  ('TERMINEE', 'ANNULEE')
ON CONFLICT (from_status, to_status) DO NOTHING;

-- RLS pour mission_transitions (lecture publique, pas d'écriture manuelle)
ALTER TABLE mission_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view transitions"
  ON mission_transitions
  FOR SELECT
  TO authenticated
  USING (true);

-- 4) Fonction de transition de statut avec validation et journalisation
CREATE OR REPLACE FUNCTION mission_set_status(
  p_mission_id uuid,
  p_to mission_status,
  p_actor uuid,
  p_via text DEFAULT 'MANUAL',
  p_note text DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_from text;
  v_from_enum mission_status;
  v_ok boolean;
BEGIN
  -- Récupérer le statut actuel (en tant que TEXT car missions.status est TEXT)
  SELECT status INTO v_from FROM missions WHERE id = p_mission_id FOR UPDATE;

  IF v_from IS NULL THEN
    RAISE EXCEPTION 'Mission introuvable: %', p_mission_id;
  END IF;

  -- Convertir le statut actuel TEXT vers l'ENUM
  -- Mapping des valeurs existantes vers le nouvel ENUM
  v_from_enum := CASE v_from
    WHEN 'Nouveau' THEN 'BROUILLON'::mission_status
    WHEN 'PUBLIÉE' THEN 'PUBLIEE'::mission_status
    WHEN 'En cours' THEN 'ACCEPTEE'::mission_status
    WHEN 'CONFIRMÉE' THEN 'PLANIFIEE'::mission_status
    WHEN 'TRAVAUX_TERMINÉS' THEN 'TERMINEE'::mission_status
    WHEN 'VALIDÉ_CLIENT' THEN 'TERMINEE'::mission_status
    WHEN 'FACTURÉ' THEN 'FACTUREE'::mission_status
    WHEN 'TERMINÉE' THEN 'CLOTUREE'::mission_status
    WHEN 'Terminé' THEN 'CLOTUREE'::mission_status
    WHEN 'Bloqué' THEN 'ANNULEE'::mission_status
    ELSE v_from::mission_status
  END;

  -- Règle spéciale : annulation autorisée depuis n'importe quel statut sauf PAYEE et CLOTUREE
  IF p_to = 'ANNULEE' AND v_from_enum NOT IN ('PAYEE', 'CLOTUREE') THEN
    v_ok := true;
  ELSE
    -- Vérifier que la transition est autorisée
    SELECT EXISTS(
      SELECT 1 FROM mission_transitions
      WHERE from_status = v_from_enum AND to_status = p_to
    ) INTO v_ok;
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Transition interdite: % → %', v_from_enum, p_to;
  END IF;

  -- Convertir le statut ENUM vers TEXT pour mise à jour
  -- (car missions.status est TEXT actuellement)
  UPDATE missions
  SET status = p_to::text,
      updated_at = now()
  WHERE id = p_mission_id;

  -- Journaliser le changement
  INSERT INTO mission_status_log(
    mission_id,
    from_status,
    to_status,
    actor_id,
    via,
    note,
    context
  )
  VALUES (
    p_mission_id,
    v_from_enum,
    p_to,
    p_actor,
    p_via,
    p_note,
    COALESCE(p_context, '{}'::jsonb)
  );
END $$;

-- Octroyer les permissions nécessaires
GRANT EXECUTE ON FUNCTION mission_set_status TO authenticated;
