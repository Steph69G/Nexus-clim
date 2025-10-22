/*
  # Créer le bucket Storage pour les photos de missions

  1. Bucket
    - mission-photos (public = false)

  2. Storage Policies
    - Techniciens peuvent upload leurs photos
    - Admins peuvent tout faire
    - Utilisateurs peuvent voir leurs photos
*/

-- Créer le bucket pour les photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mission-photos',
  'mission-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Admins peuvent tout voir
CREATE POLICY "Admins can view all mission photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'mission-photos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Techniciens peuvent voir leurs photos de missions
CREATE POLICY "Technicians can view their mission photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'mission-photos'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT m.id::text
        FROM missions m
        WHERE m.assigned_to = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'sal')
      )
    )
  );

-- Policy: Techniciens peuvent upload
CREATE POLICY "Technicians can upload mission photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'mission-photos'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT m.id::text
        FROM missions m
        WHERE m.assigned_to = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'sal')
      )
    )
  );

-- Policy: Utilisateurs peuvent supprimer leurs propres uploads
CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'mission-photos'
    AND (
      owner = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  );

-- Policy: Admins peuvent tout mettre à jour
CREATE POLICY "Admins can update all mission photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'mission-photos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'mission-photos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
