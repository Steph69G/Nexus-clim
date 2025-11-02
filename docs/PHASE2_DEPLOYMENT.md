# 🚀 Phase 2 - Guide de Déploiement

## Vue d'ensemble

Phase 2 solidifie le workflow avec :
- ✅ **RLS policies granulaires** par rôle et flux
- ✅ **RPC durcis** avec garde-fous complets + codes erreur normalisés
- ✅ **Edge functions** (notifications automatiques + PDF)
- ✅ **Composants UI** contextuels (boutons transitions, checklist, pause banner)

---

## 📋 Prérequis

- [x] Phase 1 déployée (enums + colonnes missions + logs)
- [x] Accès Supabase Dashboard (admin)
- [x] CLI Supabase installée (optionnel mais recommandé)
- [x] Node.js 18+ pour tests front

---

## 1️⃣ Migration Database

### Appliquer migration Phase 2

```bash
# Option A : Via Supabase CLI
supabase db push

# Option B : Via Dashboard
# 1. Aller dans SQL Editor
# 2. Copier contenu de supabase/migrations/20251102_phase2_rls_and_guards.sql
# 3. Run
```

### Vérifications post-migration

```sql
-- Vérifier table error_codes
SELECT COUNT(*) FROM error_codes; -- Doit retourner ~15 codes

-- Vérifier RLS activé
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('missions', 'intervention_reports', 'invoices');

-- Vérifier policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

---

## 2️⃣ Edge Functions

### Déployer les 3 fonctions

```bash
# Fonction 1 : on-mission-published
supabase functions deploy on-mission-published

# Fonction 2 : on-report-validated
supabase functions deploy on-report-validated

# Fonction 3 : pdf-generate
supabase functions deploy pdf-generate
```

### Configuration variables d'environnement

```bash
# Dans Supabase Dashboard → Project Settings → Edge Functions

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@nexusclim.fr
SMTP_PASS=***
BASE_URL=https://nexusclim.fr
STORAGE_BUCKET=nexus-clim
```

### Tester les fonctions

```bash
# Test on-mission-published
curl -X POST https://<project-ref>.supabase.co/functions/v1/on-mission-published \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"mission_id":"123e4567-e89b-12d3-a456-426614174000"}'

# Doit retourner :
# {"success":true,"mission_id":"...","message":"Notifications envoyées..."}
```

---

## 3️⃣ Storage Buckets (à créer manuellement)

### Via Dashboard : Storage → Create Bucket

| Bucket | Public | Policies |
|--------|--------|----------|
| `reports` | ✅ Yes | SELECT: authenticated |
| `invoices` | ✅ Yes | SELECT: authenticated |
| `emails` | ❌ No | SELECT: service_role |
| `pdf-templates` | ❌ No | SELECT: service_role |

### Upload templates (TODO Phase 2.1)

```
/emails/
  nouvelle-mission.html
  technicien-assigne.html
  confirmation-rdv.html
  rapport-valide.html
  facture.html

/pdf/templates/
  rapport.html
  facture.html
```

---

## 4️⃣ Frontend Integration

### 1. Installer composants workflow

Les composants sont déjà créés dans `src/components/workflow/` :
- `MissionHeaderActions.tsx`
- `PauseBanner.tsx`
- `ChecklistGuard.tsx`

### 2. Utiliser dans pages existantes

**Exemple : MissionDetailPage.tsx**

```tsx
import { MissionHeaderActions } from '../../components/workflow/MissionHeaderActions';
import { PauseBanner } from '../../components/workflow/PauseBanner';

function MissionDetailPage() {
  const { data: mission } = useMission(missionId);
  const { data: profile } = useProfile();

  return (
    <div>
      {/* Banner pause si applicable */}
      {mission.status === 'EN_PAUSE' && (
        <PauseBanner
          pauseReason={mission.pause_reason}
          pauseNote={mission.pause_note}
          updatedAt={mission.updated_at}
        />
      )}

      {/* Actions contextuelles */}
      <MissionHeaderActions
        missionId={mission.id}
        status={mission.status}
        reportStatus={mission.report_status}
        billingStatus={mission.billing_status}
        userRole={profile.role}
        assignedUserId={mission.assigned_user_id}
        currentUserId={profile.user_id}
        onSuccess={() => refetch()}
      />

      {/* Reste du contenu */}
    </div>
  );
}
```

### 3. Mapper codes erreur

**Créer `src/lib/errorMessages.ts`**

```ts
export const ERROR_MESSAGES: Record<string, string> = {
  'E_OP_PUBLISH_INVALID_STATE': 'Impossible de publier depuis cet état',
  'E_OP_SCHED_CONFLICT': 'Conflit de calendrier pour le technicien',
  'E_OP_COMPLETE_CHECKS_FAILED': 'Checklist incomplète : vérifiez signatures/photos/mesures',
  // ... copier depuis error_codes table
};

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || 'Une erreur est survenue';
}
```

### 4. Wrapper RPC avec gestion erreurs

```ts
// src/api/workflow.ts
import { supabase } from '../supabase';
import { getErrorMessage } from '../lib/errorMessages';

export async function publishMission(missionId: string) {
  const { error } = await supabase.rpc('rpc_publish_mission', { mission_id: missionId });

  if (error) {
    const code = error.message.match(/E_\w+/)?.[0];
    throw new Error(code ? getErrorMessage(code) : error.message);
  }
}

// Répéter pour toutes les RPC...
```

---

## 5️⃣ Tests End-to-End

### Seed data pour tests

```sql
-- Créer mission test (via admin)
INSERT INTO missions (
  id, title, status, report_status, billing_status,
  client_name, address, type, created_by_id
) VALUES (
  gen_random_uuid(),
  'Test Workflow Phase 2',
  'BROUILLON',
  'A_COMPLETER',
  'NON_FACTURABLE',
  'Client Test',
  '123 rue Test',
  'Dépannage',
  (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1)
);
```

### Scénario happy path (SAL)

1. ✅ Admin publie mission → `PUBLIEE`
2. ✅ Tech SAL accepte → `ACCEPTEE`
3. ✅ Admin planifie → `PLANIFIEE` (vérif heures ouvrées)
4. ✅ Tech démarre trajet → `EN_ROUTE`
5. ✅ Tech démarre intervention → `EN_INTERVENTION` (rapport auto-créé)
6. ✅ Tech met en pause → `EN_PAUSE` (raison + note)
7. ✅ Tech reprend → `EN_INTERVENTION`
8. ✅ Tech complète signatures/photos → checklist OK
9. ✅ Tech termine → `TERMINEE` + `AUTO_VALIDE` (SAL)
10. ✅ Admin émet facture → `FACTUREE`
11. ✅ Admin marque payée → `PAYEE` + `is_closed_calculated = true`

### Scénario rejection (ST)

1. ST termine intervention → `TERMINEE` + `A_VALIDER`
2. Admin rejette (photos insuffisantes) → `EN_INTERVENTION` + `A_COMPLETER`
3. ST ajoute photos + re-termine → `SOUMIS` → `A_VALIDER`
4. Admin valide → `VALIDE` + `FACTURABLE`

### Scénario erreur (conflits calendrier)

```ts
// Tech déjà planifié 10h-12h
// Tenter planification 11h-13h → doit échouer avec E_OP_SCHED_CONFLICT
await supabase.rpc('rpc_schedule_mission', {
  mission_id: '...',
  scheduled_start: '2025-11-02T11:00:00Z'
});
// Erreur attendue : "Conflit de calendrier pour le technicien"
```

---

## 6️⃣ Monitoring & Observabilité

### KPI à surveiller

```sql
-- Missions en pause > 2h
SELECT COUNT(*) FROM v_missions_paused WHERE hours_paused > 2;

-- Rapports en attente validation
SELECT COUNT(*) FROM v_reports_awaiting_validation;

-- Taux validation SAL vs ST
SELECT
  CASE WHEN p.role = 'sal' THEN 'SAL' ELSE 'ST' END AS type_tech,
  COUNT(*) AS total_validations,
  AVG(EXTRACT(EPOCH FROM (rsl.created_at - m.finished_at)) / 3600) AS avg_hours_to_validate
FROM report_status_log rsl
JOIN missions m ON m.id = rsl.mission_id
JOIN profiles p ON p.user_id = m.assigned_user_id
WHERE rsl.to_status = 'VALIDE'
GROUP BY type_tech;
```

### Alertes recommandées

- ⚠️ Mission en pause > 4h → notif admin
- ⚠️ Rapport en attente > 24h → escalade
- ⚠️ Facture impayée > 30j → relance automatique

---

## 7️⃣ Rollback (si problème)

```sql
-- Rétrograder migrations Phase 2
-- ATTENTION : perte données logs/error_codes

DROP TABLE IF EXISTS error_codes CASCADE;
DROP FUNCTION IF EXISTS rpc_cancel_mission;
DROP FUNCTION IF EXISTS rpc_issue_invoice;
DROP FUNCTION IF EXISTS rpc_mark_invoice_paid;
DROP FUNCTION IF EXISTS rpc_issue_credit_note;
DROP FUNCTION IF EXISTS is_within_business_hours;
DROP FUNCTION IF EXISTS has_calendar_conflict;

-- Désactiver RLS policies Phase 2
-- (conserver policies Phase 1)
```

---

## 8️⃣ Checklist Go/No-Go

- [ ] Migration Phase 2 appliquée sans erreur
- [ ] 15 codes erreur présents dans `error_codes`
- [ ] RLS activé sur missions/reports/invoices
- [ ] Edge functions déployées (3/7 minimum)
- [ ] Buckets storage créés
- [ ] Composants UI intégrés dans 1 page test
- [ ] Tests RPC (publish → accept → schedule) OK
- [ ] Tests heures ouvrées + conflits OK
- [ ] Logs workflow traçables dans DB

---

## 📚 Documentation complète

- **Phase 1** : `docs/PHASE1_WORKFLOW.md`
- **Phase 2** : Ce fichier
- **Architecture** : `README_ARCHI.md`
- **Codes erreur** : Query `SELECT * FROM error_codes ORDER BY category, code`

---

## 🆘 Support

En cas de problème :
1. Vérifier logs Supabase : Dashboard → Logs → Edge Functions
2. Vérifier policies RLS : `SELECT * FROM pg_policies WHERE schemaname = 'public'`
3. Tester RPC manuellement via SQL Editor
4. Rollback si critique (voir section 7)

---

**Dernière mise à jour :** 2025-11-02
**Version :** Phase 2 - MVP Go-Live Ready
