# 🔄 Procédure de Rollback Go-Live

**Durée estimée:** 5 minutes
**Quand utiliser:** Erreur critique détectée en production

---

## 🚨 CRITÈRES DE ROLLBACK

### ❌ Rollback IMMÉDIAT si:

1. **Erreur généralisée app:**
   - Page blanche sur toutes les routes
   - Erreur JS empêchant navigation
   - Auth cassée (impossible de se connecter)

2. **Erreur DB critique:**
   - RLS exposant données entre utilisateurs
   - Fuite de données sensibles (PII, financier)
   - Corruption de données

3. **Performance dégradée:**
   - Temps de chargement > 10s
   - Timeout répétés (> 50% requêtes)
   - CPU/RAM saturé

### ⚠️ Rollback CONDITIONNEL si:

1. **Erreur isolée:**
   - 1 page spécifique en erreur → Désactiver feature
   - Filtre cassé → Mode dégradé acceptable
   - UI glitch non bloquant → Fix rapide possible

2. **Erreur intermittente:**
   - < 10% des utilisateurs impactés
   - Workaround disponible
   - Fix en cours (< 30 min)

---

## 🔄 PROCÉDURE ROLLBACK

### ÉTAPE 1: PRÉPARER LE ROLLBACK (AVANT GO-LIVE)

**⚠️ À FAIRE AVANT DÉPLOIEMENT:**

```bash
# 1. Tag current production (N-1)
git tag prod-N-1-backup-$(date +%Y%m%d-%H%M%S)
git push --tags

# 2. Sauvegarder build actuel
mkdir -p backups
cp -r dist backups/dist-N-1-$(date +%Y%m%d-%H%M%S)

# 3. Noter commit SHA actuel
git rev-parse HEAD > backups/prod-N-1-sha.txt
```

**Vercel/Netlify (automatique):**
```bash
# Vercel garde automatiquement les déploiements précédents
# Netlify idem

# Vérifier disponibilité:
vercel ls  # Liste déploiements
netlify sites:list  # Liste sites
```

---

### ÉTAPE 2: ROLLBACK FRONTEND

#### Option A: Vercel

```bash
# 1. Lister déploiements récents
vercel ls

# 2. Rollback vers N-1
vercel rollback
# OU
vercel rollback --url https://your-app-N-1.vercel.app

# 3. Vérifier
curl -I https://your-app.com
# Doit retourner 200 OK
```

**Durée:** ~30 secondes

---

#### Option B: Netlify

```bash
# 1. Lister déploiements
netlify deploys:list

# 2. Rollback
netlify rollback
# Suivre prompts UI

# 3. Vérifier
curl -I https://your-app.netlify.app
```

**Durée:** ~1 minute

---

#### Option C: Custom (VPS/Docker)

```bash
# 1. Arrêter service actuel
sudo systemctl stop nginx  # ou apache2

# 2. Restaurer backup N-1
cd /var/www
sudo rm -rf app.current
sudo cp -r app.backup-N-1 app.current

# 3. Redémarrer
sudo systemctl start nginx
sudo systemctl status nginx  # Vérifier OK

# 4. Clear cache CDN (si applicable)
curl -X POST https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"purge_everything":true}'
```

**Durée:** ~2-3 minutes

---

### ÉTAPE 3: ROLLBACK BASE DE DONNÉES (si nécessaire)

⚠️ **ATTENTION:** Rollback DB est risqué si des données ont été modifiées entre temps

#### Scénario 1: Nouvelle migration cassée

```sql
-- 1. Vérifier migrations appliquées
SELECT version, name FROM supabase_migrations.schema_migrations
ORDER BY version DESC LIMIT 5;

-- 2. Si migration Phase 18 pose problème, créer migration revert
-- Créer fichier: supabase/migrations/YYYYMMDDHHMMSS_revert_phase18.sql

-- Exemple: Revert d'une colonne ajoutée
ALTER TABLE invoices DROP COLUMN IF EXISTS new_column_phase18;

-- Exemple: Revert d'un index
DROP INDEX IF EXISTS idx_invoices_phase18;

-- 3. Appliquer via Supabase Dashboard
-- SQL Editor > Run migration
```

**⚠️ NE JAMAIS:**
- Supprimer des données utilisateur
- Revert des migrations > 24h
- Modifier sans backup

#### Scénario 2: RLS policy cassée

```sql
-- Désactiver policy problématique temporairement
ALTER TABLE missions DISABLE ROW LEVEL SECURITY;

-- Fixer et ré-activer dans les 5 minutes MAX
-- (sinon toutes les données sont exposées!)

-- Une fois fix prêt:
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
```

**Durée:** ~2 minutes (URGENCE)

---

### ÉTAPE 4: NOTIFICATION & COMMUNICATION

#### Template Slack/Email:

```markdown
🔴 ROLLBACK EFFECTUÉ

**Timestamp:** [YYYY-MM-DD HH:MM UTC]
**Version rollback:** N-1 (prod-backup-YYYYMMDD)
**Raison:** [Description erreur critique]

**Impact:**
- Utilisateurs: [nombre/pourcentage] impactés
- Durée: [durée indisponibilité]
- Données: [Aucune perte / Perte partielle détails]

**Actions en cours:**
1. Investigation root cause
2. Fix en développement
3. Tests sur staging

**Prochain déploiement estimé:** [ETA]

**Personnes joignables:**
- Tech lead: [nom] - [contact]
- DevOps: [nom] - [contact]
```

---

### ÉTAPE 5: POST-ROLLBACK CHECKS

```bash
# 1. Vérifier site accessible
curl -I https://your-app.com
# Attendu: 200 OK

# 2. Tester login
curl -X POST https://your-app.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
# Attendu: Token retourné

# 3. Vérifier logs propres
# Console navigateur (F12)
# Pas d'erreur critique

# 4. Smoke test rapide (2 min)
# - Login OK
# - Accueil affiche
# - 1 deep link fonctionne
```

**Critère de succès:**
- ✅ Site accessible
- ✅ Auth fonctionne
- ✅ Pas d'erreur console critique
- ✅ DB accessible

---

## 📊 CHECKLIST ROLLBACK

**Avant rollback:**
- [ ] ✅ Backup N-1 disponible et testé
- [ ] ✅ Tag Git créé (prod-N-1)
- [ ] ✅ Équipe notifiée (Slack/Email)
- [ ] ✅ Monitoring actif (Sentry/logs)

**Pendant rollback:**
- [ ] ✅ Frontend rollback exécuté
- [ ] ✅ DB check (RLS/migrations OK)
- [ ] ✅ Cache CDN purgé (si applicable)
- [ ] ✅ Verification 200 OK

**Après rollback:**
- [ ] ✅ Smoke test PASS
- [ ] ✅ Utilisateurs notifiés (si downtime)
- [ ] ✅ Post-mortem planifié
- [ ] ✅ Fix en cours sur staging

---

## 🔍 POST-MORTEM (après rollback)

### Template rapport:

```markdown
# Post-Mortem: Rollback Production YYYY-MM-DD

## Résumé
- **Date/heure:** [timestamp]
- **Durée indisponibilité:** [durée]
- **Impact:** [utilisateurs/fonctionnalités]

## Timeline
- [HH:MM] Déploiement N lancé
- [HH:MM] Erreur détectée (type: [erreur])
- [HH:MM] Décision rollback
- [HH:MM] Rollback exécuté
- [HH:MM] Service rétabli

## Root Cause
[Description technique de la cause]

## Fix Implémenté
[Solution appliquée]

## Actions Préventives
1. [Action 1] - Responsable: [nom] - ETA: [date]
2. [Action 2] - Responsable: [nom] - ETA: [date]

## Leçons Apprises
- [Point 1]
- [Point 2]
```

---

## 🛡️ PRÉVENTION (améliorer pour Phase 19+)

### Tests automatisés (CI/CD)

```yaml
# .github/workflows/deploy.yml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  test-before-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test  # ⚠️ Bloquer si fail
      - run: npm run lint

  deploy:
    needs: test-before-deploy
    # Deploy only if tests pass
```

### Feature flags (futur)

```typescript
// Activer/désactiver features sans redéployer
const FEATURES = {
  urlFilters: true,  // Phase 18 - peut être désactivé
  enumMapping: true,  // Phase 18 - critique
  stockAlerts: true,  // Phase 18
}

// Dans composant:
if (FEATURES.urlFilters) {
  // Utiliser nouveau pattern
} else {
  // Fallback ancien comportement
}
```

### Monitoring proactif

```javascript
// Ajouter health check endpoint
// /api/health
{
  "status": "ok",
  "version": "1.0.0",
  "db": "connected",
  "timestamp": "2025-10-22T10:30:00Z"
}

// Ping toutes les 60s
// Alert si status !== "ok"
```

---

## ✅ VALIDATION POST-ROLLBACK

**Après 30 min en prod N-1 stable:**

- [ ] ✅ Aucune erreur critique logs
- [ ] ✅ Utilisateurs peuvent travailler normalement
- [ ] ✅ Pas de plainte support/tickets
- [ ] ✅ Monitoring vert (uptime, latence)

**Si tous ✅ → Situation stabilisée**

**Passer à:** Investigation root cause + fix sur staging

---

## 📞 CONTACTS URGENCE

**Hébergement:**
- Vercel Support: https://vercel.com/support
- Netlify Support: https://www.netlify.com/support
- Supabase Support: https://supabase.com/support

**Équipe:**
- Tech Lead: [contact]
- DevOps: [contact]
- Product Owner: [contact]

**Escalation (si > 1h downtime):**
- Management: [contact]
- Communication: [contact]

---

**Durée totale rollback:** 5-10 min (si préparé)
**Durée investigation post-rollback:** 1-4h (selon complexité)
