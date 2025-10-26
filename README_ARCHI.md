# 🏗️ ARCHITECTURE NEXUS CLIM - Documentation Technique

> **Version:** Phase 2 - Consolidation
> **Date:** 2025-10-27
> **Statut:** Production-Ready, Rétro-Compatible

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Schéma de flux complet](#schéma-de-flux-complet)
3. [ERD Logique (Tables & Relations)](#erd-logique)
4. [États & Transitions Normalisés](#états--transitions)
5. [Système de Normalisation (status_norm)](#système-de-normalisation)
6. [Activity Log (Timeline Universelle)](#activity-log)
7. [Triggers & Automatisations](#triggers--automatisations)
8. [Vues Normalisées](#vues-normalisées)
9. [Sécurité & RLS](#sécurité--rls)
10. [Migration & Rollback](#migration--rollback)
11. [Tests d'Acceptation (DoD)](#tests-dacceptation)

---

## 🎯 VUE D'ENSEMBLE

### Principe Architecture

**Additive-Only, Zero Breaking Change**

- ✅ Colonnes miroir (`status_norm`) cohabitent avec colonnes existantes (`status`)
- ✅ Vues normalisées (`*_normalized`) pour transition progressive
- ✅ Triggers idempotents (peuvent être re-run sans problème)
- ✅ Aucune suppression/renommage de tables/colonnes existantes
- ✅ Front peut migrer progressivement vers vues normalisées

### Tables Principales (69 au total)

| Catégorie | Tables |
|-----------|--------|
| **Commercial** | `quotes`, `quote_items`, `pre_invoices`, `invoices`, `invoice_items` |
| **Opérationnel** | `missions`, `intervention_reports`, `procedure_templates`, `mission_offers` |
| **Paiements** | `payments`, `payment_reminders`, `sepa_mandates` |
| **Documents** | `client_portal_documents`, `mission_photos` |
| **Qualité** | `satisfaction_surveys`, `survey_templates`, `survey_questions`, `survey_responses` |
| **Stock** | `stock_items`, `stock_movements`, `stock_categories`, `stock_alerts` |
| **RH** | `profiles`, `vehicles`, `vehicle_assignments`, `time_entries` |
| **Logging** | `activity_log` ⭐ NEW, `mission_status_log`, `audit_logs`, `notifications` |

---

## 🔄 SCHÉMA DE FLUX COMPLET

```
[CLIENT DEMANDE]
    ↓
[DEVIS] (quotes → quote_items)
    ├─ status: brouillon → envoyé → accepté / refusé
    ↓ accepté
[MISSION] (missions)
    ├─ status: pending → accepted → in_progress → completed → validated → billed → paid
    ├─ Assignation: SAL interne OU ST externe
    ├─ Carte & critères (rayon, type, compétences)
    ↓ in_progress (TRIGGER: auto-crée intervention_report)
[FICHE INTERVENTION] (intervention_reports ← procedure_templates Clim Passion)
    ├─ Mobile-first (photos, checklist, signatures canvas)
    ├─ Status: draft → en_cours → terminé → validé
    ├─ SAL interne → validation auto
    ├─ ST externe → validation manuelle SAL/ADMIN
    ↓ terminé
[VALIDATION RAPPORT]
    ├─ Si SAL → auto-validation (TRIGGER)
    ├─ Si ST → validation manuelle via /intervention/validate/:id
    ↓ validé (TRIGGER: actions multiples)
[ACTIONS AUTO POST-VALIDATION]
    ├─ 1. Génération pré-facture (pre_invoices)
    ├─ 2. Planification enquête satisfaction (24h delayed)
    ├─ 3. Log dans activity_log
    ↓
[PRÉ-FACTURE] (pre_invoices)
    ├─ Status: brouillon → en_validation → validé / rejeté
    ├─ Items depuis rapport + matériaux utilisés
    ↓ validée
[FACTURE] (invoices → invoice_items)
    ├─ Status: draft → sent → partially_paid → paid → overdue → cancelled
    ├─ Génération numéro FAC-YYYY-NNNN
    ├─ PDF + envoi email client
    ├─ Paiements (payments) → MAJ auto status_norm (TRIGGER)
    ├─ Relances (payment_reminders) si overdue
    ↓ paid
[24H APRÈS VALIDATION RAPPORT] (CRON: send-survey-email Edge Function)
    ↓
[ENQUÊTE SATISFACTION] (satisfaction_surveys)
    ├─ Email client avec lien /satisfaction-survey/:token
    ├─ Template dynamique (survey_templates + survey_questions)
    ├─ Réponses (survey_responses) avec NPS, notes, commentaires
    ├─ Status: pending → sent → completed
    ↓
[ANALYTICS & DASHBOARD]
    ├─ KPI snapshots (kpi_snapshots)
    ├─ Stats globales (get_global_stats function)
    ├─ Timeline missions/factures (activity_log)
```

---

## 🗄️ ERD LOGIQUE

### Entités Principales & Relations

```
profiles(user_id, role, radius_km, lat, lng, …)
  ├─→ missions(assigned_user_id)
  ├─→ intervention_reports(technician_user_id, validated_by)
  ├─→ activity_log(actor_id)
  └─→ payments(created_by)

quotes(id, status, items_json)
  ├─→ quote_items(quote_id)
  ├─→ missions(quote_id) [converted]
  └─→ pre_invoices(quote_id)

missions(id, status, type_id, assigned_user_id, client_id)
  ├─→ intervention_reports(mission_id)
  ├─→ mission_offers(mission_id)
  ├─→ mission_photos(mission_id)
  ├─→ pre_invoices(mission_id)
  ├─→ invoices(mission_id)
  ├─→ satisfaction_surveys(mission_id)
  ├─→ activity_log(entity_id WHERE entity_type='mission')
  └─→ mission_status_log(mission_id)

intervention_types(id, name)
  └─→ missions(type_id)

procedure_templates(id, name, mission_type, steps, is_active)
  └─→ intervention_reports(procedure_template_id)

intervention_reports(id, mission_id, procedure_template_id, status, validated_by)
  ├─→ pre_invoices(intervention_report_id)
  └─→ satisfaction_surveys [via mission_id]

pre_invoices(id, mission_id, intervention_report_id, status, items)
  └─→ invoices(pre_invoice_id)

invoices(id, pre_invoice_id, mission_id, quote_id, status_norm, total_cents, paid_cents)
  ├─→ invoice_items(invoice_id)
  ├─→ payments(invoice_id)
  └─→ payment_reminders(invoice_id)

payments(id, invoice_id, amount_cents, status)
  [TRIGGER: update_invoice_on_payment → MAJ invoices.paid_cents + status_norm]

satisfaction_surveys(id, mission_id, status, nps_score, …)
  ├─→ survey_responses(survey_id)
  └─→ survey_email_logs(survey_id)

survey_templates(id, type, name)
  └─→ survey_questions(template_id)

activity_log(entity_type, entity_id, action, actor_id, metadata)
  [Timeline universelle: 'mission', 'invoice', 'report', 'payment', 'survey']

client_portal_documents(id, client_id, related_mission_id, related_invoice_id, …)
  [Vue: documents_view pour unification]

notifications(user_id, notification_type, related_mission_id, related_invoice_id, …)
  [Multi-canal: email, SMS, push + retry]
```

---

## 🔀 ÉTATS & TRANSITIONS

### Missions (missions.status → missions.status_norm)

| Ancien (text) | Normalisé (ENUM) | Description |
|---------------|------------------|-------------|
| `BROUILLON`, `pending` | `pending` | Mission créée, pas encore publiée |
| `PUBLIEE`, `ACCEPTEE` | `accepted` | Mission acceptée par technicien |
| `EN_COURS`, `IN_PROGRESS` | `in_progress` | Intervention en cours ⚡ TRIGGER: auto-crée rapport |
| `TERMINEE`, `COMPLETED` | `completed` | Intervention terminée |
| `VALIDEE`, `FACTURABLE` | `validated` | Rapport validé |
| `FACTUREE` | `billed` | Facture générée |
| `PAYEE` | `paid` | Facture payée |
| `ANNULEE`, `CANCELLED` | `cancelled` | Mission annulée |

### Invoices (invoices.status → invoices.status_norm)

| Ancien (text) | Normalisé (ENUM) | Description |
|---------------|------------------|-------------|
| `draft`, `brouillon` | `draft` | Facture en préparation |
| `sent`, `envoyé` | `sent` | Facture envoyée au client |
| `partiel`, `partial` | `partially_paid` | Paiement partiel reçu |
| `paid`, `payé` | `paid` | Intégralement payée |
| `overdue`, `en_retard` | `overdue` | Échue (due_date < today) |
| `cancelled`, `annulé` | `cancelled` | Facture annulée |

**Transition automatique (TRIGGER):**
```sql
payments.insert/update
  ↓ update_invoice_on_payment()
  → SUM(payments.amount_cents WHERE status='completed')
  → invoices.paid_cents = SUM
  → invoices.status_norm = CASE
      WHEN paid_cents >= total_cents THEN 'paid'
      WHEN paid_cents > 0 THEN 'partially_paid'
      WHEN due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'sent'
    END
```

### Intervention Reports (intervention_reports.status → intervention_reports.status_norm)

| Ancien (text) | Normalisé (ENUM) | Description |
|---------------|------------------|-------------|
| `draft`, `brouillon` | `draft` | Rapport en cours de rédaction |
| `en_cours` | `en_cours` | Intervention active |
| `terminé`, `completed` | `terminé` | Rapport complété ⚡ TRIGGER: validation auto si SAL |
| `validé`, `validated` | `validé` | Rapport validé ⚡ TRIGGER: pré-facture + enquête |
| `submitted` | `submitted` | Soumis pour validation |
| `rejected` | `rejected` | Rejeté (retour en_cours) |

---

## 🔄 SYSTÈME DE NORMALISATION

### Colonnes Miroir (Additive-Only)

Chaque table critique dispose de 2 colonnes :

1. **`status`** (text) - Colonne historique (CONSERVÉE, pas modifiée)
2. **`status_norm`** (ENUM) - Colonne normalisée (NOUVEAU, optionnelle)

### Vues Normalisées

```sql
-- Front consomme les vues, pas les tables directement
SELECT * FROM invoices_normalized;  -- au lieu de invoices
SELECT * FROM missions_normalized;  -- au lieu de missions
SELECT * FROM intervention_reports_normalized;  -- au lieu de intervention_reports
```

**Avantages:**
- ✅ Rétro-compatibilité totale
- ✅ Migration progressive (table par table, composant par composant)
- ✅ Pas de risque de régression
- ✅ Rollback immédiat (revenir à `status` text)

### Mapping Logique (exemple invoices_normalized)

```sql
CREATE OR REPLACE VIEW invoices_normalized AS
SELECT
  i.*,
  COALESCE(
    i.status_norm,  -- Priorité: colonne normalisée si remplie
    CASE
      WHEN i.status ILIKE 'draft%' THEN 'draft'
      WHEN i.status ILIKE 'sent%' THEN 'sent'
      WHEN i.status ILIKE 'paid%' THEN 'paid'
      -- ... mapping complet
    END::invoice_status_normalized
  ) AS status_final,  -- ← Front utilise cette colonne
  -- Colonnes calculées supplémentaires
  COALESCE(i.paid_cents, 0) AS paid_cents_safe,
  CASE
    WHEN paid_cents >= total_cents THEN 'paid'
    WHEN paid_cents > 0 THEN 'partially_paid'
    WHEN due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'sent'
  END::invoice_status_normalized AS computed_status
FROM invoices i;
```

---

## 📊 ACTIVITY_LOG (Timeline Universelle)

### Table Structure

```sql
CREATE TABLE activity_log (
  id uuid PRIMARY KEY,
  entity_type text NOT NULL,     -- 'mission', 'invoice', 'report', 'payment', 'survey'
  entity_id uuid NOT NULL,        -- ID de l'entité concernée
  action text NOT NULL,           -- 'status_changed', 'validated', 'payment_received', etc.
  actor_id uuid REFERENCES profiles(user_id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

### Événements Loggés Automatiquement

| Entité | Actions Loggées |
|--------|----------------|
| **mission** | `status_changed`, `report_created`, `assigned`, `completed` |
| **invoice** | `status_changed`, `payment_updated`, `sent`, `overdue_reminder` |
| **report** | `validated`, `rejected`, `submitted` |
| **payment** | `payment_pending`, `payment_completed`, `payment_failed` |
| **survey** | `scheduled`, `sent`, `completed` |

### Usage

```sql
-- Log manuel
SELECT log_activity('mission', mission_id, 'custom_action', user_id, '{"key":"value"}'::jsonb);

-- Timeline d'une mission
SELECT * FROM get_entity_timeline('mission', '123e4567-e89b-12d3-a456-426614174000');

-- Résultat:
| event_time | event_action | actor_name | metadata |
|------------|--------------|------------|----------|
| 2025-10-27 10:30 | validated | Jean Dupont | {"report_id":"..."} |
| 2025-10-27 09:15 | status_changed | Marie Martin | {"from":"in_progress","to":"completed"} |
```

---

## ⚙️ TRIGGERS & AUTOMATISATIONS

### 1. update_invoice_on_payment()

**Quand:** `payments` INSERT/UPDATE
**Action:**
- Calcule `SUM(payments.amount_cents)`
- Met à jour `invoices.paid_cents`
- Calcule `invoices.status_norm` (paid/partially_paid/overdue)
- Log dans `activity_log`

```sql
-- Déclenché automatiquement
INSERT INTO payments (invoice_id, amount_cents, status) VALUES (...);
-- → Facture MAJ instantanément
```

### 2. on_report_validated_extended()

**Quand:** `intervention_reports.status` → `validé`
**Action:**
- Crée `pre_invoices` (brouillon) si absente
- Crée `satisfaction_surveys` (pending) si absente
- Log validation dans `activity_log`

```sql
-- Déclenché par
UPDATE intervention_reports SET status = 'validé', validated_by = user_id WHERE id = ...;
-- → Pré-facture + enquête créées auto
```

### 3. create_report_on_mission_start()

**Quand:** `missions.status` → `in_progress`
**Action:**
- Vérifie si `intervention_reports` existe
- Si absent ET technicien assigné → crée rapport avec template approprié
- Log création dans `activity_log`

```sql
-- Déclenché par
UPDATE missions SET status = 'in_progress', assigned_user_id = tech_id WHERE id = ...;
-- → Rapport créé auto avec template Clim Passion
```

### 4. log_mission_status_change() & log_invoice_status_change()

**Quand:** Changement de `status` ou `status_norm`
**Action:** Log automatique dans `activity_log`

---

## 👁️ VUES NORMALISÉES

### invoices_normalized

**Utilisation:** `SELECT * FROM invoices_normalized WHERE status_final = 'overdue'`

**Colonnes ajoutées:**
- `status_final` - Status normalisé (ENUM)
- `paid_cents_safe` - Montant payé (jamais NULL)
- `computed_status` - Status calculé dynamiquement

### missions_normalized

**Utilisation:** `SELECT * FROM missions_normalized WHERE status_final = 'in_progress'`

**Colonnes ajoutées:**
- `status_final` - Status normalisé (ENUM)

### intervention_reports_normalized

**Utilisation:** `SELECT * FROM intervention_reports_normalized WHERE status_final = 'validé'`

**Colonnes ajoutées:**
- `status_final` - Status normalisé (ENUM)

### documents_view

**Utilisation:** `SELECT * FROM documents_view WHERE related_type = 'mission' AND related_id = ...`

**Unifie:** `client_portal_documents` (pas de nouvelle table, vue seulement)

**Colonnes standardisées:**
- `source` - Toujours 'client_portal'
- `related_type` - 'mission', 'contract', 'quote', 'invoice', 'client'
- `related_id` - UUID de l'entité parente
- `file_name`, `file_url`, `file_type`, `file_size_bytes`

---

## 🔒 SÉCURITÉ & RLS

### activity_log

```sql
-- Admin: voit tout
CREATE POLICY "Admin can view all activities" ...

-- SAL: voit ses entités (société)
CREATE POLICY "SAL can view related activities" ...

-- Insertion: authenticated users seulement
CREATE POLICY "Authenticated can insert activities" ...
```

### Vues Normalisées

Héritent automatiquement des RLS des tables sous-jacentes.

### Documents View

Hérite RLS de `client_portal_documents` :
- Admin: tout
- SAL: sa société
- ST: ses missions assignées
- CLIENT: via liens sécurisés (visible_to_client = true)

---

## 🔄 MIGRATION & ROLLBACK

### Plan de Migration (3 Passes)

#### **PASS A - Additive (FAIT ✅)**
- Créer `activity_log`
- Créer ENUMs normalisés
- Ajouter colonnes miroir `status_norm`
- Créer vues `*_normalized`
- Créer fonctions helper

**Fichier:** `20251027100000_phase2_consolidation_pass_a.sql`

#### **PASS B - Triggers (FAIT ✅)**
- Créer triggers automatiques
- Backfill `status_norm` depuis `status`
- Logger événements clés

**Fichier:** `20251027100100_phase2_consolidation_pass_b_triggers.sql`

#### **PASS C - Opt-In (À FAIRE PROGRESSIVEMENT)**
- Basculer front composant par composant vers vues normalisées
- Tester en QA/staging
- Rollback instantané si problème (revenir à tables directes)

### Rollback

**Immédiat et sans risque:**

```sql
-- Front revient à consommer tables directes
SELECT * FROM invoices;  -- au lieu de invoices_normalized
SELECT * FROM missions;  -- au lieu de missions_normalized

-- Supprimer triggers si nécessaire
DROP TRIGGER IF EXISTS trg_update_invoice_on_payment ON payments;
DROP TRIGGER IF EXISTS trg_on_report_validated_extended ON intervention_reports;
-- etc.

-- Colonnes miroir status_norm restent mais ne sont plus utilisées
-- activity_log reste et continue de logger (pas de régression)
```

**Aucune perte de données, aucune incompatibilité.**

---

## ✅ TESTS D'ACCEPTATION (DoD)

### Checklist Validation Production

- [ ] **Aucune duplication** table/fichier/service
- [ ] **Rétro-compatibilité** : code existant fonctionne sans modification
- [ ] **Vues normalisées** accessibles et performantes
- [ ] **Paiement partiel** → `invoices.status_norm` = `partially_paid` ✅
- [ ] **Paiement total** → `invoices.status_norm` = `paid` ✅
- [ ] **Mission → in_progress** → fiche créée automatiquement ✅
- [ ] **Rapport validé** → pré-facture générée ✅
- [ ] **Rapport validé** → enquête planifiée (24h) ✅
- [ ] **Activity_log** reçoit événements clés ✅
- [ ] **Timeline** récupérable via `get_entity_timeline()` ✅
- [ ] **Stats globales** via `get_global_stats()` ✅
- [ ] **RLS** conformes pour ADMIN / SAL / ST / CLIENT ✅
- [ ] **Build** réussi sans erreurs ✅
- [ ] **Edge Function** send-survey-email testée ✅
- [ ] **Notifications** in-app fonctionnelles ✅
- [ ] **Documents** accessibles via `documents_view` ✅

---

## 📈 STATISTIQUES & MÉTRIQUES

### Fonction get_global_stats()

```sql
SELECT * FROM get_global_stats();
```

**Retourne:**
| Colonne | Description |
|---------|-------------|
| `total_missions` | Nombre total missions |
| `missions_in_progress` | Missions en cours |
| `missions_completed` | Missions terminées |
| `total_invoices` | Nombre total factures |
| `invoices_paid` | Factures payées |
| `invoices_overdue` | Factures en retard |
| `total_revenue_cents` | Revenu total (centimes) |
| `avg_nps_score` | Score NPS moyen |

---

## 🚀 ROADMAP FUTURE

### Phase 3 - Optimisations (Optionnel)

1. **Suppression colonnes legacy** (après validation QA 6 mois)
   - Supprimer `status` text
   - Renommer `status_norm` → `status`
   - Supprimer vues `*_normalized`

2. **Indexation avancée**
   - Index partiels sur status actifs
   - Index GIN sur jsonb `metadata`

3. **Archivage automatique**
   - Missions > 2 ans → table `missions_archive`
   - Factures payées > 5 ans → table `invoices_archive`

4. **Analytics temps réel**
   - Materialized views pour dashboards
   - Refresh automatique via cron

---

## 📞 SUPPORT & CONTACT

**Équipe Tech Nexus Clim**
📧 tech@nexusclim.fr
📞 01 23 45 67 89

**Documentation Complémentaire:**
- `docs/calendar-drag-drop.md` - Système drag & drop planning
- `docs/survey-templates-system.md` - Templates enquêtes satisfaction
- `docs/go-live-master.md` - Checklist go-live production

---

**Version:** 2.0.0
**Dernière MAJ:** 2025-10-27
**Auteur:** Architecture Team
