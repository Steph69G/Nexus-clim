/*
  # Système de Rendez-vous (Appointments)

  ## Nouvelle table : appointments
  
  Cette table gère tous les rendez-vous planifiés avec les clients.
  
  ### Types de rendez-vous :
  - **devis_visite** : Visite sur place pour établir un devis
  - **installation** : Installation après acceptation du devis
  - **maintenance** : Maintenance préventive planifiée
  - **depannage** : Intervention de dépannage urgente
  
  ### Colonnes principales :
  - `id` : Identifiant unique du rendez-vous
  - `appointment_type` : Type de rendez-vous (voir ci-dessus)
  - `quote_id` : Lien vers le devis (nullable)
  - `mission_id` : Lien vers la mission (nullable)
  - `client_*` : Informations client
  - `scheduled_date` : Date du rendez-vous
  - `scheduled_time_start/end` : Créneau horaire
  - `duration_minutes` : Durée estimée
  - `assigned_user_id` : Technicien assigné
  - `status` : État du rendez-vous
  - `reminder_sent_at` : Date d'envoi du rappel automatique
  
  ## Sécurité (RLS)
  
  Politiques restrictives par rôle :
  - **Admins** : Accès complet (CRUD)
  - **SAL** : Création et modification de RDV
  - **Techniciens** : Lecture de leurs propres RDV + mise à jour statut
  - **Subcontractors** : Lecture de leurs propres RDV
  
  ## Index
  
  - Index sur `scheduled_date` pour affichage calendrier
  - Index sur `assigned_user_id` pour filtrer par technicien
  - Index sur `status` pour filtres
*/

-- Create enum for appointment types
DO $$ BEGIN
  CREATE TYPE appointment_type AS ENUM ('devis_visite', 'installation', 'maintenance', 'depannage');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for appointment status
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('planifié', 'confirmé', 'en_route', 'sur_place', 'terminé', 'annulé');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Appointment details
  appointment_type appointment_type NOT NULL,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  
  -- Client information
  client_name text NOT NULL,
  client_phone text NOT NULL,
  client_email text,
  client_address text NOT NULL,
  client_city text NOT NULL,
  client_zip text NOT NULL,
  
  -- Scheduling
  scheduled_date date NOT NULL,
  scheduled_time_start time NOT NULL,
  scheduled_time_end time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 120,
  
  -- Assignment
  assigned_user_id uuid REFERENCES profiles(user_id) NOT NULL,
  status appointment_status NOT NULL DEFAULT 'planifié',
  
  -- Additional info
  notes text,
  internal_notes text,
  
  -- Notifications
  reminder_sent_at timestamptz,
  client_confirmed_at timestamptz,
  
  -- Audit fields
  created_by_user_id uuid REFERENCES profiles(user_id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_user ON appointments(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_quote_id ON appointments(quote_id);
CREATE INDEX IF NOT EXISTS idx_appointments_mission_id ON appointments(mission_id);
CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(appointment_type);

-- RLS Policies

-- Admins: Full access
CREATE POLICY "Admins can view all appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update appointments"
  ON appointments FOR UPDATE
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

CREATE POLICY "Admins can delete appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- SAL: Can view and manage appointments
CREATE POLICY "SAL can view all appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  );

CREATE POLICY "SAL can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  );

CREATE POLICY "SAL can update appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sal'
    )
  );

-- Techs: Can view their own appointments and update status
CREATE POLICY "Techs can view their own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    assigned_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'tech'
    )
  );

CREATE POLICY "Techs can update their own appointment status"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    assigned_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'tech'
    )
  )
  WITH CHECK (
    assigned_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'tech'
    )
  );

-- Subcontractors: Can view their own appointments
CREATE POLICY "Subcontractors can view their own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    assigned_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'subcontractor'
    )
  );

CREATE POLICY "Subcontractors can update their own appointment status"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    assigned_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'subcontractor'
    )
  )
  WITH CHECK (
    assigned_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'subcontractor'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS set_appointments_updated_at ON appointments;
CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointments_updated_at();

-- Function to check for scheduling conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflict()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if technician already has an appointment at this time
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE assigned_user_id = NEW.assigned_user_id
    AND scheduled_date = NEW.scheduled_date
    AND status NOT IN ('annulé', 'terminé')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      -- Check for time overlap
      (NEW.scheduled_time_start >= scheduled_time_start AND NEW.scheduled_time_start < scheduled_time_end)
      OR (NEW.scheduled_time_end > scheduled_time_start AND NEW.scheduled_time_end <= scheduled_time_end)
      OR (NEW.scheduled_time_start <= scheduled_time_start AND NEW.scheduled_time_end >= scheduled_time_end)
    )
  ) THEN
    RAISE EXCEPTION 'Le technicien a déjà un rendez-vous sur ce créneau horaire';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent scheduling conflicts
DROP TRIGGER IF EXISTS check_appointment_conflict_trigger ON appointments;
CREATE TRIGGER check_appointment_conflict_trigger
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_appointment_conflict();