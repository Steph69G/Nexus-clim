/*
  # Amélioration Système Devis

  1. Amélioration table quotes existante
  2. Nouvelle table quote_items (lignes de devis)
  3. Functions conversion devis → mission
  4. Security RLS
*/

-- Amélioration table quotes existante
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'items_json') THEN
    ALTER TABLE quotes ADD COLUMN items_json jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'client_email') THEN
    ALTER TABLE quotes ADD COLUMN client_email text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'client_phone') THEN
    ALTER TABLE quotes ADD COLUMN client_phone text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'client_address') THEN
    ALTER TABLE quotes ADD COLUMN client_address text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'subtotal') THEN
    ALTER TABLE quotes ADD COLUMN subtotal decimal(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'tax_amount') THEN
    ALTER TABLE quotes ADD COLUMN tax_amount decimal(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'discount_percent') THEN
    ALTER TABLE quotes ADD COLUMN discount_percent decimal(5,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'discount_amount') THEN
    ALTER TABLE quotes ADD COLUMN discount_amount decimal(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'notes') THEN
    ALTER TABLE quotes ADD COLUMN notes text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'internal_notes') THEN
    ALTER TABLE quotes ADD COLUMN internal_notes text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'pdf_url') THEN
    ALTER TABLE quotes ADD COLUMN pdf_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'sent_at') THEN
    ALTER TABLE quotes ADD COLUMN sent_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'accepted_at') THEN
    ALTER TABLE quotes ADD COLUMN accepted_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'rejected_at') THEN
    ALTER TABLE quotes ADD COLUMN rejected_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'converted_mission_id') THEN
    ALTER TABLE quotes ADD COLUMN converted_mission_id uuid REFERENCES missions(id);
  END IF;
END $$;

-- Table lignes de devis
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('labor', 'parts', 'travel', 'equipment', 'other')),
  description text NOT NULL,
  quantity decimal(10,2) DEFAULT 1,
  unit_price decimal(10,2) DEFAULT 0,
  tax_rate decimal(5,2) DEFAULT 20.0,
  total_ht decimal(10,2) DEFAULT 0,
  total_ttc decimal(10,2) DEFAULT 0,
  stock_item_id uuid REFERENCES stock_items(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_stock ON quote_items(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted ON quotes(converted_mission_id);

-- Trigger calcul totaux ligne devis
CREATE OR REPLACE FUNCTION calculate_quote_item_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_ht := NEW.quantity * NEW.unit_price;
  NEW.total_ttc := NEW.total_ht * (1 + NEW.tax_rate / 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quote_item_calculate_totals ON quote_items;
CREATE TRIGGER quote_item_calculate_totals
  BEFORE INSERT OR UPDATE ON quote_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_item_totals();

-- Trigger calcul totaux devis
CREATE OR REPLACE FUNCTION update_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
  quote_subtotal decimal(10,2);
  quote_tax decimal(10,2);
  quote_total decimal(10,2);
  quote_discount decimal(10,2);
  target_quote_id uuid;
BEGIN
  target_quote_id := COALESCE(NEW.quote_id, OLD.quote_id);
  
  SELECT 
    COALESCE(SUM(total_ht), 0),
    COALESCE(SUM(total_ttc - total_ht), 0),
    COALESCE(SUM(total_ttc), 0)
  INTO quote_subtotal, quote_tax, quote_total
  FROM quote_items
  WHERE quote_id = target_quote_id;
  
  SELECT COALESCE(discount_percent, 0) * quote_subtotal / 100
  INTO quote_discount
  FROM quotes
  WHERE id = target_quote_id;
  
  UPDATE quotes
  SET 
    subtotal = quote_subtotal,
    tax_amount = quote_tax,
    discount_amount = quote_discount,
    total_amount = quote_total - quote_discount
  WHERE id = target_quote_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quote_item_update_totals ON quote_items;
CREATE TRIGGER quote_item_update_totals
  AFTER INSERT OR UPDATE OR DELETE ON quote_items
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_totals();

-- Fonction conversion devis → mission
CREATE OR REPLACE FUNCTION convert_quote_to_mission(
  p_quote_id uuid,
  p_scheduled_start timestamptz DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_mission_id uuid;
  v_quote record;
  v_intervention_type text;
BEGIN
  SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Devis introuvable';
  END IF;
  
  IF v_quote.status != 'accepted' THEN
    RAISE EXCEPTION 'Le devis doit être accepté avant conversion';
  END IF;
  
  IF v_quote.converted_mission_id IS NOT NULL THEN
    RAISE EXCEPTION 'Ce devis a déjà été converti en mission';
  END IF;
  
  SELECT name INTO v_intervention_type
  FROM intervention_types
  WHERE is_active = true
  LIMIT 1;
  
  INSERT INTO missions (
    title,
    type,
    description,
    status,
    client_name,
    client_email,
    client_phone,
    address,
    city,
    zip,
    scheduled_start,
    assigned_to,
    notes
  ) VALUES (
    v_quote.title,
    COALESCE(v_intervention_type, 'Maintenance'),
    v_quote.description,
    'Brouillon',
    v_quote.client_name,
    v_quote.client_email,
    v_quote.client_phone,
    v_quote.client_address,
    '',
    '',
    p_scheduled_start,
    p_assigned_to,
    'Créé depuis devis ' || v_quote.quote_number
  ) RETURNING id INTO v_mission_id;
  
  UPDATE quotes
  SET 
    converted_mission_id = v_mission_id,
    status = 'converted'
  WHERE id = p_quote_id;
  
  RETURN v_mission_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies quote_items
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/SAL can view all quote items"
  ON quote_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

CREATE POLICY "Admin/SAL can manage quote items"
  ON quote_items FOR ALL
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
