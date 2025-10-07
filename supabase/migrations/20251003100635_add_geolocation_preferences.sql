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