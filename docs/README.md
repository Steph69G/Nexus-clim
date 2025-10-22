# 📚 Documentation Clim Passion

**Version:** Phase 18 - Go-Live Ready
**Dernière mise à jour:** 2025-10-22

---

## 🚀 GO-LIVE DOCUMENTATION

### 📖 **Point d'entrée principal**

👉 **[GO-LIVE-MASTER.md](./GO-LIVE-MASTER.md)** ← Commencer ici

Ce document contient:
- Vue d'ensemble complète du processus
- Timeline détaillée (30 min)
- Checklist finale
- Liens vers tous les autres docs

---

## 📋 DOCUMENTATION PAR PHASE

### **Phase de déploiement**

| Document | Durée | Description |
|----------|-------|-------------|
| **[go-live-preflight.md](./go-live-preflight.md)** | 10 min | Vérifications avant déploiement |
| **[go-live-smoke-test.md](./go-live-smoke-test.md)** | 10 min | Tests post-déploiement |
| **[go-live-rollback.md](./go-live-rollback.md)** | 5 min | Procédure de rollback |
| **[go-live-seed-minimal.sql](./go-live-seed-minimal.sql)** | 2 min | Seed données de test |

---

### **Documentation technique**

| Document | Description |
|----------|-------------|
| **[url-filters.md](./url-filters.md)** | Pattern URL filters (guide complet) |
| **[phase18-go-live-hardening.md](./phase18-go-live-hardening.md)** | Durcissement Phase 18 |

---

## 🎯 QUICK START

### Pour déployer en production:

```bash
# 1. Lire la documentation
cat docs/GO-LIVE-MASTER.md

# 2. Exécuter le préflight
# Suivre docs/go-live-preflight.md

# 3. Déployer
vercel --prod  # ou netlify deploy --prod

# 4. Smoke test
# Suivre docs/go-live-smoke-test.md
```

---

### Pour ajouter des données de test:

```bash
# Exécuter le seed SQL
psql $DATABASE_URL -f docs/go-live-seed-minimal.sql

# OU via Supabase Dashboard:
# SQL Editor > Paste go-live-seed-minimal.sql > Run
```

---

### Pour rollback en urgence:

```bash
# Suivre docs/go-live-rollback.md
vercel rollback  # ou netlify rollback
```

---

## 🔍 RECHERCHE RAPIDE

### Par objectif

**Déployer:**
1. [GO-LIVE-MASTER.md](./GO-LIVE-MASTER.md)
2. [go-live-preflight.md](./go-live-preflight.md)

**Tester:**
1. [go-live-smoke-test.md](./go-live-smoke-test.md)
2. [go-live-seed-minimal.sql](./go-live-seed-minimal.sql)

**Rollback:**
1. [go-live-rollback.md](./go-live-rollback.md)

**Développer:**
1. [url-filters.md](./url-filters.md) - Pattern URL filters

---

## ✅ CHECKLIST GO-LIVE MINIMALE

**Avant de déployer:**
- [ ] ✅ Lire [GO-LIVE-MASTER.md](./GO-LIVE-MASTER.md)
- [ ] ✅ Exécuter [go-live-preflight.md](./go-live-preflight.md)
- [ ] ✅ Créer tag backup (`git tag prod-N-1-backup`)

**Après déploiement:**
- [ ] ✅ Exécuter [go-live-smoke-test.md](./go-live-smoke-test.md)
- [ ] ✅ Monitoring 30 min
- [ ] ✅ Valider 5 deep links

**Si problème:**
- [ ] ✅ Suivre [go-live-rollback.md](./go-live-rollback.md)

---

## 📊 STATUT DOCUMENTATION

| Document | Status | Version | Testé |
|----------|--------|---------|-------|
| GO-LIVE-MASTER | ✅ Complet | 1.0.0 | ✅ |
| go-live-preflight | ✅ Complet | 1.0.0 | ✅ |
| go-live-smoke-test | ✅ Complet | 1.0.0 | ✅ |
| go-live-rollback | ✅ Complet | 1.0.0 | ✅ |
| go-live-seed-minimal | ✅ Complet | 1.0.0 | ⏳ Attente test |
| url-filters | ✅ Complet | 1.0.0 | ✅ |
| phase18-hardening | ✅ Complet | 1.0.0 | ✅ |

---

## 🎓 POUR LES NOUVEAUX DÉVELOPPEURS

**1. Comprendre l'architecture:**
- Lire [phase18-go-live-hardening.md](./phase18-go-live-hardening.md)

**2. Apprendre le pattern URL filters:**
- Lire [url-filters.md](./url-filters.md)
- Exemples dans `src/pages/admin/accounting/`

**3. Contribuer:**
- Suivre pattern établi
- Tester en local
- Créer PR avec tests

---

## 📞 SUPPORT

**Questions techniques:**
- Supabase: https://app.supabase.com
- Vite: https://vitejs.dev
- React Router: https://reactrouter.com

**Incidents production:**
- Suivre [go-live-rollback.md](./go-live-rollback.md)
- Notifier équipe (Slack/Email)

---

## 🔄 MISES À JOUR

**Dernières modifications:**
- 2025-10-22: Documentation go-live complète
- 2025-10-22: Pattern URL filters documenté
- 2025-10-22: Seed minimal créé
- 2025-10-22: Procédure rollback finalisée

---

## 📝 CONTRIBUER À LA DOC

**Format:**
- Markdown avec syntaxe GitHub
- Headers avec emojis pour lisibilité
- Code blocks avec syntax highlighting
- Exemples concrets

**Structure:**
```markdown
# Titre principal

## Section
### Sous-section

**Gras pour points importants**

`code inline`

\`\`\`bash
# Code block
\`\`\`
```

**Commits:**
```bash
git commit -m "docs: Add XYZ documentation"
git push origin main
```

---

**README créé:** 2025-10-22
**Maintenu par:** Équipe Tech Clim Passion
**Version:** 1.0.0
