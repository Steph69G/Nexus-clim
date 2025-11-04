/*
  # Fix auth_role() pour normaliser les rôles

  1. Problème
    - auth_role() retournait le rôle brut de la DB ('USER', 'ADMIN', etc.)
    - Les RPC comparent avec des rôles normalisés ('st', 'admin', etc.)
    - Résultat : 'USER' ne matchait pas 'st' → ST ne voyait rien

  2. Solution
    - Normaliser les rôles dans auth_role() comme le front (roles.ts)
    - Mapping : USER→st, ADMIN→admin, TECH→tech, ST→st, SAL→sal, CLIENT→client

  3. Impact
    - Tous les RPC et RLS utilisant auth_role() fonctionneront correctement
*/

-- =====================================================
-- Fonction helper corrigée : normalise les rôles
-- =====================================================
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN raw_role = 'ADMIN' THEN 'admin'
    WHEN raw_role = 'DISPATCH' THEN 'admin'
    WHEN raw_role = 'TECH' THEN 'tech'
    WHEN raw_role = 'ST' THEN 'st'
    WHEN raw_role = 'SAL' THEN 'sal'
    WHEN raw_role = 'CLIENT' THEN 'client'
    WHEN raw_role = 'USER' THEN 'st'  -- Fallback ancien système
    ELSE 'st'  -- Fallback par défaut
  END
  FROM (
    SELECT UPPER(COALESCE(
      (SELECT role FROM public.profiles WHERE user_id = auth.uid()),
      'anonymous'
    )) as raw_role
  ) normalized;
$$;

COMMENT ON FUNCTION public.auth_role() IS
  'Retourne le rôle normalisé de l''utilisateur (admin, tech, st, sal, client). Mapping identique au front (roles.ts). USER→st pour compatibilité ancien système.';
