/*
  # Fix user address normalization

  1. Create view v_user_profile_address
    - Normalizes address data from user_clients table
    - Maps home_address → address, home_city → city, etc.
    - Single source of truth for address data

  2. Create RPC functions
    - rpc_get_user_address: Read normalized address data
    - rpc_save_user_address: Save address with UPSERT (INSERT or UPDATE)

  3. Security
    - RPC functions use SECURITY DEFINER to bypass RLS complexity
    - Functions are granted to authenticated users
*/

-- 1. Create normalized view
CREATE OR REPLACE VIEW v_user_profile_address AS
SELECT
  uc.user_id AS id,
  uc.home_address AS address,
  uc.home_city AS city,
  uc.home_zip AS zip,
  uc.home_lat AS lat,
  uc.home_lng AS lng
FROM user_clients uc;

-- 2. RPC to GET user address (normalized read)
CREATE OR REPLACE FUNCTION rpc_get_user_address(p_user_id uuid)
RETURNS TABLE(address text, city text, zip text, lat double precision, lng double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT address, city, zip, lat, lng
  FROM v_user_profile_address
  WHERE id = p_user_id;
$$;

-- 3. RPC to SAVE user address (normalized write with UPSERT)
CREATE OR REPLACE FUNCTION rpc_save_user_address(
  p_user_id uuid,
  p_address text,
  p_city text,
  p_zip text,
  p_lat double precision,
  p_lng double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- UPSERT into user_clients
  INSERT INTO user_clients(user_id, home_address, home_city, home_zip, home_lat, home_lng)
  VALUES (p_user_id, p_address, p_city, p_zip, p_lat, p_lng)
  ON CONFLICT (user_id) DO UPDATE
    SET home_address = EXCLUDED.home_address,
        home_city    = EXCLUDED.home_city,
        home_zip     = EXCLUDED.home_zip,
        home_lat     = EXCLUDED.home_lat,
        home_lng     = EXCLUDED.home_lng;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION rpc_get_user_address(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_save_user_address(uuid, text, text, text, double precision, double precision) TO authenticated;