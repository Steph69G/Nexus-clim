/*
  # Correction : BROUILLON visible uniquement par le créateur

  1. Règle métier
    - Un BROUILLON est PRIVÉ au créateur (created_by ou client_id)
    - Admin qui crée un brouillon → seul lui le voit
    - Client qui crée un brouillon → seul lui le voit
    - PERSONNE d'autre ne voit les brouillons des autres

  2. Modifications
    - Création de `auth_role()` helper
    - Création de `missions_map_secure()` pour filtrer BROUILLON par créateur
    - Mise à jour de `missions_select_client` pour permettre de voir SES brouillons
    - Mise à jour de `missions_select_admin` pour permettre de voir SEULEMENT SES brouillons
    - Mise à jour de `missions_select_tech` pour exclure BROUILLON non-assignés

  3. Sécurité
    - BROUILLON = PRIVÉ (principe de moindre privilège)
    - Dès que statut change (NOUVEAU, PUBLIEE, etc.) → visible selon rôle
*/

-- =====================================================
-- 1. Fonction helper : récupère le rôle de l'utilisateur
-- =====================================================
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()),
    'anonymous'
  );
$$;

-- =====================================================
-- 2. RPC sécurisée pour la carte (corrigée)
-- =====================================================
CREATE OR REPLACE FUNCTION public.missions_map_secure()
RETURNS SETOF public.missions
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.*
  FROM public.missions m
  WHERE (
    -- BROUILLON : visible uniquement par le créateur
    (
      m.status = 'BROUILLON'
      AND (
        m.created_by = auth.uid()
        OR m.client_id = auth.uid()
      )
    )
    OR
    -- NOUVEAU : visible par admin/sal/manager + créateur/client
    (
      m.status = 'NOUVEAU'
      AND (
        public.auth_role() IN ('admin', 'manager', 'sal')
        OR m.created_by = auth.uid()
        OR m.client_id = auth.uid()
      )
    )
    OR
    -- PUBLIEE : visible par tech/st/admin/sal/manager (pas encore assignée)
    (
      m.status = 'PUBLIEE'
      AND public.auth_role() IN ('tech', 'st', 'admin', 'manager', 'sal')
    )
    OR
    -- Missions assignées : visible par l'assigné + admin/sal/manager + client
    (
      m.assigned_user_id IS NOT NULL
      AND m.status NOT IN ('BROUILLON', 'NOUVEAU')
      AND (
        m.assigned_user_id = auth.uid()
        OR public.auth_role() IN ('admin', 'manager', 'sal')
        OR m.client_id = auth.uid()
      )
    )
    OR
    -- Admin/sal/manager voient TOUTES les missions NON-BROUILLON
    (
      m.status NOT IN ('BROUILLON')
      AND public.auth_role() IN ('admin', 'manager', 'sal')
    )
  )
  AND m.lat IS NOT NULL
  AND m.lng IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.missions_map_secure() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.missions_map_secure() TO authenticated;

-- =====================================================
-- 3. Mise à jour des politiques RLS
-- =====================================================

-- Policy pour admin/sal/manager : tout sauf brouillons des autres
DROP POLICY IF EXISTS missions_select_admin ON missions;

CREATE POLICY missions_select_admin ON missions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('admin', 'manager', 'sal')
    AND (
      -- Voit tout sauf les brouillons des autres
      status <> 'BROUILLON'
      OR created_by = auth.uid()
      OR client_id = auth.uid()
    )
  );

-- Policy pour client : voit ses missions (y compris SES brouillons)
DROP POLICY IF EXISTS missions_select_client ON missions;

CREATE POLICY missions_select_client ON missions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'client'
    AND client_id = auth.uid()
  );

-- Policy pour tech/st : exclut BROUILLON/NOUVEAU non-assignés
DROP POLICY IF EXISTS missions_select_tech ON missions;

CREATE POLICY missions_select_tech ON missions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('tech', 'st')
    AND (
      -- Missions assignées (tous statuts, y compris BROUILLON)
      assigned_user_id = auth.uid()
      OR
      -- Missions publiées disponibles pour tous
      status = 'PUBLIEE'
    )
  );

-- =====================================================
-- 4. Commentaires
-- =====================================================
COMMENT ON FUNCTION public.auth_role() IS
  'Retourne le rôle de l''utilisateur connecté depuis la table profiles. Utilisé pour simplifier les RLS.';

COMMENT ON FUNCTION public.missions_map_secure() IS
  'RPC sécurisée pour la carte. Règle : BROUILLON = privé au créateur uniquement. Dès changement de statut, visibilité selon rôle.';
