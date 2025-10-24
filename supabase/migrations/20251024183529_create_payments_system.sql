/*
  # Create Payments Management System

  ## New Tables
  
  ### `payments`
  Tracks all payments received for invoices
  - `id` (uuid, primary key)
  - `invoice_id` (uuid, references invoices) - Invoice being paid
  - `amount_cents` (integer) - Payment amount in cents
  - `payment_method` (text) - Method: virement, cb, especes, cheque, prelevement
  - `payment_date` (timestamptz) - When payment was received
  - `reference` (text) - Transaction reference/number
  - `status` (text) - pending, completed, failed, refunded
  - `notes` (text) - Additional notes
  - `created_by` (uuid) - User who recorded the payment
  - `created_at`, `updated_at` (timestamptz)

  ### `payment_reminders`
  Tracks payment reminder emails sent to clients
  - `id` (uuid, primary key)
  - `invoice_id` (uuid, references invoices) - Invoice to remind about
  - `reminder_type` (text) - first, second, final, legal
  - `sent_at` (timestamptz) - When reminder was sent
  - `sent_to` (text) - Email address
  - `status` (text) - sent, opened, bounced, failed
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Only authenticated admin/sal users can access
  - Read/write policies for authorized roles
*/

-- Create payment status enum
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create reminder type enum
DO $$ BEGIN
  CREATE TYPE reminder_type AS ENUM ('first', 'second', 'final', 'legal');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create reminder status enum
DO $$ BEGIN
  CREATE TYPE reminder_status AS ENUM ('sent', 'opened', 'bounced', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  payment_method text CHECK (payment_method IN ('virement', 'cb', 'especes', 'cheque', 'prelevement', 'autre')),
  payment_date timestamptz NOT NULL DEFAULT now(),
  reference text,
  
  status payment_status NOT NULL DEFAULT 'completed',
  notes text,
  
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_reminders table
CREATE TABLE IF NOT EXISTS payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  
  reminder_type reminder_type NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_to text NOT NULL,
  
  status reminder_status NOT NULL DEFAULT 'sent',
  notes text,
  
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments

-- Admin and SAL can view all payments
CREATE POLICY "Admin and SAL can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

-- Admin and SAL can insert payments
CREATE POLICY "Admin and SAL can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

-- Admin and SAL can update payments
CREATE POLICY "Admin and SAL can update payments"
  ON payments FOR UPDATE
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

-- Admin can delete payments
CREATE POLICY "Admin can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for payment_reminders

-- Admin and SAL can view all reminders
CREATE POLICY "Admin and SAL can view reminders"
  ON payment_reminders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

-- Admin and SAL can insert reminders
CREATE POLICY "Admin and SAL can insert reminders"
  ON payment_reminders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'sal')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice_id ON payment_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_at ON payment_reminders(sent_at DESC);

-- Create updated_at trigger for payments
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();
