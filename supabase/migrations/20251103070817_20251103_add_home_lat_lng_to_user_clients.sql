/*
  # Add geolocation columns to user_clients

  1. Changes
    - Add home_lat column (double precision) for latitude
    - Add home_lng column (double precision) for longitude
    
  2. Notes
    - These columns store Google Maps geocoded coordinates
    - Nullable to allow addresses without precise coordinates
*/

ALTER TABLE user_clients 
  ADD COLUMN IF NOT EXISTS home_lat double precision,
  ADD COLUMN IF NOT EXISTS home_lng double precision;