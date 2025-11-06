# 🚀 Guide Complet du Workflow des Missions

## 📋 Vue d'ensemble

Le système utilise **3 flux parallèles** avec garde-fous critiques :

1. **Flux Opérationnel** (`status`) - L'état de la mission
2. **Flux Qualité** (`report_status`) - L'état du rapport d'intervention
3. **Flux Facturation** (`billing_status`) - L'état de facturation

---

## 🔄 Cycle de vie complet d'une mission

### **Étape 1 : Créer une mission (BROUILLON)**

```typescript
const { data: mission } = await supabase
  .from('missions')
  .insert({
    title: 'Installation climatiseur',
    type: 'installation',
    client_id: 'uuid-du-client',
    address: 'Adresse complète',
  })
  .select()
  .single();
```

**État initial** :
- `status` = `BROUILLON`
- `report_status` = `null`
- `billing_status` = `NON_FACTURABLE`

---

### **Étape 2 : Publier la mission (BROUILLON → PUBLIEE)**

```typescript
import { publishMission } from '@/api/workflow.rpc';

await publishMission(missionId);
```

**RPC** : `rpc_publish_mission` ou `rpc_transition_mission(id, 'PUBLIEE')`

**Qui peut publier** : Admin, Manager, SAL

**Validations** :
- Mission doit être en statut `BROUILLON`
- Permission vérifiée

---

### **Étape 3 : Accepter la mission (PUBLIEE → ACCEPTEE)**

```typescript
import { acceptMission } from '@/api/workflow.rpc';

await acceptMission(missionId);
```

**RPC** : `rpc_accept_mission` ou `rpc_transition_mission(id, 'ACCEPTEE')`

**Qui peut accepter** : Technicien, Sous-traitant, SAL

**Effets automatiques** :
- Mission assignée au technicien (`assigned_user_id` = utilisateur actuel)
- `accepted_at` = maintenant
- Log créé dans `mission_workflow_log`

---

### **Étape 4 : Planifier la mission (ACCEPTEE → PLANIFIEE)**

```typescript
import { scheduleMission } from '@/api/workflow.rpc';

await scheduleMission(
  missionId,
  '2025-11-10T09:00:00Z', // scheduled_start
  '2025-11-10T11:00:00Z'  // scheduled_end (optionnel)
);
```

**RPC** : `rpc_schedule_mission_validated`

**Qui peut planifier** : Admin, Manager, SAL, Technicien assigné

**Validations automatiques** :
- ✅ **Heures ouvrées** : Lun-Ven 07h-20h (timezone Europe/Paris)
- ✅ Jour ouvrable (pas week-end sauf override admin)
- ✅ Permission vérifiée

**Effets** :
- `scheduled_start` et optionnellement `scheduled_end` définis
- `initial_planned_at` = scheduled_start (première planification)
- `planned_at` = maintenant
- `rescheduled_count` incrémenté si replanification

**Override heures ouvrées** (admin uniquement) :
```typescript
await scheduleMission(missionId, date, null, true); // override = true
```

---

### **Étape 5 : Démarrer le trajet (PLANIFIEE → EN_ROUTE)**

```typescript
import { startTravel } from '@/api/workflow.rpc';

await startTravel(missionId);
```

**RPC** : `rpc_start_travel` ou `rpc_transition_mission(id, 'EN_ROUTE')`

**Qui peut démarrer** : Technicien assigné uniquement

---

### **Étape 6 : Démarrer l'intervention (EN_ROUTE → EN_INTERVENTION)**

```typescript
import { startIntervention } from '@/api/workflow.rpc';

await startIntervention(missionId);
```

**RPC** : `rpc_start_intervention` ou `rpc_transition_mission(id, 'EN_INTERVENTION')`

**Effets automatiques** :
- ✨ **Création automatique du rapport d'intervention** (si n'existe pas)
- `report_status` = `A_COMPLETER`
- Recherche du template actif correspondant au type de mission
- Log créé dans `report_status_log`

**Qui peut démarrer** : Technicien assigné, Admin, Manager

---

### **Étape 7 (Optionnel) : Mettre en pause (EN_INTERVENTION → EN_PAUSE)**

```typescript
import { pauseMission } from '@/api/workflow.rpc';

await pauseMission(
  missionId,
  'pieces_manquantes', // pause_reason
  'En attente de pièce X123' // pause_note (optionnel)
);
```

**Motifs de pause disponibles** :
- `client_absent` - Client absent
- `acces_impossible` - Accès impossible
- `pieces_manquantes` - Pièces manquantes
- `securite` - Problème de sécurité
- `contre_ordre` - Contre-ordre

**Pour reprendre** :
```typescript
import { resumeFromPause } from '@/api/workflow.rpc';

await resumeFromPause(missionId);
```

---

### **Étape 8 : Terminer l'intervention (EN_INTERVENTION → TERMINEE)**

```typescript
import { completeIntervention } from '@/api/workflow.rpc';

await completeIntervention(missionId);
```

**RPC** : `rpc_complete_intervention` ou `rpc_transition_mission(id, 'TERMINEE')`

**⚠️ VALIDATIONS BLOQUANTES** :
1. ✅ Signature technicien obligatoire
2. ✅ Signature client obligatoire
3. ✅ Photos minimales (selon template)

**Flux automatique selon le rôle** :

#### Si Technicien SAL :
- `report_status` = `SOUMIS` → `AUTO_VALIDE`
- Pas besoin de validation admin

#### Si Sous-Traitant :
- `report_status` = `SOUMIS` → `A_VALIDER`
- Nécessite validation admin

---

### **Étape 9 : Validation du rapport (Admin uniquement)**

```typescript
import { validateReport } from '@/api/workflow.rpc';

await validateReport(missionId);
```

**RPC** : `rpc_validate_report`

**Qui peut valider** : Admin, Manager uniquement

**Effets** :
- `report_status` = `VALIDE`
- `billing_status` = `FACTURABLE` (si était NON_FACTURABLE)

**Rejeter un rapport** :
```typescript
import { rejectReport } from '@/api/workflow.rpc';

await rejectReport(
  missionId,
  'photos_insuffisantes', // rejection_reason
  'Il manque les photos avant/après' // details
);
```

**Motifs de rejet** :
- `photos_insuffisantes`
- `mesures_manquantes`
- `signature_manquante`
- `incoherence_rapport`

**Effet du rejet** :
- `report_status` = `A_COMPLETER`
- `status` = `EN_INTERVENTION` (retour en intervention)
- `billing_status` = `NON_FACTURABLE` (si était FACTURABLE)

---

### **Étape 10 : Facturation**

```typescript
import { issueInvoice, markInvoicePaid } from '@/api/workflow.rpc';

// Émettre une facture
const invoice = await issueInvoice(missionId, {
  lines: [
    {
      description: 'Installation climatiseur',
      quantity: 1,
      unit_price_cents: 150000, // 1500€
      vat_rate: 20
    }
  ],
  notes: 'Paiement sous 30 jours'
});

// billing_status passe automatiquement à 'FACTUREE'

// Marquer comme payée
await markInvoicePaid(
  missionId,
  'virement', // payment_method
  'REF-2025-001' // payment_reference
);

// billing_status passe à 'PAYEE'
```

**Contrainte métier** : ⚠️ **UNE SEULE facture non-payée par mission** (garantie par index unique)

---

## 📊 États finaux et clôture

Quand la mission atteint tous ces états :
- `status` = `TERMINEE`
- `report_status` = `VALIDE` ou `AUTO_VALIDE`
- `billing_status` = `PAYEE`

→ **La colonne `closed_at` est automatiquement définie** (trigger)

→ **La colonne `is_closed_calculated` = true** (computed)

---

## 🛡️ Garde-fous critiques (Migrations 2025-11-07)

### 1. **Idempotence (anti-double-clic)**

Table `rpc_idempotency` :
- Cache les résultats RPC pendant 24h
- Évite double-exécution sur double-clic
- Hash MD5 des paramètres

**Utilisation** :
```typescript
// Côté client : générer un UUID stable
const idempotencyKey = generateUUID(); // à stocker en state

// Côté serveur : vérification automatique
const cached = check_idempotency(idempotencyKey, missionId, 'rpc_publish_mission');
if (cached->>'cached' = 'true') {
  return cached->'response';
}
```

---

### 2. **Logs immuables (append-only)**

Les 3 tables de logs sont protégées :
- `mission_workflow_log`
- `report_status_log`
- `billing_status_log`

**Protection** : Triggers `forbid_log_mutations()` empêchent UPDATE/DELETE

**Impact juridique** : Conformité audit trail / RGPD

---

### 3. **Heures ouvrées & timezone Paris**

Fonctions disponibles :
```sql
-- Heure actuelle Paris
SELECT now_paris();

-- Vérifier jour ouvrable
SELECT is_business_day('2025-11-10'::timestamptz);

-- Vérifier heures ouvrées (lun-ven 07h-20h)
SELECT is_business_hours('2025-11-10 15:30:00'::timestamptz);

-- Formater en français
SELECT format_paris_datetime(now()); -- 07/11/2025 à 14:30
```

**Validation automatique** : `rpc_schedule_mission_validated` refuse planifications hors heures (sauf override admin)

---

### 4. **Queue notifications**

Table `notifications_queue` :
- Retry automatique (3 tentatives)
- Expiration 7 jours
- Multi-canaux (in_app, email, sms, push)

**Enqueue notification** :
```sql
SELECT enqueue_notification(
  mission_id,
  'mission_published',
  'email-nouvelle-mission',
  '[{"user_id":"...","email":"tech@example.com"}]'::jsonb,
  ARRAY['email','in_app'],
  'Nouvelle mission disponible',
  'Une mission Installation climatiseur est disponible',
  '/missions/123',
  'high'
);
```

---

### 5. **Tracking no-show et replanifications**

Nouvelles colonnes `missions` :
- `initial_planned_at` - Date première planification (conservée)
- `rescheduled_count` - Nombre de replanifications
- `no_show_at` - Date/heure du no-show
- `no_show_type` - `client` ou `tech`

**Marquer no-show** :
```typescript
await supabase.rpc('rpc_mark_no_show', {
  _mission_id: missionId,
  _no_show_type: 'client', // ou 'tech'
  _note: 'Client absent, porte fermée'
});
```

**Effet** :
- `status` = `PLANIFIEE` (retour planification)
- Log créé avec motif

---

## 🎯 RPC Centralisé (Migration 3)

### Fonction générique : `rpc_transition_mission`

Toutes les transitions peuvent utiliser cette fonction :

```typescript
// Exemple : publier mission
await supabase.rpc('rpc_transition_mission', {
  p_mission_id: missionId,
  p_to_status: 'PUBLIEE',
  p_reason: 'published_by_admin',
  p_metadata: { source: 'web_app' }
});
```

**Validations automatiques** :
1. ✅ Transition autorisée (via `mission_transitions`)
2. ✅ Rôle autorisé
3. ✅ Mission assignée (si requis)
4. ✅ Mission planifiée (si requis)
5. ✅ Business hours (si requis)
6. ✅ Signatures/photos (si requis)

**Effets automatiques** (via `auto_effects` JSON) :
- `set` : Mettre à jour colonnes
- `create` : Créer rapport
- `notify` : Enqueue notification

**Wrappers métier** (conservent API existante) :
- `rpc_publish_mission_v2()`
- `rpc_accept_mission_v2()`
- `rpc_start_travel_v2()`
- `rpc_start_intervention_v2()`
- `rpc_complete_intervention_v2()`

---

## 📖 Documentation dynamique

### Vue `v_workflow_transitions_doc`

Liste toutes les transitions avec leurs règles :

```sql
SELECT * FROM v_workflow_transitions_doc;
```

**Colonnes** :
- `from_status`, `to_status`
- `allowed_roles` - Rôles autorisés
- `require_assigned` - Nécessite assignation
- `checks` - Validations à effectuer
- `description` - Description métier
- `auto_effects` - Effets automatiques

---

## 🔍 Vues utilitaires

### Missions à clôturer
```sql
SELECT * FROM v_missions_ready_to_close;
```

### Rapports à valider
```sql
SELECT * FROM v_reports_awaiting_validation;
```

### Missions en pause
```sql
SELECT * FROM v_missions_paused;
```

---

## 🚨 Cas d'erreur courants

### Erreur : "Transition invalide"
**Cause** : Statut actuel ne permet pas la transition demandée

**Solution** : Vérifier `mission_transitions` pour voir transitions autorisées

---

### Erreur : "Permission refusée"
**Cause** : Rôle utilisateur non autorisé pour cette transition

**Solution** : Vérifier `allowed_roles` dans `mission_transitions`

---

### Erreur : "Planification hors heures ouvrées"
**Cause** : Tentative planification week-end ou hors 07h-20h

**Solution** :
- Planifier en semaine 07h-20h
- OU demander override admin

---

### Erreur : "Signatures ou photos manquantes"
**Cause** : `completeIntervention` sans signatures/photos

**Solution** : Compléter rapport avant de terminer

---

### Erreur : "Mission non assignée"
**Cause** : Tentative transition nécessitant assignation

**Solution** : Assigner technicien d'abord

---

## 📊 Statistiques & Analytics

### No-show par type
```sql
SELECT
  no_show_type,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (closed_at - no_show_at))/3600) as avg_hours_to_resolution
FROM missions
WHERE no_show_at IS NOT NULL
GROUP BY no_show_type;
```

### Replanifications moyennes
```sql
SELECT
  AVG(rescheduled_count) as avg_rescheduled,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rescheduled_count) as median_rescheduled,
  MAX(rescheduled_count) as max_rescheduled
FROM missions
WHERE rescheduled_count > 0;
```

### Temps moyen par statut
```sql
SELECT
  from_status,
  to_status,
  AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY mission_id ORDER BY created_at)))/3600) as avg_hours
FROM mission_workflow_log
GROUP BY from_status, to_status
ORDER BY from_status;
```

---

## ✅ Checklist pré-production

- [x] Idempotence activée
- [x] Logs immuables protégés
- [x] Validation heures ouvrées
- [x] Queue notifications configurée
- [x] Tracking no-show/replanifs
- [x] RPC centralisé testé
- [x] Contrainte facture unique
- [x] Documentation à jour
- [ ] Cron job nettoyage `rpc_idempotency` (expires_at)
- [ ] Cron job nettoyage `notifications_queue` (expires_at)
- [ ] Worker notifications (processing queue)
- [ ] Monitoring alertes (missions EN_PAUSE > 48h)

---

## 🎉 Système prêt pour production !

Le workflow est maintenant **béton** avec :
- ✅ Sécurité juridique (logs immuables)
- ✅ Fiabilité (idempotence)
- ✅ Conformité métier (heures ouvrées)
- ✅ Traçabilité complète (notifications queue)
- ✅ Maintenance facilitée (RPC centralisé)
