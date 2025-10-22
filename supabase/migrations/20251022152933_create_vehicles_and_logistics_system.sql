/*
  # Système de Gestion Véhicules et Logistique

  ## 1. Tables Véhicules
    ### vehicles (flotte véhicules)
      - id, registration_number (immatriculation)
      - brand, model, year
      - vehicle_type (van/car/truck)
      - fuel_type (diesel/petrol/electric/hybrid)
      - status (available/in_use/maintenance/retired)
      - purchase_date, purchase_price
      - current_mileage, last_mileage_update
      - insurance_expiry, technical_control_expiry
      - assigned_to_user_id (technicien assigné)
      - notes, photo_url
      - created_at, updated_at

    ### vehicle_maintenance (entretien véhicules)
      - id, vehicle_id
      - maintenance_type (oil_change/tire_change/revision/technical_control/repair/other)
      - maintenance_date, next_maintenance_date
      - mileage_at_maintenance
      - cost, provider (garage/mécanicien)
      - description, notes
      - invoice_url
      - performed_by_user_id
      - status (scheduled/completed/cancelled)
      - created_at

    ### vehicle_assignments (historique affectations)
      - id, vehicle_id, user_id
      - assigned_at, returned_at
      - initial_mileage, final_mileage
      - condition_notes
      - created_at

    ### vehicle_trips (trajets/déplacements)
      - id, vehicle_id, mission_id, user_id
      - start_time, end_time
      - start_location, end_location
      - start_mileage, end_mileage, distance_km
      - fuel_cost, toll_cost, parking_cost
      - purpose (mission/return/supply/other)
      - notes
      - created_at

  ## 2. Vues
    - vehicle_fleet_overview (vue globale flotte)
    - vehicle_maintenance_alerts (alertes entretien)
    - vehicle_costs_summary (coûts par véhicule)

  ## 3. Functions
    - assign_vehicle_to_user() - Affectation véhicule
    - schedule_vehicle_maintenance() - Planifier entretien
    - calculate_vehicle_costs() - Calcul coûts
    - get_available_vehicles() - Véhicules dispos

  ## 4. Security
    - RLS complet
    - Admin/SAL gèrent les véhicules
    - Techniciens voient leur véhicule assigné
*/

-- Table flotte véhicules
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number text NOT NULL UNIQUE,
  brand text NOT NULL,
  model text NOT NULL,
  year integer,
  
  vehicle_type text NOT NULL DEFAULT 'van' CHECK (vehicle_type IN ('van', 'car', 'truck', 'motorcycle')),
  fuel_type text NOT NULL DEFAULT 'diesel' CHECK (fuel_type IN ('diesel', 'petrol', 'electric', 'hybrid', 'plugin_hybrid')),
  
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  
  purchase_date date,
  purchase_price decimal(10,2),
  
  current_mileage integer DEFAULT 0,
  last_mileage_update timestamptz DEFAULT now(),
  
  insurance_company text,
  insurance_policy_number text,
  insurance_expiry date,
  
  technical_control_expiry date,
  
  assigned_to_user_id uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  
  vin text,
  color text,
  seats integer DEFAULT 2,
  cargo_capacity_m3 decimal(5,2),
  
  notes text,
  photo_url text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table entretien véhicules
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('oil_change', 'tire_change', 'revision', 'technical_control', 'repair', 'cleaning', 'other')),
  maintenance_date date NOT NULL,
  next_maintenance_date date,
  next_maintenance_mileage integer,
  
  mileage_at_maintenance integer,
  
  cost decimal(10,2) DEFAULT 0,
  provider text,
  
  description text NOT NULL,
  notes text,
  invoice_url text,
  
  performed_by_user_id uuid REFERENCES profiles(user_id),
  
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table historique affectations
CREATE TABLE IF NOT EXISTS vehicle_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE,
  
  assigned_at timestamptz NOT NULL DEFAULT now(),
  returned_at timestamptz,
  
  initial_mileage integer,
  final_mileage integer,
  
  initial_condition text,
  final_condition text,
  condition_notes text,
  
  created_at timestamptz DEFAULT now()
);

-- Table trajets/déplacements
CREATE TABLE IF NOT EXISTS vehicle_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE,
  
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  
  start_location text,
  end_location text,
  start_lat decimal(10,8),
  start_lng decimal(11,8),
  end_lat decimal(10,8),
  end_lng decimal(11,8),
  
  start_mileage integer,
  end_mileage integer,
  distance_km decimal(8,2),
  
  fuel_cost decimal(8,2) DEFAULT 0,
  toll_cost decimal(8,2) DEFAULT 0,
  parking_cost decimal(8,2) DEFAULT 0,
  other_costs decimal(8,2) DEFAULT 0,
  
  purpose text NOT NULL DEFAULT 'mission' CHECK (purpose IN ('mission', 'return', 'supply', 'maintenance', 'other')),
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_to ON vehicles(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle ON vehicle_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_date ON vehicle_maintenance(maintenance_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_status ON vehicle_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_vehicle ON vehicle_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_user ON vehicle_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_trips_vehicle ON vehicle_trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_trips_mission ON vehicle_trips(mission_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_trips_user ON vehicle_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_trips_date ON vehicle_trips(start_time);

-- Triggers updated_at
CREATE OR REPLACE FUNCTION update_vehicles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicles_timestamp();

CREATE TRIGGER vehicle_maintenance_updated_at
  BEFORE UPDATE ON vehicle_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicles_timestamp();

CREATE TRIGGER vehicle_trips_updated_at
  BEFORE UPDATE ON vehicle_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicles_timestamp();

-- Fonction affectation véhicule
CREATE OR REPLACE FUNCTION assign_vehicle_to_user(
  p_vehicle_id uuid,
  p_user_id uuid,
  p_initial_mileage integer DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_assignment_id uuid;
  v_current_mileage integer;
BEGIN
  -- Vérifier si véhicule disponible
  IF NOT EXISTS (
    SELECT 1 FROM vehicles 
    WHERE id = p_vehicle_id 
    AND status = 'available'
  ) THEN
    RAISE EXCEPTION 'Véhicule non disponible';
  END IF;
  
  -- Récupérer kilométrage actuel
  SELECT current_mileage INTO v_current_mileage
  FROM vehicles
  WHERE id = p_vehicle_id;
  
  -- Créer affectation
  INSERT INTO vehicle_assignments (
    vehicle_id,
    user_id,
    assigned_at,
    initial_mileage
  ) VALUES (
    p_vehicle_id,
    p_user_id,
    now(),
    COALESCE(p_initial_mileage, v_current_mileage)
  ) RETURNING id INTO v_assignment_id;
  
  -- Mettre à jour véhicule
  UPDATE vehicles
  SET 
    status = 'in_use',
    assigned_to_user_id = p_user_id,
    updated_at = now()
  WHERE id = p_vehicle_id;
  
  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction retour véhicule
CREATE OR REPLACE FUNCTION return_vehicle(
  p_vehicle_id uuid,
  p_final_mileage integer,
  p_condition_notes text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  -- Trouver affectation active
  SELECT id INTO v_assignment_id
  FROM vehicle_assignments
  WHERE vehicle_id = p_vehicle_id
  AND returned_at IS NULL
  ORDER BY assigned_at DESC
  LIMIT 1;
  
  IF v_assignment_id IS NULL THEN
    RAISE EXCEPTION 'Aucune affectation active pour ce véhicule';
  END IF;
  
  -- Mettre à jour affectation
  UPDATE vehicle_assignments
  SET 
    returned_at = now(),
    final_mileage = p_final_mileage,
    final_condition = p_condition_notes
  WHERE id = v_assignment_id;
  
  -- Mettre à jour véhicule
  UPDATE vehicles
  SET 
    status = 'available',
    assigned_to_user_id = NULL,
    current_mileage = p_final_mileage,
    last_mileage_update = now(),
    updated_at = now()
  WHERE id = p_vehicle_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Fonction planifier entretien
CREATE OR REPLACE FUNCTION schedule_vehicle_maintenance(
  p_vehicle_id uuid,
  p_maintenance_type text,
  p_maintenance_date date,
  p_description text,
  p_estimated_cost decimal DEFAULT 0
)
RETURNS uuid AS $$
DECLARE
  v_maintenance_id uuid;
BEGIN
  INSERT INTO vehicle_maintenance (
    vehicle_id,
    maintenance_type,
    maintenance_date,
    description,
    cost,
    status
  ) VALUES (
    p_vehicle_id,
    p_maintenance_type,
    p_maintenance_date,
    p_description,
    p_estimated_cost,
    'scheduled'
  ) RETURNING id INTO v_maintenance_id;
  
  RETURN v_maintenance_id;
END;
$$ LANGUAGE plpgsql;

-- Vue globale flotte
CREATE OR REPLACE VIEW vehicle_fleet_overview AS
SELECT 
  v.id,
  v.registration_number,
  v.brand,
  v.model,
  v.year,
  v.vehicle_type,
  v.fuel_type,
  v.status,
  v.current_mileage,
  v.insurance_expiry,
  v.technical_control_expiry,
  v.assigned_to_user_id,
  p.full_name as assigned_to_name,
  
  -- Alertes
  CASE 
    WHEN v.insurance_expiry < CURRENT_DATE THEN 'insurance_expired'
    WHEN v.insurance_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'insurance_expiring'
    WHEN v.technical_control_expiry < CURRENT_DATE THEN 'control_expired'
    WHEN v.technical_control_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'control_expiring'
    ELSE 'ok'
  END as alert_status,
  
  -- Stats derniers 30 jours
  (
    SELECT COUNT(*)
    FROM vehicle_trips vt
    WHERE vt.vehicle_id = v.id
    AND vt.start_time > now() - INTERVAL '30 days'
  ) as trips_last_30_days,
  
  (
    SELECT COALESCE(SUM(distance_km), 0)
    FROM vehicle_trips vt
    WHERE vt.vehicle_id = v.id
    AND vt.start_time > now() - INTERVAL '30 days'
  ) as distance_last_30_days,
  
  (
    SELECT COALESCE(SUM(fuel_cost + toll_cost + parking_cost + other_costs), 0)
    FROM vehicle_trips vt
    WHERE vt.vehicle_id = v.id
    AND vt.start_time > now() - INTERVAL '30 days'
  ) as costs_last_30_days,
  
  -- Prochain entretien
  (
    SELECT MIN(maintenance_date)
    FROM vehicle_maintenance vm
    WHERE vm.vehicle_id = v.id
    AND vm.status = 'scheduled'
    AND vm.maintenance_date >= CURRENT_DATE
  ) as next_maintenance_date

FROM vehicles v
LEFT JOIN profiles p ON p.user_id = v.assigned_to_user_id;

-- Vue alertes entretien
CREATE OR REPLACE VIEW vehicle_maintenance_alerts AS
SELECT 
  v.id as vehicle_id,
  v.registration_number,
  v.brand,
  v.model,
  vm.id as maintenance_id,
  vm.maintenance_type,
  vm.maintenance_date,
  vm.description,
  vm.status,
  
  CASE 
    WHEN vm.maintenance_date < CURRENT_DATE THEN 'overdue'
    WHEN vm.maintenance_date < CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
    WHEN vm.maintenance_date < CURRENT_DATE + INTERVAL '30 days' THEN 'upcoming'
    ELSE 'planned'
  END as urgency,
  
  CURRENT_DATE - vm.maintenance_date as days_overdue

FROM vehicle_maintenance vm
JOIN vehicles v ON v.id = vm.vehicle_id
WHERE vm.status IN ('scheduled', 'in_progress')
ORDER BY vm.maintenance_date ASC;

-- Vue coûts par véhicule
CREATE OR REPLACE VIEW vehicle_costs_summary AS
SELECT 
  v.id as vehicle_id,
  v.registration_number,
  v.brand,
  v.model,
  
  -- Coûts entretien
  COALESCE(SUM(vm.cost), 0) as total_maintenance_cost,
  COALESCE(SUM(CASE WHEN vm.maintenance_date > CURRENT_DATE - INTERVAL '1 year' THEN vm.cost ELSE 0 END), 0) as maintenance_cost_1y,
  
  -- Coûts trajets
  COALESCE((
    SELECT SUM(fuel_cost + toll_cost + parking_cost + other_costs)
    FROM vehicle_trips vt
    WHERE vt.vehicle_id = v.id
  ), 0) as total_trip_cost,
  
  COALESCE((
    SELECT SUM(fuel_cost + toll_cost + parking_cost + other_costs)
    FROM vehicle_trips vt
    WHERE vt.vehicle_id = v.id
    AND vt.start_time > CURRENT_DATE - INTERVAL '1 year'
  ), 0) as trip_cost_1y,
  
  -- Stats distance
  COALESCE((
    SELECT SUM(distance_km)
    FROM vehicle_trips vt
    WHERE vt.vehicle_id = v.id
  ), 0) as total_distance_km,
  
  COALESCE((
    SELECT SUM(distance_km)
    FROM vehicle_trips vt
    WHERE vt.vehicle_id = v.id
    AND vt.start_time > CURRENT_DATE - INTERVAL '1 year'
  ), 0) as distance_1y,
  
  -- Coût par km
  CASE 
    WHEN COALESCE((SELECT SUM(distance_km) FROM vehicle_trips WHERE vehicle_id = v.id), 0) > 0
    THEN (
      COALESCE(SUM(vm.cost), 0) + 
      COALESCE((SELECT SUM(fuel_cost + toll_cost + parking_cost + other_costs) FROM vehicle_trips WHERE vehicle_id = v.id), 0)
    ) / (SELECT SUM(distance_km) FROM vehicle_trips WHERE vehicle_id = v.id)
    ELSE 0
  END as cost_per_km

FROM vehicles v
LEFT JOIN vehicle_maintenance vm ON vm.vehicle_id = v.id AND vm.status = 'completed'
GROUP BY v.id, v.registration_number, v.brand, v.model;

-- RLS vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/SAL can manage vehicles"
  ON vehicles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

-- RLS vehicle_maintenance
ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view maintenance"
  ON vehicle_maintenance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/SAL can manage maintenance"
  ON vehicle_maintenance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

-- RLS vehicle_assignments
ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their assignments"
  ON vehicle_assignments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Admin/SAL can manage assignments"
  ON vehicle_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

-- RLS vehicle_trips
ALTER TABLE vehicle_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their trips"
  ON vehicle_trips FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Users can create their trips"
  ON vehicle_trips FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Users can update their trips"
  ON vehicle_trips FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Admin/SAL can delete trips"
  ON vehicle_trips FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );
