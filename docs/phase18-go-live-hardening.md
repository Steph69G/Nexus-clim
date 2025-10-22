# Phase 18 — Go-Live Hardening

Comprehensive production readiness checklist and implementation guide.

## ✅ Implemented

### 1. Business Integrity Constraints

#### Invoice Protection
- ✅ **Unique sequential invoice numbers** via `UNIQUE INDEX`
- ✅ **Immutable once sent/paid** via `guard_invoice_updates()` trigger
- ✅ **PDF integrity hash** with `pdf_sha256` column
- ✅ **Legal mentions validation** flag

**Example:**
```sql
-- Invoice is locked once sent
UPDATE invoices SET total_cents = 50000 WHERE id = '...';
-- ERROR: Invoice INV-2024-001 is locked (status: sent)
```

#### Stock Integrity
- ✅ **Prevent negative stock** via `check_stock_movement()` trigger
- ✅ **Control views** for monitoring:
  - `stock_negative` → Should always be empty (alerts bug)
  - `stock_low` → Items below min_stock threshold

**Example:**
```sql
-- Attempt to take more stock than available
INSERT INTO stock_movements (item_id, type, quantity) VALUES (..., 'out', 100);
-- ERROR: Insufficient stock. Available: 50, Requested: 100
```

#### Mission State Machine
- ✅ **Valid transitions only** via `mission_valid_transitions` table
- ✅ **Enforced by trigger** `validate_mission_transition()`

**Allowed transitions:**
```
Nouveau → Publiée (admin)
Publiée → Assignée (tech accepts)
Assignée → En cours (tech starts)
En cours → Bloqué (issue)
En cours → Terminé (completed)
Bloqué → En cours (resolved)
Terminé → Facturée (admin)
```

**Example:**
```sql
-- Invalid jump from Nouveau to Terminé
UPDATE missions SET status = 'Terminé' WHERE status = 'Nouveau';
-- ERROR: Invalid transition: Nouveau → Terminé
```

#### Timesheet Locking
- ✅ **Lock approved timesheets** via `guard_timesheet_updates()`
- ✅ **Lock invoiced timesheets** (cannot modify if `invoiced = true`)
- ✅ Added columns: `approved_by`, `approved_at`, `invoiced`, `invoice_id`

**Example:**
```sql
-- Timesheet approved by manager
UPDATE timesheets SET hours_worked = 10 WHERE approved_by IS NOT NULL;
-- ERROR: Timesheet ... is approved and locked
```

#### Credit Notes (Avoirs)
- ✅ **Must reference original invoice** via `validate_credit_note()`
- ✅ **Amount cannot exceed original** (validation check)
- ✅ Added columns: `is_credit_note`, `original_invoice_id`

---

### 2. Observability & Monitoring

#### App Events Log
- ✅ **Critical business events table** with severity levels
- ✅ **Auto-logging triggers** for:
  - `invoice_sent` → Invoice published
  - `emergency_created` → Urgent request
  - `stock_low` → Inventory alert
- ✅ **Helper function** `log_app_event()` for custom logging

**Query events:**
```sql
-- Recent critical events
SELECT * FROM app_events
WHERE severity = 'critical'
ORDER BY created_at DESC
LIMIT 10;
```

#### Alert System
- ✅ **Alert configuration table** with thresholds
- ✅ **Automated alert views:**
  - `alert_emergencies_pending` → Urgencies > 5min
  - `alert_invoices_overdue` → Overdue 7d, 30d
  - `alert_stock_critical` → Stock ≤ 0 or < 50% min
  - `alert_missions_blocked` → Blocked > 60min
  - `alert_timesheets_unapproved` → Pending > 7 days

**Alert configuration:**
```sql
SELECT * FROM alert_config;
```

| alert_type | threshold_value | threshold_unit | severity | notify_roles |
|------------|----------------|----------------|----------|--------------|
| emergency_pending | 5 | minutes | critical | {admin,sal} |
| invoice_overdue_7days | 7 | days | warning | {admin} |
| invoice_overdue_30days | 30 | days | critical | {admin} |
| stock_critical | 0 | units | warning | {admin,sal} |

**Run alert checks manually:**
```sql
SELECT * FROM run_all_alert_checks();
```

#### Alert Notifications
- ✅ **Auto-create notifications** for alert conditions
- ✅ **Role-based targeting** (notify admins, sal, etc.)
- ✅ **Functions:**
  - `create_alert_notification()` → Generic alert creator
  - `check_emergency_alerts()` → Check urgent requests
  - `check_invoice_alerts()` → Check overdue payments
  - `check_stock_alerts()` → Check inventory
  - `run_all_alert_checks()` → Master scheduler

**Schedule with pg_cron (recommended):**
```sql
-- Run every 5 minutes
SELECT cron.schedule('check-emergencies', '*/5 * * * *', 'SELECT check_emergency_alerts()');

-- Run daily at 9am
SELECT cron.schedule('check-invoices', '0 9 * * *', 'SELECT check_invoice_alerts()');
SELECT cron.schedule('check-stock', '0 9 * * *', 'SELECT check_stock_alerts()');
```

---

### 3. Security & RLS Audit

#### RLS Testing Functions
- ✅ **Test RLS by role** via `test_rls_as_role()`
- ✅ **Audit views:**
  - `rls_enabled_check` → Verify all critical tables have RLS
  - `rls_policy_coverage` → Ensure tables have policies

**Check RLS status:**
```sql
-- All critical tables should show "✓ Enabled"
SELECT * FROM rls_enabled_check;

-- All should have policies
SELECT * FROM rls_policy_coverage;
```

**Critical tables monitored:**
- missions
- invoices
- quotes
- stock_items
- stock_movements
- timesheets
- notifications
- client_requests
- emergency_requests
- profiles
- maintenance_contracts

---

## 🔄 TODO: Implementation Remaining

### 4. Backup & Rollback Plan

#### Daily Backups
```bash
# Setup daily backup (run from CI/CD or cron)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

#### Rollback Script
Create `down.sql` for each migration to reverse changes if needed.

#### Seed Data
```sql
-- Create minimal test dataset
-- 1 client, 1 tech, 1 mission, 3 stock items
```

---

### 5. Performance & Caching

#### Image Optimization
- Compress uploads < 1MB
- Auto-purge old photos (configurable retention)

#### PWA Cache Strategy
```typescript
// Precache critical routes
workbox.precaching.precacheAndRoute([
  '/tech/missions',
  '/admin',
  '/calendar',
]);

// Background sync for offline actions
workbox.backgroundSync.registerRoute(
  /\/api\/(photos|timesheets)/,
  new workbox.strategies.NetworkOnly({
    plugins: [new workbox.backgroundSync.BackgroundSyncPlugin('api-queue')],
  })
);
```

#### Bundle Size
- Current: ~410 KB gzipped
- Target: < 400 KB (lazy load maps, calendar)

---

### 6. Payment & Accounting

#### Reconciliation
```sql
-- Daily payment reconciliation task
CREATE FUNCTION reconcile_payments() ...
```

#### Exports
- CSV/Journal for accounting software
- Plan comptable français
- Journal VENTE/AVOIR numbering

#### Email Validation
- SPF/DKIM/DMARC for domain

---

### 7. UX Polish

#### Status Banners
```typescript
<Banner type="offline">Mode hors ligne - les modifications seront synchronisées</Banner>
<Banner type="update">Nouvelle version disponible</Banner>
```

#### Global Search (Ctrl+K)
```typescript
<CommandPalette
  items={[missions, clients, invoices, quotes]}
  onSelect={(item) => navigate(item.url)}
/>
```

#### Accessibility
- Focus visible on all interactive elements
- ARIA labels on forms
- Contrast ratios ≥ 4.5:1

---

## 📊 J+14 Monitoring Plan

### J+1: Triage
- [ ] Check Sentry for errors
- [ ] Review 4xx/5xx rates
- [ ] Audit emergencies > threshold

### J+3: Validation
- [ ] Sample 5 random invoices
- [ ] Verify mission → invoice accuracy
- [ ] Check stock movements

### J+7: Pipeline
- [ ] NPS email delivery rate
- [ ] Survey response rate
- [ ] Adjust templates if needed

### J+14: Optimization
- [ ] Top 10 actions from Accueil
- [ ] Identify unused features
- [ ] User feedback review

---

## 🔐 Critical Queries for Production

### Daily Health Checks

```sql
-- Check for any negative stock (CRITICAL)
SELECT * FROM stock_negative;
-- Should be EMPTY

-- Check pending emergencies
SELECT * FROM alert_emergencies_pending;

-- Check locked invoices integrity
SELECT COUNT(*) FROM invoices
WHERE status IN ('sent', 'paid') AND pdf_sha256 IS NULL;
-- Should be 0

-- Check RLS coverage
SELECT * FROM rls_policy_coverage
WHERE status LIKE '%NO POLICIES%';
-- Should be EMPTY
```

### Weekly Audits

```sql
-- Check invalid mission states (should not exist)
SELECT m.id, m.status, m.updated_at
FROM missions m
LEFT JOIN mission_valid_transitions mvt
  ON mvt.to_status = m.status
WHERE mvt.to_status IS NULL;

-- Check unapproved timesheets > 30 days
SELECT * FROM timesheets
WHERE approved_by IS NULL
  AND created_at < now() - INTERVAL '30 days';

-- Check credit notes validity
SELECT * FROM invoices
WHERE is_credit_note = true
  AND (original_invoice_id IS NULL
    OR ABS(total_cents) > (
      SELECT total_cents FROM invoices orig
      WHERE orig.id = original_invoice_id
    ));
```

---

## 🚀 Deployment Checklist

### Pre-Deploy
- [ ] Run all migrations in staging
- [ ] Test RLS with all user roles
- [ ] Verify alert triggers work
- [ ] Check backup/restore process
- [ ] Review Sentry configuration

### Deploy
- [ ] Apply migrations to production
- [ ] Verify no errors in logs
- [ ] Test critical user flows
- [ ] Monitor alert dashboard

### Post-Deploy
- [ ] Schedule pg_cron jobs for alerts
- [ ] Enable daily backups
- [ ] Set up monitoring dashboards
- [ ] Document rollback procedure
- [ ] Train team on alert responses

---

## 📚 Additional Resources

### Migrations Applied
1. `20251022160000_phase18_business_integrity.sql`
2. `20251022160100_phase18_rls_audit_tests.sql`
3. `20251022160200_phase18_alerts_monitoring.sql`

### Key Functions
- `log_app_event()` - Log business events
- `run_all_alert_checks()` - Run all monitoring
- `test_rls_as_role()` - Test security policies
- `guard_invoice_updates()` - Protect invoices
- `validate_mission_transition()` - Enforce states
- `check_stock_movement()` - Prevent negatives

### Key Views
- `stock_negative` / `stock_low` - Inventory monitoring
- `alert_*` views - All alert conditions
- `rls_enabled_check` / `rls_policy_coverage` - Security audit

---

## ⚠️ Known Limitations

1. **Invoice numbering** - Sequential numbers must be generated via edge function or DB sequence
2. **Email alerts** - Require edge function integration with email service
3. **pg_cron** - May require Supabase Pro plan or custom setup
4. **Sentry** - Frontend integration not yet configured
5. **PWA offline sync** - Service worker needs configuration

These can be addressed in Phase 19 or as production needs arise.
