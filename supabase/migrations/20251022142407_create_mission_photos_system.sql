/*
  # Système de Photos et Signatures pour Missions

  1. Tables
    - mission_photos (photos avant/pendant/après)
    - mission_signatures (signatures client/technicien)

  2. Security
    - RLS complet sur tables
    - Techniciens upload leurs photos
    - Admins voient tout
*/

-- Table des photos de mission
CREATE TABLE IF NOT EXISTS mission_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE,
  photo_type text NOT NULL CHECK (photo_type IN ('before', 'during', 'after', 'equipment', 'issue', 'other')),
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text DEFAULT 'image/jpeg',
  thumbnail_path text,
  uploaded_by uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mission_photos_mission 
  ON mission_photos(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_photos_type 
  ON mission_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_mission_photos_uploader 
  ON mission_photos(uploaded_by);

-- Table des signatures
CREATE TABLE IF NOT EXISTS mission_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE,
  signature_type text NOT NULL CHECK (signature_type IN ('client', 'technician')),
  storage_path text NOT NULL,
  signed_by_name text NOT NULL,
  signed_at timestamptz DEFAULT now(),
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mission_signatures_mission 
  ON mission_signatures(mission_id);

-- Trigger updated_at pour mission_photos
CREATE OR REPLACE FUNCTION update_mission_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mission_photos_updated_at
  BEFORE UPDATE ON mission_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_mission_photos_updated_at();

-- RLS Policies pour mission_photos
ALTER TABLE mission_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all photos"
  ON mission_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Technicians can view their mission photos"
  ON mission_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      INNER JOIN profiles p ON p.user_id = auth.uid()
      WHERE m.id = mission_photos.mission_id
      AND (m.assigned_to = auth.uid() OR p.role IN ('admin', 'sal'))
    )
  );

CREATE POLICY "Technicians can upload photos to their missions"
  ON mission_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_photos.mission_id
      AND m.assigned_to = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Users can delete their own photos"
  ON mission_photos FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all photos"
  ON mission_photos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies pour mission_signatures
ALTER TABLE mission_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all signatures"
  ON mission_signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Technicians can view their mission signatures"
  ON mission_signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_signatures.mission_id
      AND m.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Technicians can create signatures"
  ON mission_signatures FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.id = mission_signatures.mission_id
      AND m.assigned_to = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Admins can manage all signatures"
  ON mission_signatures FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
