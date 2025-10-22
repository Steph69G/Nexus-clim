# 🔥 HOTFIX - AdminHome Enum Fix

**Date:** 2025-10-22
**Priorité:** CRITIQUE
**Status:** ✅ CORRIGÉ

---

## 🐛 PROBLÈME DÉTECTÉ

**Erreur console:**
```
HEAD .../quotes?status=eq.awaiting_approval 400 (Bad Request)
HEAD .../invoices?payment_status=eq.overdue 400 (Bad Request)
```

**Root cause:**
Page `AdminHome.tsx` utilisait enums EN (`overdue`, `awaiting_approval`) au lieu des enums FR de la BDD (`en_retard`, `en_attente_validation`).

---

## ✅ FIX APPLIQUÉ

**Fichier modifié:** `src/pages/admin/AdminHome.tsx`

**Lignes 87-95:**

### Avant (CASSÉ)
```typescript
supabase
  .from('invoices')
  .select('id', { count: 'exact', head: true })
  .eq('payment_status', 'overdue'),  // ❌ Enum EN

supabase
  .from('quotes')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'awaiting_approval'),  // ❌ Enum EN
```

### Après (FIXÉ)
```typescript
supabase
  .from('invoices')
  .select('id', { count: 'exact', head: true })
  .eq('payment_status', 'en_retard'),  // ✅ Enum FR

supabase
  .from('quotes')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'en_attente_validation'),  // ✅ Enum FR
```

---

## 🎯 IMPACT

**Avant:**
- ❌ Compteurs Accueil cassés (toujours 0)
- ❌ Erreurs 400 dans console
- ❌ Chips "Impayés" et "Devis à valider" non fonctionnels

**Après:**
- ✅ Compteurs fonctionnels
- ✅ Pas d'erreur console
- ✅ Chips Accueil cliquables et précis

---

## ✅ VALIDATION

```bash
npm run build
# ✓ built in 8.49s
# ✓ 414.48 KB gzipped
# ✓ 0 erreurs
```

**Test rapide:**
```typescript
// Doit retourner count correct
const { count } = await supabase
  .from('invoices')
  .select('id', { count: 'exact', head: true })
  .eq('payment_status', 'en_retard');

console.log('Factures en retard:', count);
```

---

## 📋 CHECKLIST

- [x] Fix appliqué (AdminHome.tsx)
- [x] Build validé
- [x] Vérification autres fichiers (aucun autre usage)
- [x] Documentation mise à jour

---

## 🚀 DÉPLOIEMENT

**Ce hotfix DOIT être déployé avec le go-live Phase 18.**

Aucun déploiement séparé requis, il fait partie du même build.

---

## 📝 LEÇONS APPRISES

**Pourquoi ce bug ?**
- AdminHome fait des requêtes HEAD directes (compteurs)
- N'utilise pas le pattern URL filters des autres pages
- Pas détecté au build (pas d'erreur TypeScript)
- Détecté uniquement en runtime

**Prévention future (Phase 19):**
1. Centraliser TOUS les appels enums via `statusMaps.ts`
2. Créer helpers type-safe:
   ```typescript
   // Futur pattern
   import { getDbStatus } from '@/lib/statusMaps';

   const dbStatus = getDbStatus('invoice', 'overdue'); // → 'en_retard'
   query.eq('payment_status', dbStatus);
   ```
3. Tests E2E pour valider compteurs Accueil

---

**Hotfix appliqué:** 2025-10-22
**Build validé:** ✅
**Status:** PRÊT POUR GO-LIVE
