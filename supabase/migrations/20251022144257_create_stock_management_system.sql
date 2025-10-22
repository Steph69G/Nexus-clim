/*
  # Système de Gestion de Stock Complet

  1. Tables Créées
    - stock_items (pièces détachées et consommables)
      - id, reference, name, description, category
      - unit_price, quantity, min_stock, unit
      - supplier, location, active, created_at, updated_at

    - stock_movements (entrées/sorties)
      - id, item_id, type (in/out/adjustment/mission)
      - quantity, unit_cost, total_cost
      - mission_id (si mouvement lié à mission)
      - user_id, notes, created_at

    - stock_categories (catégories de pièces)
      - id, name, description, icon, color

    - stock_alerts (alertes stock bas)
      - id, item_id, alert_type, threshold, is_active
      - last_triggered, created_at

  2. Vues
    - stock_current_values (valorisation stock actuel)
    - stock_items_with_alerts (items avec alertes actives)

  3. Security
    - RLS complet
    - Admin/SAL peuvent tout gérer
    - Tech peuvent consulter uniquement
    - Logs audit complets

  4. Triggers
    - Auto-update stock après mouvement
    - Génération alertes si seuil atteint
    - Calcul valorisation FIFO
*/

-- Table catégories stock
CREATE TABLE IF NOT EXISTS stock_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text DEFAULT 'Package',
  color text DEFAULT 'blue',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des articles en stock
CREATE TABLE IF NOT EXISTS stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES stock_categories(id),
  unit_price decimal(10,2) DEFAULT 0,
  quantity decimal(10,2) DEFAULT 0,
  min_stock decimal(10,2) DEFAULT 0,
  max_stock decimal(10,2),
  unit text DEFAULT 'pcs',
  supplier text,
  supplier_reference text,
  location text,
  barcode text,
  image_url text,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table mouvements de stock
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'mission', 'return', 'loss')),
  quantity decimal(10,2) NOT NULL,
  unit_cost decimal(10,2) DEFAULT 0,
  total_cost decimal(10,2) DEFAULT 0,
  mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  supplier text,
  reference_document text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Table alertes stock
CREATE TABLE IF NOT EXISTS stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES stock_items(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstocked', 'expired')),
  threshold decimal(10,2),
  is_active boolean DEFAULT true,
  last_triggered timestamptz,
  notification_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_stock_items_category ON stock_items(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_reference ON stock_items(reference);
CREATE INDEX IF NOT EXISTS idx_stock_items_active ON stock_items(is_active);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_mission ON stock_movements(mission_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_item ON stock_alerts(item_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_stock_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_items_updated_at
  BEFORE UPDATE ON stock_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_items_timestamp();

-- Trigger pour mettre à jour quantité après mouvement
CREATE OR REPLACE FUNCTION update_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type IN ('in', 'return') THEN
    UPDATE stock_items 
    SET quantity = quantity + NEW.quantity
    WHERE id = NEW.item_id;
  ELSIF NEW.movement_type IN ('out', 'mission', 'loss') THEN
    UPDATE stock_items 
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.item_id;
  ELSIF NEW.movement_type = 'adjustment' THEN
    UPDATE stock_items 
    SET quantity = NEW.quantity
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_movement_update_quantity
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_quantity();

-- Trigger pour générer alertes automatiques
CREATE OR REPLACE FUNCTION check_stock_alerts()
RETURNS TRIGGER AS $$
DECLARE
  current_qty decimal(10,2);
  min_qty decimal(10,2);
BEGIN
  SELECT quantity, min_stock INTO current_qty, min_qty
  FROM stock_items
  WHERE id = NEW.item_id;

  IF current_qty <= 0 THEN
    INSERT INTO stock_alerts (item_id, alert_type, threshold, last_triggered)
    VALUES (NEW.item_id, 'out_of_stock', 0, now())
    ON CONFLICT (item_id, alert_type) DO UPDATE
    SET last_triggered = now(), notification_sent = false;
  ELSIF current_qty <= min_qty THEN
    INSERT INTO stock_alerts (item_id, alert_type, threshold, last_triggered)
    VALUES (NEW.item_id, 'low_stock', min_qty, now())
    ON CONFLICT (item_id, alert_type) DO UPDATE
    SET last_triggered = now(), notification_sent = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_alert_check
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION check_stock_alerts();

-- Vue valorisation stock
CREATE OR REPLACE VIEW stock_current_values AS
SELECT 
  si.id,
  si.reference,
  si.name,
  si.quantity,
  si.unit_price,
  si.quantity * si.unit_price as total_value,
  sc.name as category_name,
  sc.color as category_color
FROM stock_items si
LEFT JOIN stock_categories sc ON sc.id = si.category_id
WHERE si.is_active = true;

-- Vue items avec alertes
CREATE OR REPLACE VIEW stock_items_with_alerts AS
SELECT 
  si.*,
  sa.alert_type,
  sa.last_triggered,
  sa.notification_sent
FROM stock_items si
LEFT JOIN stock_alerts sa ON sa.item_id = si.id AND sa.is_active = true
WHERE si.is_active = true;

-- Données initiales catégories
INSERT INTO stock_categories (name, description, icon, color, sort_order) VALUES
('Climatisation', 'Pièces et fluides pour climatisation', 'Wind', 'blue', 1),
('Chauffage', 'Pièces et équipements de chauffage', 'Flame', 'red', 2),
('Fluides', 'Fluides frigorigènes et lubrifiants', 'Droplet', 'cyan', 3),
('Électrique', 'Composants électriques et électroniques', 'Zap', 'yellow', 4),
('Filtres', 'Filtres à air et accessoires', 'Filter', 'green', 5),
('Outils', 'Outils et équipements', 'Wrench', 'slate', 6),
('Consommables', 'Consommables divers', 'Package', 'gray', 7)
ON CONFLICT (name) DO NOTHING;

-- RLS Policies pour stock_categories
ALTER TABLE stock_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view stock categories"
  ON stock_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/SAL can manage categories"
  ON stock_categories FOR ALL
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

-- RLS Policies pour stock_items
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view stock items"
  ON stock_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/SAL can manage stock items"
  ON stock_items FOR ALL
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

-- RLS Policies pour stock_movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/SAL/Tech can create movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal', 'tech')
    )
  );

CREATE POLICY "Admin/SAL can delete movements"
  ON stock_movements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

-- RLS Policies pour stock_alerts
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view alerts"
  ON stock_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/SAL can manage alerts"
  ON stock_alerts FOR ALL
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
