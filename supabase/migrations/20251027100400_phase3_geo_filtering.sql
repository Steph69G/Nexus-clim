/*
  # Phase 3 - Filtrage géographique techniciens

  1. Ajout champs profiles
    - work_radius_km: Rayon d'intervention (km)
    - work_latitude/work_longitude: Coordonnées base technicien
    - work_zones: Départements couverts (JSONB array)

  2. Fonction filter_offers_by_zone
    - Calcule distance entre mission et technicien
    - Filtre selon rayon configuré

  3. Policy RLS offers
    - Les ST voient uniquement offres dans leur rayon

  4. Notes
    - Utilise formule Haversine (distance géodésique)
    - Pas besoin PostGIS pour calculs simples
*/

-- Ajout colonnes profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS work_radius_km INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS work_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS work_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS work_zones JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN profiles.work_radius_km IS 'Rayon d''intervention du technicien en km';
COMMENT ON COLUMN profiles.work_latitude IS 'Latitude du point de base du technicien';
COMMENT ON COLUMN profiles.work_longitude IS 'Longitude du point de base du technicien';
COMMENT ON COLUMN profiles.work_zones IS 'Liste des départements couverts (ex: ["75", "92", "93"])';

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_profiles_work_coords ON profiles(work_latitude, work_longitude)
WHERE role = 'st';

-- Fonction: Calculer distance en km (Haversine)
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  earth_radius_km CONSTANT DECIMAL := 6371;
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;

  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);

  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon/2) * sin(dlon/2);

  c := 2 * atan2(sqrt(a), sqrt(1-a));

  RETURN earth_radius_km * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction: Filtrer offres par zone technicien
CREATE OR REPLACE FUNCTION filter_offers_by_zone(
  p_st_user_id UUID
) RETURNS TABLE (
  offer_id UUID,
  mission_id UUID,
  distance_km DECIMAL,
  in_radius BOOLEAN
) AS $$
DECLARE
  v_tech_lat DECIMAL;
  v_tech_lon DECIMAL;
  v_tech_radius INTEGER;
BEGIN
  -- Récupérer config technicien
  SELECT work_latitude, work_longitude, work_radius_km
  INTO v_tech_lat, v_tech_lon, v_tech_radius
  FROM profiles
  WHERE user_id = p_st_user_id;

  IF v_tech_lat IS NULL OR v_tech_lon IS NULL THEN
    -- Pas de coordonnées configurées: retourner toutes les offres
    RETURN QUERY
    SELECT
      o.id AS offer_id,
      o.mission_id,
      NULL::DECIMAL AS distance_km,
      true AS in_radius
    FROM offers o
    WHERE o.status = 'ouverte';
    RETURN;
  END IF;

  -- Filtrer par distance
  RETURN QUERY
  SELECT
    o.id AS offer_id,
    o.mission_id,
    calculate_distance_km(
      v_tech_lat,
      v_tech_lon,
      m.latitude,
      m.longitude
    ) AS distance_km,
    (
      calculate_distance_km(
        v_tech_lat,
        v_tech_lon,
        m.latitude,
        m.longitude
      ) <= v_tech_radius
    ) AS in_radius
  FROM offers o
  INNER JOIN missions m ON m.id = o.mission_id
  WHERE o.status = 'ouverte'
    AND m.latitude IS NOT NULL
    AND m.longitude IS NOT NULL
    AND calculate_distance_km(
      v_tech_lat,
      v_tech_lon,
      m.latitude,
      m.longitude
    ) <= v_tech_radius;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction helper: Mettre à jour coordonnées tech depuis adresse
CREATE OR REPLACE FUNCTION update_tech_coords_from_address(
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  v_lat DECIMAL;
  v_lon DECIMAL;
BEGIN
  -- Récupérer latitude/longitude depuis profiles.address
  -- (Supposant qu'elles sont déjà géocodées dans ces colonnes)
  SELECT latitude, longitude
  INTO v_lat, v_lon
  FROM profiles
  WHERE user_id = p_user_id;

  UPDATE profiles
  SET
    work_latitude = v_lat,
    work_longitude = v_lon
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy RLS modifiée sur offers: filtrage géographique
-- Supprimer ancienne policy si existe
DROP POLICY IF EXISTS "ST can view available offers" ON offers;

-- Nouvelle policy avec filtrage géo
CREATE POLICY "ST can view offers in their zone"
  ON offers FOR SELECT
  TO authenticated
  USING (
    -- Admins: toutes les offres
    (auth.jwt()->>'role')::text = 'admin'
    OR
    -- ST: offres dans leur rayon
    (
      (auth.jwt()->>'role')::text = 'st'
      AND
      EXISTS (
        SELECT 1 FROM filter_offers_by_zone(auth.uid())
        WHERE offer_id = offers.id
      )
    )
  );

-- Vue: offers_with_distance pour ST
CREATE OR REPLACE VIEW st_offers_with_distance AS
SELECT
  o.*,
  f.distance_km,
  f.in_radius,
  m.city,
  m.postal_code,
  m.scheduled_date,
  it.name AS intervention_type_name
FROM offers o
INNER JOIN missions m ON m.id = o.mission_id
INNER JOIN intervention_types it ON it.id = m.intervention_type_id
CROSS JOIN LATERAL filter_offers_by_zone(auth.uid()) f
WHERE f.offer_id = o.id
  AND o.status = 'ouverte';

-- RLS sur vue
ALTER VIEW st_offers_with_distance OWNER TO postgres;

-- Grant accès
GRANT SELECT ON st_offers_with_distance TO authenticated;
