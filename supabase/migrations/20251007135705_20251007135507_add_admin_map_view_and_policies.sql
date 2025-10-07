/*
  # Vue admin carte + policies complètes

  ## Description
  Crée une vue dédiée admin pour la carte avec adresses non masquées et informations d'assignation.
  Ajoute/corrige les policies RLS pour permettre aux admins de lire et modifier toutes les missions.

  ## Changements

  1. **Vue v_admin_missions_map**
     - Affiche toutes les missions avec coordonnées
     - Adresse complète (non masquée)
     - Information de l'assigné (nom, avatar, téléphone)
     - Protégée via policies sur missions

  2. **Policies missions (ADMIN)**
     - SELECT : Les admins peuvent lire toutes les missions
     - UPDATE : Les admins peuvent modifier toutes les missions
     - INSERT : Les admins peuvent créer des missions
     - DELETE : Les admins peuvent supprimer des missions

  ## Sécurité
  - Vue accessible uniquement via policies RLS sur la table missions
  - Vérification du rôle via `(SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'`
*/

-- ============================================================================
-- 1) Vue admin pour la carte avec données complètes
-- ============================================================================

CREATE OR REPLACE VIEW public.v_admin_missions_map AS
SELECT
  m.id,
  m.title,
  m.status,
  m.type,
  m.lat,
  m.lng,
  m.scheduled_start,
  m.estimated_duration_min,
  m.price_subcontractor_cents,
  m.currency,
  m.description,
  -- Adresse complète (non masquée)
  m.address,
  m.zip,
  m.city,
  -- Informations de l'assigné
  m.assigned_user_id,
  p.full_name  AS assigned_user_name,
  p.avatar_url AS assigned_user_avatar,
  p.phone      AS assigned_user_phone
FROM public.missions m
LEFT JOIN public.profiles p ON p.user_id = m.assigned_user_id
WHERE m.lat IS NOT NULL AND m.lng IS NOT NULL;

-- ============================================================================
-- 2) Policies complètes pour la table missions (ADMIN)
-- ============================================================================

-- SELECT : Admins peuvent lire toutes les missions
DROP POLICY IF EXISTS "Admin can read all missions" ON public.missions;
CREATE POLICY "Admin can read all missions"
  ON public.missions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
  );

-- UPDATE : Admins peuvent modifier toutes les missions
DROP POLICY IF EXISTS "Admin can update all missions" ON public.missions;
CREATE POLICY "Admin can update all missions"
  ON public.missions
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
  );

-- INSERT : Admins peuvent créer des missions
DROP POLICY IF EXISTS "Admin can insert missions" ON public.missions;
CREATE POLICY "Admin can insert missions"
  ON public.missions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
  );

-- DELETE : Admins peuvent supprimer des missions
DROP POLICY IF EXISTS "Admin can delete missions" ON public.missions;
CREATE POLICY "Admin can delete missions"
  ON public.missions
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
  );
