/*
  # Phase 18 - Go-Live Hardening: Business Integrity

  1. Invoice Protection
    - Unique sequential invoice numbers
    - Lock invoices once sent/paid
    - PDF integrity hash
    - Mandatory legal mentions validation

  2. Stock Integrity
    - Prevent negative stock
    - Control views for monitoring
    - Alert triggers

  3. Mission Transitions
    - Valid state machine enforcement
    - Transition logging

  4. Timesheet Locking
    - Lock approved timesheets
    - Prevent modification if invoiced

  5. Credit Notes (Avoirs)
    - Must reference original invoice
    - Total cannot exceed original

  6. Observability
    - app_events table for critical business events
*/

-- ============================================================================
-- 1. INVOICE PROTECTION
-- ============================================================================

-- Add integrity fields to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_sha256 TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS legal_mentions_validated BOOLEAN DEFAULT false;

-- Unique sequential invoice numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number_unique
  ON invoices(invoice_number)
  WHERE invoice_number IS NOT NULL;

-- Function to guard invoice updates once sent/paid
CREATE OR REPLACE FUNCTION guard_invoice_updates()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('sent', 'paid') AND (ROW(OLD) IS DISTINCT FROM ROW(NEW)) THEN
    IF OLD.status = NEW.status AND
       OLD.payment_status = NEW.payment_status AND
       OLD.pdf_sha256 IS NULL AND NEW.pdf_sha256 IS NOT NULL THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invoice % is locked (status: %). Only PDF hash can be set.',
      OLD.invoice_number, OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_invoice_updates ON invoices;
CREATE TRIGGER trg_guard_invoice_updates
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION guard_invoice_updates();

-- ============================================================================
-- 2. STOCK INTEGRITY
-- ============================================================================

-- Control view for negative stock (should never happen)
CREATE OR REPLACE VIEW stock_negative AS
SELECT
  si.id,
  si.name,
  si.reference,
  si.quantity as current_qty,
  si.min_stock,
  si.location,
  si.updated_at
FROM stock_items si
WHERE si.quantity < 0;

-- Control view for low stock
CREATE OR REPLACE VIEW stock_low AS
SELECT
  si.id,
  si.name,
  si.reference,
  si.quantity as current_qty,
  si.min_stock,
  si.location,
  si.updated_at,
  (si.min_stock - si.quantity) as shortage
FROM stock_items si
WHERE si.quantity < si.min_stock;

-- Function to prevent negative stock on movements
CREATE OR REPLACE FUNCTION check_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  current_qty INTEGER;
BEGIN
  IF NEW.type = 'out' THEN
    SELECT quantity INTO current_qty
    FROM stock_items
    WHERE id = NEW.item_id;

    IF current_qty IS NULL THEN
      RAISE EXCEPTION 'Stock item % not found', NEW.item_id;
    END IF;

    IF current_qty < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for item %. Available: %, Requested: %',
        NEW.item_id, current_qty, NEW.quantity;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_stock_movement ON stock_movements;
CREATE TRIGGER trg_check_stock_movement
  BEFORE INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION check_stock_movement();

-- ============================================================================
-- 3. MISSION TRANSITIONS
-- ============================================================================

-- Valid mission status transitions
CREATE TABLE IF NOT EXISTS mission_valid_transitions (
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  required_role TEXT,
  notes TEXT,
  PRIMARY KEY (from_status, to_status)
);

-- Seed valid transitions
INSERT INTO mission_valid_transitions (from_status, to_status, required_role, notes)
VALUES
  ('Nouveau', 'Publiée', 'admin', 'Admin publishes mission'),
  ('Publiée', 'Assignée', NULL, 'Tech accepts mission'),
  ('Assignée', 'En cours', NULL, 'Tech starts work'),
  ('Assignée', 'Publiée', 'admin', 'Tech cancels, back to pool'),
  ('En cours', 'Bloqué', NULL, 'Tech flags issue'),
  ('En cours', 'Terminé', NULL, 'Tech completes work'),
  ('Bloqué', 'En cours', NULL, 'Issue resolved'),
  ('Bloqué', 'Annulée', 'admin', 'Admin cancels'),
  ('Terminé', 'Facturée', 'admin', 'Admin generates invoice'),
  ('Facturée', 'Payée', 'admin', 'Payment received')
ON CONFLICT (from_status, to_status) DO NOTHING;

-- Function to validate mission transitions
CREATE OR REPLACE FUNCTION validate_mission_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM mission_valid_transitions
      WHERE from_status = OLD.status
        AND to_status = NEW.status
    ) THEN
      RAISE EXCEPTION 'Invalid mission transition: % → %. Allowed transitions are defined in mission_valid_transitions table.',
        OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_mission_transition ON missions;
CREATE TRIGGER trg_validate_mission_transition
  BEFORE UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION validate_mission_transition();

-- ============================================================================
-- 4. TIMESHEET LOCKING
-- ============================================================================

-- Add approved fields to timesheets
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS invoiced BOOLEAN DEFAULT false;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id);

-- Function to lock approved/invoiced timesheets
CREATE OR REPLACE FUNCTION guard_timesheet_updates()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.approved_by IS NOT NULL AND (ROW(OLD) IS DISTINCT FROM ROW(NEW)) THEN
    RAISE EXCEPTION 'Timesheet % is approved and locked. Contact admin to unlock.', OLD.id;
  END IF;

  IF OLD.invoiced = true AND (ROW(OLD) IS DISTINCT FROM ROW(NEW)) THEN
    RAISE EXCEPTION 'Timesheet % is invoiced and cannot be modified.', OLD.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_timesheet_updates ON timesheets;
CREATE TRIGGER trg_guard_timesheet_updates
  BEFORE UPDATE ON timesheets
  FOR EACH ROW
  EXECUTE FUNCTION guard_timesheet_updates();

-- ============================================================================
-- 5. CREDIT NOTES (AVOIRS)
-- ============================================================================

-- Add credit note fields
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_credit_note BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_invoice_id UUID REFERENCES invoices(id);

-- Function to validate credit notes
CREATE OR REPLACE FUNCTION validate_credit_note()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  original_total INTEGER;
BEGIN
  IF NEW.is_credit_note = true THEN
    IF NEW.original_invoice_id IS NULL THEN
      RAISE EXCEPTION 'Credit note must reference an original invoice';
    END IF;

    SELECT total_cents INTO original_total
    FROM invoices
    WHERE id = NEW.original_invoice_id;

    IF original_total IS NULL THEN
      RAISE EXCEPTION 'Original invoice % not found', NEW.original_invoice_id;
    END IF;

    IF ABS(NEW.total_cents) > original_total THEN
      RAISE EXCEPTION 'Credit note amount (%) cannot exceed original invoice amount (%)',
        NEW.total_cents, original_total;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_credit_note ON invoices;
CREATE TRIGGER trg_validate_credit_note
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION validate_credit_note();

-- ============================================================================
-- 6. OBSERVABILITY - APP EVENTS
-- ============================================================================

-- Critical business events logging
CREATE TABLE IF NOT EXISTS app_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  user_id UUID REFERENCES profiles(id),
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_events_type ON app_events(event_type);
CREATE INDEX IF NOT EXISTS idx_app_events_severity ON app_events(severity);
CREATE INDEX IF NOT EXISTS idx_app_events_created ON app_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_user ON app_events(user_id);

-- Enable RLS
ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

-- Policy: admin can see all events
CREATE POLICY "Admins can view all events"
  ON app_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Policy: users can see their own events
CREATE POLICY "Users can view own events"
  ON app_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to log events (callable from triggers or edge functions)
CREATE OR REPLACE FUNCTION log_app_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_user_id UUID DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO app_events (
    event_type,
    severity,
    user_id,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    p_event_type,
    p_severity,
    p_user_id,
    p_resource_type,
    p_resource_id,
    p_metadata
  ) RETURNING id INTO event_id;

  RETURN event_id;
END;
$$;

-- Auto-log critical events
CREATE OR REPLACE FUNCTION log_invoice_sent()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    PERFORM log_app_event(
      'invoice_sent',
      'info',
      NEW.created_by,
      'invoice',
      NEW.id,
      jsonb_build_object(
        'invoice_number', NEW.invoice_number,
        'total', NEW.total_cents,
        'client_id', NEW.client_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_invoice_sent ON invoices;
CREATE TRIGGER trg_log_invoice_sent
  AFTER INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_invoice_sent();

-- Log emergency requests
CREATE OR REPLACE FUNCTION log_emergency_created()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM log_app_event(
    'emergency_created',
    'warning',
    NEW.client_id,
    'emergency_request',
    NEW.id,
    jsonb_build_object(
      'urgency', NEW.urgency_level,
      'description', LEFT(NEW.description, 100)
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_emergency_created ON emergency_requests;
CREATE TRIGGER trg_log_emergency_created
  AFTER INSERT ON emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_emergency_created();

-- Log stock alerts
CREATE OR REPLACE FUNCTION log_stock_low()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quantity < NEW.min_stock AND (OLD.quantity IS NULL OR OLD.quantity >= OLD.min_stock) THEN
    PERFORM log_app_event(
      'stock_low',
      'warning',
      NULL,
      'stock_item',
      NEW.id,
      jsonb_build_object(
        'item_name', NEW.name,
        'quantity', NEW.quantity,
        'min_stock', NEW.min_stock
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_stock_low ON stock_items;
CREATE TRIGGER trg_log_stock_low
  AFTER INSERT OR UPDATE ON stock_items
  FOR EACH ROW
  EXECUTE FUNCTION log_stock_low();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE app_events IS 'Critical business events log for observability and audit';
COMMENT ON VIEW stock_negative IS 'Alert view: should always be empty. Negative stock indicates a bug.';
COMMENT ON VIEW stock_low IS 'Items below minimum stock threshold requiring reorder';
COMMENT ON TABLE mission_valid_transitions IS 'Allowed state transitions for missions (state machine)';
COMMENT ON FUNCTION guard_invoice_updates IS 'Prevents modification of sent/paid invoices';
COMMENT ON FUNCTION check_stock_movement IS 'Prevents stock movements that would result in negative inventory';
COMMENT ON FUNCTION validate_mission_transition IS 'Enforces valid mission status transitions only';
COMMENT ON FUNCTION guard_timesheet_updates IS 'Locks approved and invoiced timesheets';
