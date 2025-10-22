# Calendar Drag & Drop - QA Checklist

**Phase 19 - Production Validation Kit**

---

## 🎯 OBJECTIF

Valider le système de drag & drop sur **toutes les vues calendrier** avant déploiement production.

**Temps estimé :** 10-15 min (2-3 min par vue)

---

## 📋 VUES À TESTER

- [ ] Week View (`/admin/planning`)
- [ ] Day View
- [ ] Month View (`/calendar`)
- [ ] Resource View (`/admin/planning-multi-tech`)
- [ ] Tech Agenda (`/tech/missions`)

---

## ✅ TESTS PAR VUE

### 1. Déplacement Simple (même tech)

**Objectif :** Vérifier qu'une mission se déplace correctement

- [ ] Glisser une mission vers un nouveau créneau
- [ ] **Résultat attendu :** Mission déplacée, page rafraîchie, nouvelle position visible
- [ ] **Vérifier :** Heures conservées (pas de décalage fuseau)

**SQL Check :**
```sql
SELECT * FROM app_events
WHERE event_type = 'calendar_move'
ORDER BY created_at DESC
LIMIT 1;
-- Doit contenir: mission_id, old/new start, source view
```

---

### 2. Cross-Resource (glisser vers autre tech)

**Objectif :** Vérifier réassignation entre techniciens

**Applicable à :** Resource View, Week View

- [ ] Glisser mission Tech A vers colonne Tech B
- [ ] **Résultat attendu :** Mission réassignée à Tech B
- [ ] **Vérifier :** `assigned_user_id` changé dans BDD

**SQL Check :**
```sql
SELECT id, title, assigned_user_id
FROM missions
WHERE id = 'mission-uuid';
-- assigned_user_id doit être Tech B
```

---

### 3. Conflit Détecté

**Objectif :** Vérifier détection conflits + rollback

- [ ] Créer 2 missions au même créneau pour même tech
- [ ] Essayer de déplacer Mission A sur créneau Mission B
- [ ] **Résultat attendu :**
  - ❌ Erreur "Conflit de planning"
  - Mission A reste à position originale (rollback visuel)
  - Toast clair affiché

---

### 4. Force Move (Alt + Drop)

**Objectif :** Admin/SAL peut forcer malgré conflit

**Rôles testés :** Admin, SAL

- [ ] Même scénario que test 3
- [ ] **Maintenir Alt** pendant le drop
- [ ] **Résultat attendu :**
  - ✅ Mission déplacée malgré conflit
  - Log `force: true` dans app_events

**SQL Check :**
```sql
SELECT metadata->>'forced' as forced
FROM app_events
WHERE event_type = 'calendar_move'
ORDER BY created_at DESC
LIMIT 1;
-- Doit retourner: "true"
```

---

### 5. Statut Bloqué

**Objectif :** Missions validées/terminées/annulées non déplaçables

- [ ] Tenter déplacer mission status = 'valide'
- [ ] Tenter déplacer mission status = 'termine'
- [ ] Tenter déplacer mission status = 'annule'
- [ ] **Résultat attendu :**
  - ❌ Impossible de drag (curseur not-allowed)
  - Ou erreur "Cette mission ne peut pas être déplacée"

---

### 6. Permissions Tech

**Objectif :** Tech ne peut déplacer que ses missions

**Rôle testé :** Tech

- [ ] Tech A essaie déplacer mission assignée à Tech B
- [ ] **Résultat attendu :**
  - ❌ Erreur "Vous n'avez pas les droits"
  - Mission reste immobile

- [ ] Tech A essaie changer assignee de sa propre mission
- [ ] **Résultat attendu :**
  - ❌ Erreur "Not allowed to reassign"

---

### 7. Fuseau Europe/Paris

**Objectif :** Pas de drift horaire (DST safe)

- [ ] Déplacer mission à 14:00 Paris Time
- [ ] Recharger page
- [ ] **Résultat attendu :** Heure affichée = 14:00 (pas 15:00 ou 13:00)

**SQL Check :**
```sql
SELECT scheduled_start AT TIME ZONE 'Europe/Paris' as paris_time
FROM missions
WHERE id = 'mission-uuid';
-- Doit être 14:00
```

---

### 8. Month View → Autre Jour

**Objectif :** Slot par défaut appliqué (08:00-09:00)

**Vue :** Month View

- [ ] Glisser mission du 10 vers le 15
- [ ] **Résultat attendu :**
  - Mission le 15 à 08:00-09:00 (slot défaut)
  - Pas de conservation heure originale

**Config :**
```typescript
// src/config/businessHours.ts
defaultSlotStart: 8,
defaultSlotDuration: 60,
```

---

### 9. Week-end Interdit

**Objectif :** Garde-fou samedi/dimanche

- [ ] Essayer déplacer mission sur samedi
- [ ] **Résultat attendu :**
  - ❌ Erreur "Week-end interdit"
  - Toast suggère Alt pour forcer

- [ ] Même test avec **Alt maintenu**
- [ ] **Résultat attendu (Admin/SAL uniquement) :**
  - ✅ Mission déplacée (force override)

---

### 10. Horaires Ouvrés

**Objectif :** Bornes 07h-20h

- [ ] Essayer déplacer mission à 06:00
- [ ] Essayer déplacer mission à 21:00
- [ ] **Résultat attendu :**
  - ❌ Erreur "Hors horaires ouvrés"

- [ ] Même tests avec **Alt** (Admin/SAL)
- [ ] **Résultat attendu :**
  - ✅ Accepté (force override)

---

## 🩹 MESSAGES D'ERREURS

**Vérifier que les messages sont clairs :**

| Erreur SQL | Message UI Friendly |
|-----------|---------------------|
| `Conflict detected` | "Conflit de planning avec une autre mission." |
| `Not allowed to move` | "Vous n'avez pas les droits pour déplacer cette mission." |
| `Weekend not allowed` | "Week-end interdit (maintenez Alt pour forcer si besoin)." |
| `Outside business hours` | "Hors horaires ouvrés (Alt pour forcer)." |
| `Cannot move mission with status` | "Cette mission ne peut pas être déplacée (statut bloqué)." |

---

## 📊 LOGS & ANALYTICS

### Vérifier App Events

```sql
-- Tous les moves des 24h
SELECT
  created_at,
  metadata->>'mission_id' as mission,
  metadata->>'source' as view,
  metadata->>'forced' as forced,
  metadata->>'conflict_count' as conflicts
FROM app_events
WHERE event_type = 'calendar_move'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

**Champs attendus :**
- `mission_id` (uuid)
- `start` / `end` (timestamptz)
- `assignee_id` (uuid)
- `source` (week/month/day/resource)
- `forced` (boolean)
- `conflict_count` (integer)
- `moved_by` (user uuid)

---

## 🔍 TESTS PAR RÔLE

### Admin

- [ ] Peut déplacer n'importe quelle mission
- [ ] Peut changer assignee (cross-resource)
- [ ] Alt+Drop force les conflits
- [ ] Alt+Drop contourne week-end/horaires

### SAL

- [ ] Idem qu'Admin (mêmes droits)

### Tech

- [ ] Peut déplacer SEULEMENT ses missions
- [ ] **NE PEUT PAS** changer assignee
- [ ] **NE PEUT PAS** forcer (Alt ignoré)
- [ ] Erreur claire si tente mission d'autrui

### Client

- [ ] **AUCUN** accès au drag & drop
- [ ] Calendrier en lecture seule

---

## 🎨 UX VALIDATION

### Feedback Visuel

- [ ] Pendant drag: ghost preview visible
- [ ] Pendant save: overlay loading + spinner
- [ ] Succès: mission se positionne smoothly
- [ ] Erreur: rollback instantané + toast

### Performance

- [ ] Drag smooth (pas de lag)
- [ ] Save < 500ms (network normal)
- [ ] Rollback instantané si erreur

---

## 🧪 TEST MATRIX (Résumé)

| Test | Week | Day | Month | Resource | Tech |
|------|------|-----|-------|----------|------|
| Déplacement simple | ☐ | ☐ | ☐ | ☐ | ☐ |
| Cross-resource | ☐ | ☐ | ❌ | ☐ | ❌ |
| Conflit | ☐ | ☐ | ☐ | ☐ | ☐ |
| Force (Alt) | ☐ | ☐ | ☐ | ☐ | ☐ |
| Statut bloqué | ☐ | ☐ | ☐ | ☐ | ☐ |
| Permissions | ☐ | ☐ | ☐ | ☐ | ☐ |
| Fuseau Paris | ☐ | ☐ | ☐ | ☐ | ☐ |
| Slot défaut | ❌ | ❌ | ☐ | ❌ | ❌ |
| Week-end | ☐ | ☐ | ☐ | ☐ | ☐ |
| Horaires | ☐ | ☐ | ☐ | ☐ | ☐ |

**Légende :**
- ☐ = À tester
- ✅ = Validé
- ❌ = Non applicable

---

## 🚨 BUGS CRITIQUES (BLOQUANTS)

Si vous rencontrez un de ces bugs, **STOP** et corrigez avant prod :

1. **Mission disparaît après drop** → Rollback cassé
2. **Conflit non détecté** → Double booking possible
3. **Tech peut déplacer missions d'autrui** → Faille sécurité
4. **Alt ne force pas (Admin)** → Feature manquante
5. **Décalage horaire après reload** → Fuseau incorrect

---

## ✅ VALIDATION FINALE

**Pour passer en prod, tous ces points DOIVENT être ✅ :**

- [ ] 5 vues testées (50 checks minimum)
- [ ] 0 bug critique
- [ ] Messages d'erreur clairs
- [ ] Logs app_events corrects
- [ ] Permissions respectées (admin/sal/tech)
- [ ] Fuseau Europe/Paris validé
- [ ] Force move (Alt) fonctionne
- [ ] Rollback visuel garanti

---

## 📝 RAPPORT DE TEST

**Testeur :** _________________
**Date :** _________________
**Environnement :** Staging / Prod

**Résumé :**
- Tests réussis : __ / 50
- Bugs trouvés : __
- Bugs critiques : __

**Décision :**
- [ ] ✅ GO PROD
- [ ] ⚠️ GO avec réserves (préciser)
- [ ] ❌ NO GO (corriger bugs)

**Commentaires :**
```
[Notes additionnelles]
```

---

## 🔗 LIENS UTILES

- Code: `src/components/calendar/useMissionDragDrop.ts`
- RPC SQL: `supabase/migrations/20251022170000_create_move_mission_rpc.sql`
- Config: `src/config/businessHours.ts`
- Utils: `src/lib/timezoneUtils.ts`
- Doc: `docs/calendar-drag-drop.md`

---

**Créé :** 2025-10-22
**Version :** 1.0
**Status :** ✅ Prêt pour QA
