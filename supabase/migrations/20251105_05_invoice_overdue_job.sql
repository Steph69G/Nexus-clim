/*
  # Invoice Overdue Job - Daily Sweep

  1. New Function
    - `invoice_overdue_sweep()` - Daily batch processor
    - Checks overdue invoices not paid
    - Creates notifications to customers
    - Updates invoice status to 'overdue'
    - Idempotent: only notifies once per 24h

  2. Scheduled Job
    - pg_cron scheduled daily at 07:15 UTC
    - Processes all overdue unpaid invoices

  3. Benefits
    - Automatic payment reminders
    - Reduces manual follow-up work
    - Customer retention via timely reminders
*/

-- Index performance pour due_date
CREATE INDEX IF NOT EXISTS idx_invoices_due_date
ON public.invoices(due_date)
WHERE paid_at IS NULL;

-- Ajouter colonne de tracking si pas existante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'last_overdue_notified_at'
  ) THEN
    ALTER TABLE public.invoices
    ADD COLUMN last_overdue_notified_at timestamptz;
  END IF;
END $$;

-- Fonction de sweep quotidienne
CREATE OR REPLACE FUNCTION public.invoice_overdue_sweep()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  v_cnt int := 0;
  v_dedup text;
BEGIN
  -- Sélectionne les factures échues non payées, pas déjà notifiées dans les dernières 24h
  FOR r IN
    SELECT
      i.id,
      i.client_id as customer_user_id,
      i.due_date,
      i.payment_status as status,
      i.total_amount,
      i.paid_at,
      i.last_overdue_notified_at
    FROM public.invoices i
    WHERE i.due_date < now()
      AND i.payment_status IS DISTINCT FROM 'paid'
      AND i.paid_at IS NULL
      AND (i.last_overdue_notified_at IS NULL OR i.last_overdue_notified_at < now() - interval '24 hours')
    LIMIT 100
  LOOP
    -- Clé d'idempotence journalière par facture
    v_dedup := format('invoice_overdue:%s:%s', r.id, to_char(now()::date, 'YYYY-MM-DD'));

    -- Crée la notification (in-app + email)
    BEGIN
      PERFORM public.create_notification_secure(
        r.customer_user_id,
        'invoice_overdue',
        'Facture en retard',
        'Votre facture est arrivée à échéance. Merci de procéder au règlement.',
        ARRAY['in_app', 'email']::text[],
        'high',
        NULL,
        NULL,
        r.id,
        NULL,
        '/client/invoices/' || r.id,
        'Voir la facture',
        jsonb_build_object(
          'invoice_id', r.id,
          'due_date', r.due_date,
          'total_amount', r.total_amount
        ),
        v_dedup
      );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;

    -- Marque la facture + horodate de notif
    UPDATE public.invoices
    SET payment_status = CASE
        WHEN payment_status != 'paid' THEN 'overdue'
        ELSE payment_status
      END,
        last_overdue_notified_at = now()
    WHERE id = r.id;

    v_cnt := v_cnt + 1;
  END LOOP;

  RETURN v_cnt;
END;
$$;

COMMENT ON FUNCTION public.invoice_overdue_sweep IS
'Daily job: notifies customers of overdue invoices and updates status';

-- Planifier via pg_cron
-- Exécution chaque jour à 07:15 UTC (ajuster selon timezone)
DO $$
BEGIN
  -- Vérifier si pg_cron est disponible
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'invoice_overdue_daily',
      '15 7 * * *',
      $$SELECT public.invoice_overdue_sweep();$$
    );
  ELSE
    RAISE NOTICE 'pg_cron extension not found. Schedule manually or use Supabase Scheduled Functions.';
  END IF;
END $$;
