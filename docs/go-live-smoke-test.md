# 🚦 Smoke Test Post-Déploiement

**Durée:** 10 minutes
**Timing:** Immédiatement après déploiement
**Objectif:** Valider les fonctionnalités critiques en production

---

## ✅ ÉTAPE 1: ACCUEIL ADMIN (2 min)

### Test 1.1: Navigation deep links

**URL:** `https://your-app.com/admin`

**Actions:**
1. Cliquer **"Impayés"**
   - ✅ Redirige vers `/admin/comptabilite/invoices?status=overdue`
   - ✅ Liste affiche factures avec `payment_status='en_retard'` OU état vide propre
   - ✅ Badge rouge "Impayée" visible (si données)

2. Cliquer **"Devis à valider"**
   - ✅ Redirige vers `/admin/comptabilite/quotes?status=awaiting_approval`
   - ✅ Liste affiche devis `status='en_attente_validation'` OU état vide
   - ✅ Badge jaune "En attente" visible (si données)

3. Vérifier **KPIs affichés:**
   - ✅ Missions du jour: nombre affiché (peut être 0)
   - ✅ Offres en attente: nombre affiché
   - ✅ Urgences: nombre affiché

**Critère de succès:**
- ✅ Aucune erreur 404
- ✅ Aucune erreur JS console
- ✅ URLs stables (pas de redirect intempestif)

---

## ✅ ÉTAPE 2: COMPTABILITÉ (3 min)

### Test 2.1: Filtres factures

**URL:** `/admin/comptabilite/invoices`

**Actions:**
1. Cliquer filtre **"Ouvertes"**
   - ✅ URL devient `?status=open`
   - ✅ Liste se rafraîchit
   - ✅ Bouton "Ouvertes" devient bleu (actif)

2. Cliquer filtre **"Impayées"**
   - ✅ URL devient `?status=overdue`
   - ✅ Liste montre uniquement impayées (si données)
   - ✅ Alerte rouge en bas si > 0 factures

3. Cliquer filtre **"Payées"**
   - ✅ URL devient `?status=closed`
   - ✅ Liste montre uniquement payées

4. Changer tri: **"Date échéance ↑"**
   - ✅ URL devient `?status=closed&sort=date_asc`
   - ✅ Ordre change (la plus proche en premier)

**Console Network:**
```javascript
// Vérifier requête SQL
// Doit contenir: WHERE payment_status IN ('paye', 'payé')
// PAS d'erreur "invalid input value for enum"
```

### Test 2.2: Filtres devis

**URL:** `/admin/comptabilite/quotes`

**Actions:**
1. Cliquer **"En attente"**
   - ✅ URL devient `?status=awaiting_approval`
   - ✅ Liste filtrée
   - ✅ Alerte jaune si > 0 devis

2. Recherche par numéro: taper "DEV"
   - ✅ Filtrage instantané (côté client)
   - ✅ Pas de requête SQL supplémentaire

**Critère de succès:**
- ✅ Tous les filtres fonctionnent
- ✅ URL se met à jour à chaque changement
- ✅ Pas d'erreur enum dans console
- ✅ État vide affiche message approprié

---

## ✅ ÉTAPE 3: LOGISTIQUE (2 min)

### Test 3.1: Stock bas

**URL:** `/admin/logistique/stock?filter=low`

**Actions:**
1. Vérifier liste affichée
   - ✅ Items avec `quantity < min_qty_alert` OU état vide
   - ✅ Badge orange "Stock faible"

2. Cliquer **"Entrée stock"** (ou `?action=entry`)
   - ✅ Modal s'ouvre
   - ✅ Formulaire champs visibles: item, qty, source

3. Annuler modal
   - ✅ Modal se ferme
   - ✅ URL revient à `/admin/logistique/stock?filter=low`

**Critère de succès:**
- ✅ Filtres fonctionnent
- ✅ Actions modales s'ouvrent
- ✅ Pas d'erreur RLS (admin peut tout voir)

---

## ✅ ÉTAPE 4: OFFRES & URGENCES (2 min)

### Test 4.1: Offres

**URL:** `/admin/offers?filter=available`

**Actions:**
1. Vérifier liste offres disponibles
   - ✅ Missions avec `is_available=true` OU état vide
   - ✅ Bouton "Assigner" visible (si données)

2. Changer filtre: **"Assignées"**
   - ✅ URL devient `?filter=assigned`
   - ✅ Liste montre missions assignées

### Test 4.2: Urgences

**URL:** `/admin/emergency?status=open`

**Actions:**
1. Vérifier liste urgences ouvertes
   - ✅ Urgences `status='open'` OU état vide
   - ✅ Badges priorité (rouge=critical, orange=urgent)

2. Tester filtre combiné:
   - ✅ Ajouter `&priority=high` dans URL
   - ✅ Liste se filtre sur open + high
   - ✅ Compteur mis à jour

**Critère de succès:**
- ✅ Filtres simples + combinés fonctionnent
- ✅ URLs bookmarkables (copier-coller URL = même résultat)
- ✅ Pas d'erreur 403 pour admin

---

## ✅ ÉTAPE 5: RLS SPOT-CHECK (1 min)

### Test 5.1: Compte Tech (si disponible)

**Se connecter en tant que tech:**

**URL:** `/tech/missions`

**Actions:**
1. Vérifier liste missions
   - ✅ Voit uniquement ses missions (`assigned_user_id = current_user`)
   - ✅ Ne voit PAS les missions d'autres techs

2. Essayer accès factures:
   - **URL:** `/admin/comptabilite/invoices`
   - ✅ 403 Forbidden OU Redirection vers `/forbidden`
   - ✅ Pas d'accès à la comptabilité

### Test 5.2: Compte Client (si disponible)

**Se connecter en tant que client:**

**URL:** `/client/invoices`

**Actions:**
1. Vérifier liste factures
   - ✅ Voit uniquement ses factures (`client_id = current_user`)
   - ✅ Ne voit PAS les factures d'autres clients

2. Essayer accès admin:
   - **URL:** `/admin`
   - ✅ 403 Forbidden OU Redirection vers `/forbidden`

**Critère de succès:**
- ✅ Isolation des données par rôle
- ✅ Pas de fuite de données (vérifier console Network)
- ✅ Redirections sécurisées

---

## 🧯 FILETS DE SÉCURITÉ (30 min après go-live)

### Monitoring actif

**Console navigateur (F12):**
```javascript
// Doit être propre (pas d'erreurs rouges)
// Warnings acceptables: Sourcemap, caniuse-lite

// Erreurs BLOQUANTES à surveiller:
// ❌ "invalid input value for enum"
// ❌ "permission denied for table"
// ❌ "Failed to fetch"
```

**Sentry / Error tracking:**
```bash
# Vérifier dashboard Sentry (si activé)
# Pas d'erreurs > 5/min
# Pas d'erreur critique (500, crash)
```

### Alertes DB

**Exécuter checks:**
```sql
-- Vérifier vue stock_negative (doit être vide)
SELECT * FROM stock_negative;
-- Attendu: 0 rows

-- Vérifier alertes critiques
SELECT * FROM run_all_alert_checks();
-- Attendu: alerts détectées mais gérées
```

### Performance

**Lighthouse (optionnel mais recommandé):**
```bash
# Chrome DevTools > Lighthouse > Run
# Targets:
# - Performance: > 70
# - Accessibility: > 90
# - Best Practices: > 80
```

---

## 📊 TABLEAU DE BORD (résultat smoke test)

| Test | Status | Notes |
|------|--------|-------|
| Accueil deep links (5) | ☐ PASS / ☐ FAIL | |
| Filtres factures | ☐ PASS / ☐ FAIL | |
| Filtres devis | ☐ PASS / ☐ FAIL | |
| Stock + actions | ☐ PASS / ☐ FAIL | |
| Offres + urgences | ☐ PASS / ☐ FAIL | |
| RLS Tech | ☐ PASS / ☐ FAIL / ☐ SKIP | |
| RLS Client | ☐ PASS / ☐ FAIL / ☐ SKIP | |
| Console propre | ☐ PASS / ☐ FAIL | |
| Sentry clean | ☐ PASS / ☐ FAIL / ☐ N/A | |

**Décision:**
- ✅ **7+ PASS:** GO confirmé, monitoring 30 min
- ⚠️ **5-6 PASS:** GO avec alerte, investiguer fails rapides
- 🔴 **< 5 PASS:** NO-GO, rollback + debug

---

## 🚨 PROCÉDURE SI ERREUR CRITIQUE

### 1. Identifier le scope

```bash
# Erreur isolée (1 page) ?
→ Désactiver feature flag si applicable
→ Continuer monitoring

# Erreur généralisée (toute l'app) ?
→ Rollback immédiat
```

### 2. Rollback rapide

```bash
# Vercel
vercel rollback

# Netlify
netlify rollback

# Custom
cd /var/www/app-backup-N-1
rsync -avz ./ /var/www/app/
systemctl restart nginx
```

### 3. Notification

```
# Slack / Email équipe:
🔴 Rollback effectué à [timestamp]
Raison: [erreur critique]
Status: En investigation
ETA fix: [estimation]
```

---

## ✅ VALIDATION FINALE

**Après 30 min en prod sans erreur:**

- [ ] ✅ Tous les smoke tests PASS
- [ ] ✅ Console propre (pas d'erreur critique)
- [ ] ✅ RLS fonctionne (admin/tech/client séparés)
- [ ] ✅ Deep links stables
- [ ] ✅ Aucune alerte DB critique
- [ ] ✅ Sentry clean (< 5 erreurs/min)

**Si tous ✅ → GO-LIVE CONFIRMÉ ! 🎉**

**Passer à:** Monitoring étendu 24h (logs, usage, performance)

---

## 📋 NOTES & OBSERVATIONS

**Timestamp:** `__________`

**Testeur:** `__________`

**Observations:**
```
[Notes libres sur anomalies non bloquantes, suggestions, etc.]
```

**Prochaines actions:**
```
[ ] Créer issues pour bugs mineurs détectés
[ ] Documenter workarounds temporaires
[ ] Planifier optimisations (phase 19)
```

---

**Durée réelle smoke test:** `________ min`

**Status final:** ✅ PASS / ⚠️ CONDITIONNEL / 🔴 FAIL
