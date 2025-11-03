/*
  # Sécurisation de l'accès aux missions BROUILLON

  1. Nouvelles fonctions
    - `auth_role()` : Helper pour récupérer le rôle de l'utilisateur courant
    - `missions_map_secure()` : RPC sécurisée pour la carte (filtre BROUILLON)

  2. Modifications des politiques RLS
    - Met à jour `missions_select_tech` pour exclure les BROUILLON/NOUVEAU non-assignés
    - Met à jour `missions_select_client` pour exclure les BROUILLON

  3. Sécurité
    - Les tech/st ne voient que : PUBLIEE + leurs missions assignées (tous statuts)
    - Les clients ne voient pas les BROUILLON
    - Les admin/sal/manager voient tout
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
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'anonymous'
  );
$$;

-- =====================================================
-- 2. RPC sécurisée pour la carte
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
    -- Admin/sal/manager voient tout
    public.auth_role() IN ('admin', 'manager', 'sal')
    OR
    -- Tech/st voient : PUBLIEE OU leurs missions assignées
    (
      public.auth_role() IN ('tech', 'st')
      AND (
        (m.status NOT IN ('BROUILLON', 'NOUVEAU') AND m.status = 'PUBLIEE')
        OR m.assigned_user_id = auth.uid()
      )
    )
    OR
    -- Clients voient leurs missions (sauf BROUILLON)
    (
      public.auth_role() = 'client'
      AND m.client_id = auth.uid()
      AND m.status <> 'BROUILLON'
    )
  )
  AND m.lat IS NOT NULL
  AND m.lng IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.missions_map_secure() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.missions_map_secure() TO authenticated;

-- =====================================================
-- 3. Mise à jour des politiques RLS existantes
-- =====================================================

-- Supprime les anciennes policies pour tech/st/client
DROP POLICY IF EXISTS missions_select_tech ON missions;
DROP POLICY IF EXISTS missions_select_client ON missions;

-- Nouvelle policy pour tech/st : exclut BROUILLON/NOUVEAU non-assignés
CREATE POLICY missions_select_tech ON missions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('tech', 'st')
    AND (
      -- Missions assignées (tous statuts, y compris BROUILLON)
      assigned_user_id = auth.uid()
      OR
      -- Missions publiées disponibles pour tous
      status = 'PUBLIEE'
    )
  );

-- Nouvelle policy pour client : exclut BROUILLON
CREATE POLICY missions_select_client ON missions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'client'
    AND client_id = auth.uid()
    AND status <> 'BROUILLON'
  );

-- =====================================================
-- 4. Commentaires explicatifs
-- =====================================================
COMMENT ON FUNCTION public.auth_role() IS
  'Retourne le rôle de l''utilisateur connecté depuis la table profiles. Utilisé pour simplifier les RLS.';

COMMENT ON FUNCTION public.missions_map_secure() IS
  'Fonction sécurisée pour récupérer les missions affichables sur la carte. Applique les règles métier : admin voit tout, tech/st voient PUBLIEE + assignées, clients voient leurs missions sauf BROUILLON.';
