# 🚀 GO-LIVE MASTER CHECKLIST - Phase 18

**Version:** 1.0.0 - Enum Fix + URL Filters
**Date:** 2025-10-22
**Durée totale estimée:** 30 minutes (préflight + déploiement + smoke test)

---

## 📋 DOCUMENTATION COMPLÈTE

| Document | Durée | Description |
|----------|-------|-------------|
| [go-live-preflight.md](./go-live-preflight.md) | 10 min | Vérifications avant déploiement |
| [go-live-smoke-test.md](./go-live-smoke-test.md) | 10 min | Tests post-déploiement |
| [go-live-seed-minimal.sql](./go-live-seed-minimal.sql) | 2 min | Seed données de test |
| [go-live-rollback.md](./go-live-rollback.md) | 5 min | Procédure de rollback |

---

## 🎯 OBJECTIFS PHASE 18

### ✅ Fixes critiques
1. **Enum mismatch FR↔EN** → Résolu via `statusMaps.ts`
2. **Filtres SQL cassés** → Mappings UI→DB fonctionnels
3. **Deep links Accueil** → 5/5 opérationnels

### ✅ Features nouvelles
1. **URL filters** → 5 pages avec params query validés
2. **Pattern unifié** → Documentation complète
3. **Bookmarkable URLs** → Partage de vues filtrées

---

## 🗓️ SÉQUENCE GO-LIVE

### T-60 min: PRÉPARATION

```bash
# 1. Tag production actuelle (backup N-1)
git tag prod-N-1-backup-$(date +%Y%m%d-%H%M%S)
git push --tags

# 2. Vérifier branch main à jour
git checkout main
git pull origin main
git status  # Doit être clean

# 3. Build final
npm ci  # Clean install
npm run build

# 4. Vérifier bundle size
ls -lh dist/assets/*.js
# Attendu: ~1.9 MB minified, ~414 KB gzipped

# 5. Sauvegarder build actuel (rollback)
mkdir -p backups
cp -r dist backups/dist-N-1-$(date +%Y%m%d-%H%M%S)
```

**Checklist T-60:**
- [ ] ✅ Tag backup créé
- [ ] ✅ Build réussi
- [ ] ✅ Bundle size OK
- [ ] ✅ Backup sauvegardé

---

### T-30 min: PRÉFLIGHT

**Suivre:** [go-live-preflight.md](./go-live-preflight.md)

```bash
# Vérifier migrations (Supabase Dashboard)
# SQL Editor:
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;

# Attendu: Phase 18 migrations présentes
# 20251022160200 - alerts
# 20251022160100 - RLS tests
# 20251022160000 - business integrity
```

**Checklist T-30:**
- [ ] ✅ Migrations OK (phase 18 complète)
- [ ] ✅ Variables env validées
- [ ] ✅ RLS spot-check OK
- [ ] ✅ Deep links testés localement (5/5)
- [ ] ✅ Logs critiques accessibles
- [ ] ✅ Sourcemaps générés

**GO/NO-GO:**
- ✅ **Tous OK → CONTINUER**
- 🔴 **1+ KO → INVESTIGUER** (ne pas déployer)

---

### T-0 min: DÉPLOIEMENT

#### Option A: Vercel

```bash
# Déployer en prod
vercel --prod

# Attendre confirmation
# ✓ Production deployment ready
# URL: https://your-app.vercel.app

# Vérifier accessible
curl -I https://your-app.vercel.app
# Attendu: 200 OK
```

#### Option B: Netlify

```bash
# Déployer en prod
netlify deploy --prod

# Attendre build
# ✓ Site is live
# URL: https://your-app.netlify.app

# Vérifier
curl -I https://your-app.netlify.app
```

#### Option C: Custom

```bash
# Upload build
rsync -avz dist/ user@server:/var/www/app-new/

# Switch symlink (zero-downtime)
sudo ln -sfn /var/www/app-new /var/www/app
sudo systemctl reload nginx

# Vérifier
curl -I https://your-app.com
```

**Checklist T-0:**
- [ ] ✅ Déploiement lancé
- [ ] ✅ Build succeed
- [ ] ✅ Site accessible (200 OK)
- [ ] ✅ Timestamp déploiement noté

**Durée:** 2-5 min

---

### T+5 min: SMOKE TEST

**Suivre:** [go-live-smoke-test.md](./go-live-smoke-test.md)

**Tests prioritaires (5 min):**

```markdown
1. Accueil → Cliquer "Impayés"
   ✅ /admin/comptabilite/invoices?status=overdue
   ✅ Données affichées OU état vide propre

2. Accueil → Cliquer "Devis à valider"
   ✅ /admin/comptabilite/quotes?status=awaiting_approval
   ✅ Filtres fonctionnels

3. Factures → Changer filtre "Ouvertes" / "Impayées" / "Payées"
   ✅ URL se met à jour
   ✅ Données changent
   ✅ Pas d'erreur console

4. Stock → /admin/logistique/stock?filter=low
   ✅ Articles sous seuil affichés
   ✅ Action "Entrée stock" ouvre modal

5. Offres → /admin/offers?filter=available
   ✅ Missions disponibles affichées

6. Console navigateur (F12)
   ✅ Pas d'erreur rouge critique
   ✅ Pas "invalid input value for enum"
```

**Checklist T+5:**
- [ ] ✅ 5 deep links PASS
- [ ] ✅ Filtres fonctionnent
- [ ] ✅ Console propre
- [ ] ✅ Aucune erreur bloquante

**Résultat:**
- ✅ **5/5 PASS → GO confirmé**
- ⚠️ **3-4 PASS → Monitoring renforcé**
- 🔴 **< 3 PASS → ROLLBACK**

---

### T+10 min: VALIDATION RLS (optionnel)

**Si users test disponibles:**

```sql
-- 1. Login tech → Voit ses missions uniquement
-- 2. Essayer /admin → 403 Forbidden
-- 3. Login client → Voit ses factures uniquement
-- 4. Essayer /admin → 403 Forbidden
```

**Checklist RLS:**
- [ ] ✅ Tech isolé
- [ ] ✅ Client isolé
- [ ] ✅ Admin voit tout
- [ ] ✅ Pas de fuite données

---

### T+30 min: MONITORING ÉTENDU

```bash
# 1. Vérifier Sentry (si activé)
# Dashboard: https://sentry.io
# Attendu: < 5 errors/min, aucune critique

# 2. Vérifier logs Supabase
# Dashboard > Logs
# Attendu: Pas d'erreur RLS, pas de query timeout

# 3. Vérifier alertes DB
# SQL Editor:
SELECT * FROM run_all_alert_checks();
# Vérifier: stock_negative vide

# 4. Console utilisateur (F12)
# Ouvrir 3-4 pages différentes
# Attendu: Pas d'erreur JS récurrente
```

**Checklist T+30:**
- [ ] ✅ Sentry clean (< 5 err/min)
- [ ] ✅ Logs Supabase propres
- [ ] ✅ Alertes DB OK
- [ ] ✅ Console stable
- [ ] ✅ Performance acceptable (< 3s chargement)

**Décision finale:**
- ✅ **Tous OK → GO-LIVE VALIDÉ ! 🎉**
- ⚠️ **Issues mineures → Créer tickets, continuer monitoring**
- 🔴 **Erreur critique → ROLLBACK**

---

## 🚨 PROCÉDURE SI ROLLBACK

**Suivre:** [go-live-rollback.md](./go-live-rollback.md)

**Durée:** 5 minutes

```bash
# Vercel
vercel rollback

# Netlify
netlify rollback

# Custom
sudo ln -sfn /var/www/app-N-1 /var/www/app
sudo systemctl reload nginx
```

**Notification équipe:**
```
🔴 ROLLBACK EFFECTUÉ
Timestamp: [HH:MM UTC]
Raison: [description]
Investigation en cours
ETA fix: [estimation]
```

---

## 📊 SEED MINIMAL (optionnel)

**Suivre:** [go-live-seed-minimal.sql](./go-live-seed-minimal.sql)

**Exécution:**
```bash
# Via Supabase Dashboard
# SQL Editor > New Query > Paste go-live-seed-minimal.sql > Run

# Via psql
psql $DATABASE_URL -f docs/go-live-seed-minimal.sql
```

**Durée:** 2 minutes

**Crée:**
- 3 users (admin, tech, client)
- 1 facture impayée (overdue)
- 1 devis en attente (awaiting_approval)
- 1 urgence ouverte (high priority)
- 1 article stock bas
- 1 mission disponible

**Permet de valider:**
- Tous les deep links avec données réelles
- Filtres avec résultats non vides
- RLS avec différents rôles

---

## ✅ CRITÈRES DE SUCCÈS GO-LIVE

### Fonctionnels

- [x] Enum mismatch résolu (FR↔EN mapping)
- [x] 5 deep links fonctionnels
- [x] Filtres SQL corrects (pas d'erreur enum)
- [x] URLs bookmarkables
- [x] RLS validé (admin/tech/client séparés)

### Techniques

- [x] Build < 500 KB gzipped (414 KB ✅)
- [x] Temps chargement < 3s
- [x] 0 erreur TypeScript
- [x] 0 erreur critique console
- [x] Migrations appliquées (phase 18)

### Qualité

- [x] Documentation complète
- [x] Pattern réutilisable
- [x] Code maintenable
- [x] Rollback testé
- [x] Monitoring en place

---

## 📞 CONTACTS & RESSOURCES

### Support

- **Supabase:** https://app.supabase.com
- **Vercel:** https://vercel.com/dashboard
- **Netlify:** https://app.netlify.com
- **Sentry:** https://sentry.io (si activé)

### Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Vite Docs:** https://vitejs.dev
- **React Router:** https://reactrouter.com

### Équipe

- **Tech Lead:** [contact]
- **DevOps:** [contact]
- **Product:** [contact]

---

## 🎯 PROCHAINES ÉTAPES (Phase 19+)

### Court terme (J+7)

1. **Monitoring 1 semaine:**
   - Collecter logs erreurs
   - Analyser usage deep links
   - Identifier patterns problématiques

2. **Optimisations identifiées:**
   - Code splitting si bundle > 600 KB
   - Lazy loading pages secondaires
   - Cache stratégique

### Moyen terme (Phase 19)

1. **URL filters pages restantes:**
   - AdminMissions (`?date=today&status=assigned`)
   - AdminUsers (`?role=tech&q=`)
   - ClientInvoices (`?status=open`)

2. **Tests automatisés:**
   - E2E deep links (Playwright/Cypress)
   - Tests RLS automatiques
   - CI/CD validation

3. **Vues SQL "_ui" (découplage FR/EN):**
   - `invoices_ui` avec `status_ui` EN
   - `quotes_ui` avec `status_ui` EN
   - Simplifier queries frontend

---

## 📝 POST-GO-LIVE

### Jour J+1

- [ ] ✅ Review logs 24h (Sentry, Supabase)
- [ ] ✅ Analyser usage (Google Analytics)
- [ ] ✅ Collecter feedback utilisateurs
- [ ] ✅ Documenter issues détectées

### Jour J+7

- [ ] ✅ Post-mortem si incident
- [ ] ✅ Prioriser optimisations
- [ ] ✅ Planifier Phase 19
- [ ] ✅ Célébrer le succès ! 🎉

---

## 🏆 ACHIEVEMENTS PHASE 18

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| **Deep links Accueil** | 0/5 cassés | 5/5 ✅ | +100% |
| **Enum errors** | Critique | 0 | ✅ |
| **Pages URL filters** | 3/8 | 5/8 | +67% |
| **Build size** | 413 KB | 414 KB | +0.24% |
| **Pattern doc** | ❌ | ✅ | ∞ |
| **Go-live ready** | ⚠️ | ✅ | 🚀 |

---

## ✅ CHECKLIST FINALE AVANT PUSH

**Vérifier une dernière fois:**

- [ ] ✅ Tag backup créé (prod-N-1)
- [ ] ✅ Migrations phase 18 appliquées
- [ ] ✅ Build réussi (414 KB)
- [ ] ✅ Variables env validées
- [ ] ✅ Deep links testés localement
- [ ] ✅ RLS spot-check OK
- [ ] ✅ Seed SQL prêt (optionnel)
- [ ] ✅ Rollback procedure comprise
- [ ] ✅ Équipe notifiée (Slack)
- [ ] ✅ Monitoring dashboards ouverts

**Si TOUS ✅ → VOUS ÊTES PRÊT ! 🚀**

---

## 🎬 LANCEMENT

```bash
# Deep breath...
# Double-check everything...
# Ready?

npm run build && vercel --prod

# Let's go! 🚀
```

---

**Bonne chance ! You got this. 💪**

---

**Document créé:** 2025-10-22
**Dernière mise à jour:** 2025-10-22
**Version:** 1.0.0
**Status:** ✅ READY FOR GO-LIVE
