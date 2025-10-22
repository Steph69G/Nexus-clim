/*
  # Amélioration Système Facturation avec Items & Stock

  1. Tables Nouvelles
    - invoice_items (lignes facture détaillées avec lien stock)
    - invoice_payments (suivi paiements)
    - invoice_templates (templates PDF)

  2. Amélioration invoices
    - Ajout colonnes manquantes pour cohérence

  3. Functions
    - Génération facture depuis mission
    - Calculs automatiques

  4. Security RLS
*/

-- Amélioration table invoices existante (ajouter colonnes si manquantes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'subtotal') THEN
    ALTER TABLE invoices ADD COLUMN subtotal decimal(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'tax_amount') THEN
    ALTER TABLE invoices ADD COLUMN tax_amount decimal(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'paid_amount') THEN
    ALTER TABLE invoices ADD COLUMN paid_amount decimal(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'balance_due') THEN
    ALTER TABLE invoices ADD COLUMN balance_due decimal(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_terms') THEN
    ALTER TABLE invoices ADD COLUMN payment_terms text DEFAULT '30 jours';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'last_reminder_sent') THEN
    ALTER TABLE invoices ADD COLUMN last_reminder_sent timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'status') THEN
    ALTER TABLE invoices ADD COLUMN status text DEFAULT 'draft';
  END IF;
END $$;

-- Table lignes de facture détaillées
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('labor', 'parts', 'travel', 'other', 'discount')),
  description text NOT NULL,
  quantity decimal(10,2) DEFAULT 1,
  unit_price decimal(10,2) DEFAULT 0,
  tax_rate decimal(5,2) DEFAULT 20.0,
  total_ht decimal(10,2) DEFAULT 0,
  total_ttc decimal(10,2) DEFAULT 0,
  mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  stock_item_id uuid REFERENCES stock_items(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Table paiements facture
CREATE TABLE IF NOT EXISTS invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'check', 'card', 'transfer', 'sepa', 'other')),
  payment_date date DEFAULT CURRENT_DATE,
  reference text,
  notes text,
  created_by uuid REFERENCES profiles(user_id),
  created_at timestamptz DEFAULT now()
);

-- Table templates PDF
CREATE TABLE IF NOT EXISTS invoice_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  html_template text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_mission ON invoice_items(mission_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_stock ON invoice_items(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);

-- Trigger calcul totaux ligne facture
CREATE OR REPLACE FUNCTION calculate_invoice_item_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_ht := NEW.quantity * NEW.unit_price;
  NEW.total_ttc := NEW.total_ht * (1 + NEW.tax_rate / 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_item_calculate_totals ON invoice_items;
CREATE TRIGGER invoice_item_calculate_totals
  BEFORE INSERT OR UPDATE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_item_totals();

-- Trigger calcul totaux facture
CREATE OR REPLACE FUNCTION update_invoice_totals_from_items()
RETURNS TRIGGER AS $$
DECLARE
  invoice_subtotal decimal(10,2);
  invoice_tax decimal(10,2);
  invoice_total decimal(10,2);
  invoice_paid decimal(10,2);
  target_invoice_id uuid;
BEGIN
  target_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  SELECT 
    COALESCE(SUM(total_ht), 0),
    COALESCE(SUM(total_ttc - total_ht), 0),
    COALESCE(SUM(total_ttc), 0)
  INTO invoice_subtotal, invoice_tax, invoice_total
  FROM invoice_items
  WHERE invoice_id = target_invoice_id;
  
  SELECT COALESCE(SUM(amount), 0)
  INTO invoice_paid
  FROM invoice_payments
  WHERE invoice_id = target_invoice_id;
  
  UPDATE invoices
  SET 
    subtotal = invoice_subtotal,
    tax_amount = invoice_tax,
    total_cents = (invoice_total * 100)::integer,
    paid_amount = invoice_paid,
    balance_due = invoice_total - invoice_paid,
    status = CASE 
      WHEN invoice_paid >= invoice_total THEN 'paid'
      WHEN invoice_paid > 0 THEN 'partial'
      ELSE COALESCE(status, 'draft')
    END,
    payment_status = CASE 
      WHEN invoice_paid >= invoice_total THEN 'payée'
      WHEN invoice_paid > 0 THEN 'en_attente'
      ELSE payment_status
    END
  WHERE id = target_invoice_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_item_update_totals ON invoice_items;
CREATE TRIGGER invoice_item_update_totals
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals_from_items();

DROP TRIGGER IF EXISTS invoice_payment_update_totals ON invoice_payments;
CREATE TRIGGER invoice_payment_update_totals
  AFTER INSERT OR UPDATE OR DELETE ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals_from_items();

-- Fonction génération facture depuis mission
CREATE OR REPLACE FUNCTION generate_invoice_from_mission_with_stock(
  p_mission_id uuid,
  p_include_labor boolean DEFAULT true,
  p_labor_hours decimal DEFAULT 0,
  p_hourly_rate decimal DEFAULT 45.0,
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS uuid AS $$
DECLARE
  v_invoice_id uuid;
  v_invoice_number text;
  v_mission record;
BEGIN
  SELECT * INTO v_mission FROM missions WHERE id = p_mission_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission introuvable';
  END IF;
  
  v_invoice_number := generate_invoice_number();
  
  INSERT INTO invoices (
    invoice_number,
    mission_id,
    client_name,
    client_email,
    client_phone,
    client_address,
    client_city,
    client_zip,
    due_date,
    payment_status,
    payment_terms,
    status,
    created_by_user_id
  ) VALUES (
    v_invoice_number,
    p_mission_id,
    v_mission.client_name,
    COALESCE(v_mission.client_email, 'no-email@example.com'),
    COALESCE(v_mission.client_phone, ''),
    COALESCE(v_mission.address, ''),
    COALESCE(v_mission.city, ''),
    COALESCE(v_mission.zip, ''),
    CURRENT_DATE + INTERVAL '30 days',
    'en_attente',
    '30 jours',
    'draft',
    p_created_by
  ) RETURNING id INTO v_invoice_id;
  
  IF p_include_labor AND p_labor_hours > 0 THEN
    INSERT INTO invoice_items (
      invoice_id,
      item_type,
      description,
      quantity,
      unit_price,
      mission_id
    ) VALUES (
      v_invoice_id,
      'labor',
      'Main d''œuvre - ' || v_mission.title,
      p_labor_hours,
      p_hourly_rate,
      p_mission_id
    );
  END IF;
  
  INSERT INTO invoice_items (
    invoice_id,
    item_type,
    description,
    quantity,
    unit_price,
    mission_id,
    stock_item_id
  )
  SELECT 
    v_invoice_id,
    'parts',
    si.name || ' (Réf: ' || si.reference || ')',
    sm.quantity,
    sm.unit_cost,
    sm.mission_id,
    sm.item_id
  FROM stock_movements sm
  JOIN stock_items si ON si.id = sm.item_id
  WHERE sm.mission_id = p_mission_id
  AND sm.movement_type = 'mission';
  
  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Template HTML par défaut
INSERT INTO invoice_templates (name, description, html_template, is_default) VALUES (
  'Standard',
  'Template facture standard Nexus Clim',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Facture</title></head><body><h1>Facture {{invoice_number}}</h1></body></html>',
  true
) ON CONFLICT (name) DO NOTHING;

-- RLS Policies invoice_items
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/SAL can view all invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Admin/SAL can manage invoice items"
  ON invoice_items FOR ALL
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

-- RLS Policies invoice_payments
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/SAL can view all payments"
  ON invoice_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Admin/SAL can manage payments"
  ON invoice_payments FOR ALL
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

-- RLS Policies invoice_templates
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view templates"
  ON invoice_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage templates"
  ON invoice_templates FOR ALL
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
