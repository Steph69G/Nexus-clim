/*
  # Add geolocation preferences to profiles

  1. New Columns
    - `share_location` (boolean)
      - Indicates if employee agrees to share their real-time GPS location
      - Default: false
      - Employee controls this in their profile

    - `display_mode` (text)
      - How the admin wants to display this employee on the map
      - Values: 'address', 'gps', 'hidden'
      - Default: 'address'
      - Admin controls this

  2. Business Logic
    - Employee sets `share_location` = true to allow GPS tracking
    - Admin can choose display mode:
      - 'address': Show fixed home address (less useful but always available)
      - 'gps': Show real-time GPS location (only works if employee shares location)
      - 'hidden': Don't show this employee on the map at all

  3. Security
    - Employees can only update their own `share_location`
    - Only admins can update `display_mode`
*/

-- Add share_location column (employee preference)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'share_location'
  ) THEN
    ALTER TABLE profiles ADD COLUMN share_location boolean DEFAULT false;
  END IF;
END $$;

-- Add display_mode column (admin preference)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'display_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN display_mode text DEFAULT 'address' CHECK (display_mode IN ('address', 'gps', 'hidden'));
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_share_location ON profiles(share_location);
CREATE INDEX IF NOT EXISTS idx_profiles_display_mode ON profiles(display_mode);

-- Comment on columns for documentation
COMMENT ON COLUMN profiles.share_location IS 'Employee consent to share real-time GPS location. Controlled by employee.';
COMMENT ON COLUMN profiles.display_mode IS 'How admin wants to display employee on map: address, gps, or hidden. Controlled by admin.';
