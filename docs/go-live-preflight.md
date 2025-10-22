# 🚀 Go-Live Preflight Checklist

**Date:** 2025-10-22
**Durée estimée:** 10 minutes
**Statut:** Phase 18 - Enum fix + URL filters

---

## ✅ PRÉFLIGHT AUTOMATISÉ

### 1. Migrations DB (Critique)

```bash
# Vérifier que toutes les migrations sont appliquées
echo "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;" | psql $DATABASE_URL
```

**Attendu:**
```
20251022160200  ← Phase 18 alerts
20251022160100  ← Phase 18 RLS tests
20251022160000  ← Phase 18 business integrity
20251022152933  ← Vehicles
20251022150032  ← Intervention reports
```

**Action si KO:** Appliquer migrations manquantes via Supabase Dashboard

---

### 2. Variables d'environnement

```bash
# Vérifier .env.local (staging/prod)
cat .env.local | grep -E "VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY|VITE_GOOGLE_MAPS_API_KEY"
```

**Checklist:**
- [ ] `VITE_SUPABASE_URL` = URL projet Supabase
- [ ] `VITE_SUPABASE_ANON_KEY` = Anon key valide
- [ ] `VITE_GOOGLE_MAPS_API_KEY` = Key Maps valide (optionnel)
- [ ] `VITE_SENTRY_DSN` = Configuré si monitoring actif

**SPF/DKIM/DMARC (emails):**
```bash
# Vérifier DNS (si emails activés)
dig TXT yourdomain.com | grep -E "spf|dkim|dmarc"
```

---

### 3. Build final

```bash
# Build production + vérification taille
npm run build

# Vérifier bundle size
ls -lh dist/assets/*.js | awk '{print $5, $9}'
```

**Attendu:**
```
✓ Built in ~9s
✓ Bundle: ~414 KB gzipped
✓ 0 TypeScript errors
✓ 0 runtime errors
```

**Seuils critiques:**
- ❌ Bundle > 600 KB → Investiguer code splitting
- ⚠️ Build > 15s → Vérifier config Vite

---

### 4. RLS & Permissions (Spot Check)

```sql
-- Test 1: Admin voit tout
SET request.jwt.claims TO '{"sub": "admin-uuid", "role": "admin"}';
SELECT COUNT(*) FROM missions;  -- Doit retourner toutes les missions

-- Test 2: Tech voit ses missions uniquement
SET request.jwt.claims TO '{"sub": "tech-uuid", "role": "tech"}';
SELECT COUNT(*) FROM missions WHERE assigned_user_id = 'tech-uuid';  -- OK
SELECT COUNT(*) FROM invoices;  -- Doit être 0 ou erreur

-- Test 3: Client voit ses données uniquement
SET request.jwt.claims TO '{"sub": "client-uuid", "role": "client"}';
SELECT COUNT(*) FROM invoices WHERE client_id = 'client-uuid';  -- OK
SELECT COUNT(*) FROM missions;  -- Doit être 0 (sauf ses propres demandes)
```

**Action si KO:** Vérifier policies RLS dans les migrations phase 18

---

### 5. Deep Links Accueil (5/5)

```bash
# Test local avant déploiement
npm run dev

# Ouvrir dans navigateur et tester manuellement:
```

| Link | URL | Attendu |
|------|-----|---------|
| Impayés | `/admin/comptabilite/invoices?status=overdue` | Factures en_retard |
| Devis à valider | `/admin/comptabilite/quotes?status=awaiting_approval` | Devis en attente |
| Stock bas | `/admin/logistique/stock?filter=low` | Items < min_qty_alert |
| Offres | `/admin/offers?filter=available` | Missions is_available=true |
| Urgences | `/admin/emergency?status=open` | Urgences ouvertes |

**Validation:** Chaque link doit:
1. Afficher des données (si seed présent) OU état vide propre
2. URL reste stable (pas de redirect/404)
3. Filtres cliquables mettent à jour l'URL

---

### 6. Logs critiques (app_events)

```sql
-- Vérifier que la table app_events écrit bien
SELECT event_type, COUNT(*)
FROM app_events
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type;
```

**Attendu (si activité):**
```
mission_created        | 5
invoice_sent           | 2
emergency_created      | 1
```

**Action si vide:** Normal si pas de seed, vérifier triggers après go-live

---

### 7. Sourcemaps & Monitoring

```bash
# Vérifier sourcemaps générés
ls dist/assets/*.js.map
```

**Attendu:**
```
index-B4XyqW7Z.js.map  ← Sourcemap présent
```

**Sentry (si activé):**
```javascript
// Tester erreur factice en dev
throw new Error('[TEST] Sentry test error');
// Doit apparaître dans Sentry dashboard sous 30s
```

---

## 🎯 RÉSULTAT PRÉFLIGHT

### ✅ GO / 🔴 NO-GO Decision Tree

```
✅ Migrations OK + Build OK + RLS OK + Deep links OK
   → GO-LIVE ✅

⚠️ Migrations OK + Build OK + RLS OK + Deep links partiels
   → GO avec monitoring renforcé ⚠️

🔴 Migrations KO OU Build KO OU RLS fail
   → NO-GO - Investiguer 🔴
```

---

## 📋 CHECKLIST FINALE

Avant de déployer, cocher:

- [ ] ✅ Toutes les migrations appliquées (phase 18 incluse)
- [ ] ✅ Variables d'env validées (URL, keys)
- [ ] ✅ Build réussi (~414 KB)
- [ ] ✅ RLS testé (admin/tech/client)
- [ ] ✅ 5 deep links testés localement
- [ ] ✅ app_events table existe et est accessible
- [ ] ✅ Sourcemaps générés
- [ ] ✅ Tag Git créé: `git tag prod-vX.Y.Z && git push --tags`
- [ ] ✅ Build N-1 sauvegardé pour rollback

**Si tous ✅ → Déployer ! 🚀**

---

## 🔥 DÉPLOIEMENT

### Commandes selon plateforme:

**Vercel:**
```bash
vercel --prod
# Attendre confirmation: ✓ Production deployment ready
```

**Netlify:**
```bash
netlify deploy --prod
# Vérifier URL: https://your-app.netlify.app
```

**Custom (VPS/Docker):**
```bash
# Build + upload
npm run build
rsync -avz dist/ user@server:/var/www/app/
systemctl restart nginx
```

---

## ⏱️ TEMPS ESTIMÉ

| Étape | Durée |
|-------|-------|
| Migrations check | 2 min |
| Env vars check | 1 min |
| Build final | 2 min |
| RLS spot check | 2 min |
| Deep links test | 3 min |
| **TOTAL** | **10 min** |

---

## 📞 CONTACTS URGENCE

- **Supabase Dashboard:** https://app.supabase.com
- **Sentry (si activé):** https://sentry.io
- **DNS/Email:** Vérifier avec hébergeur

---

**Prochaine étape après validation:** [Smoke Test Post-Déploiement](./go-live-smoke-test.md)
