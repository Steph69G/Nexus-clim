/*
  # Add location mode to profiles
  
  1. Changes
    - Add `location_mode` column to profiles table
      - Type: text with check constraint
      - Values: 'fixed_address' or 'gps_realtime'
      - Default: 'fixed_address' for ST role, 'gps_realtime' for SAL role
    - Add `address` column to store full address for fixed_address mode
    
  2. Notes
    - ST (sous-traitants) typically use fixed_address mode (business location)
    - SAL (salariés) typically use gps_realtime mode (mobile technicians)
    - Users can change their location mode in their profile settings
*/

-- Add location_mode column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'location_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN location_mode text DEFAULT 'fixed_address' CHECK (location_mode IN ('fixed_address', 'gps_realtime'));
  END IF;
END $$;

-- Add address column for storing full address
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN address text;
  END IF;
END $$;

-- Set default location_mode based on role for existing profiles
UPDATE profiles
SET location_mode = CASE 
  WHEN role = 'sal' THEN 'gps_realtime'
  ELSE 'fixed_address'
END
WHERE location_mode IS NULL OR location_mode = 'fixed_address';

-- Create index for location_mode queries
CREATE INDEX IF NOT EXISTS idx_profiles_location_mode ON profiles(location_mode);