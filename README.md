# Nexus Clim - Platform de Gestion Interventions

**Version:** 1.0.0-rc1 (Phase 3 - Production Ready MVP)

Plateforme complète de gestion d'interventions pour entreprise de climatisation.

---

## 🚀 Quick Start

```bash
# Installation
npm install

# Development
npm run dev

# Tests
npm run test

# Build production
npm run build
```

---

## 📦 Stack Technique

### Frontend
- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **React Router v6** (routing)
- **Zustand** (state - chat)
- **Leaflet** (maps)
- **Lucide React** (icons)

### Backend
- **Supabase** (PostgreSQL + Auth + Storage + Edge Functions)
  - 69 tables avec RLS
  - 93 triggers automatiques
  - 45+ fonctions SQL
  - 4 Edge Functions (Deno)

### Testing
- **Vitest** (unit tests)
- **jsdom** (DOM testing)

### Validation & Security
- **Zod** (schema validation)
- Rate limiting (Edge Functions)

---

## 🎯 Features

### ✅ Core Features (Phase 1 & 2)

- **Missions Management** (CRUD, statuts, affectation)
- **Multi-rôles** (Admin, SAL, ST, Client, Manager)
- **Calendrier** (drag & drop, multi-tech)
- **Carte interactive** (Leaflet + Google Maps)
- **Rapports d'intervention** (formulaires dynamiques)
- **Enquêtes satisfaction** (NPS, templates)
- **Facturation** (factures, devis, paiements)
- **Contrats maintenance** (récurrents)
- **Stock management** (articles, mouvements)
- **Véhicules** (planning maintenance)
- **Notifications** (Realtime WebSocket)
- **Portail client** (documents, demandes)
- **KPIs & Analytics**

### 🆕 Phase 3 Features

- **✅ Génération PDF automatique**
  - Factures conformes normes françaises
  - Devis avec validité
  - Rapports d'intervention
  - Upload automatique Storage

- **✅ Système d'emails complet**
  - 6 types d'emails automatiques
  - Templates personnalisables
  - Idempotence (évite doublons)
  - Resend API

- **✅ Realtime partout**
  - Missions updates instantanées
  - Notifications push
  - Hook générique réutilisable

- **✅ Filtrage géographique techniciens**
  - Rayon d'intervention configurable
  - Calcul distance Haversine
  - Offres filtrées automatiquement

- **✅ Tests automatisés**
  - Vitest configuré
  - 10 tests unitaires
  - Coverage reporting

- **✅ Sécurité renforcée**
  - Validation Zod sur 7 entités
  - Rate limiting Edge Functions
  - RLS strict partout

---

## 📂 Structure Projet

```
nexus-clim/
├── src/
│   ├── api/              # Appels Supabase
│   ├── components/       # Composants React
│   ├── hooks/            # Custom hooks (useRealtime, useMissions, etc.)
│   ├── lib/              # Utils (dateUtils, validation, etc.)
│   ├── pages/            # Pages routées
│   ├── routes/           # Configuration routing
│   ├── types/            # Types TypeScript
│   └── test/             # Configuration tests
├── supabase/
│   ├── functions/        # Edge Functions (Deno)
│   │   ├── generate-invoice-pdf/
│   │   ├── generate-quote-pdf/
│   │   ├── generate-report-pdf/
│   │   └── send-notification-email/
│   └── migrations/       # Migrations SQL (93 fichiers)
├── docs/                 # Documentation
│   ├── PHASE3_LOG.md     # Journal Phase 3
│   ├── PHASE3_SUMMARY.md # Synthèse Phase 3
│   └── ...
└── public/               # Assets statiques
```

---

## 🔧 Configuration

### Variables d'environnement

**Frontend (`.env.local`):**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_GOOGLE_MAPS_API_KEY=AIzaxxx
```

**Backend (Supabase Secrets):**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Déploiement Edge Functions

```bash
# Via Supabase Dashboard
Edge Functions > Deploy

# OU via CLI
supabase functions deploy generate-invoice-pdf
supabase functions deploy generate-quote-pdf
supabase functions deploy generate-report-pdf
supabase functions deploy send-notification-email
```

### Migrations SQL

```bash
# Via Supabase Dashboard
Database > Migrations > Run

# OU via CLI
supabase db push
```

---

## 🧪 Tests

```bash
# Lancer tous les tests
npm run test

# Interface UI
npm run test:ui

# Avec couverture
npm run test:coverage
```

**Tests existants:**
- `dateUtils.test.ts` - Formatage dates
- `statusMaps.test.ts` - Labels status
- `roleColors.test.ts` - Badge colors

---

## 📖 Documentation

### Phase 3 (Dernière)

- **[PHASE3_SUMMARY.md](docs/PHASE3_SUMMARY.md)** - Synthèse complète
- **[PHASE3_LOG.md](docs/PHASE3_LOG.md)** - Journal technique détaillé

### Guides techniques

- **[calendar-drag-drop.md](docs/calendar-drag-drop.md)** - Drag & drop calendrier
- **[survey-templates-system.md](docs/survey-templates-system.md)** - Système enquêtes
- **[user-table-refactoring.md](docs/user-table-refactoring.md)** - Architecture users
- **[go-live-*.md](docs/)** - Checklist go-live

### Architecture complète

- **[README_ARCHI.md](README_ARCHI.md)** - Vue d'ensemble architecture

---

## 👥 Rôles Utilisateurs

| Rôle | Code | Accès | Description |
|------|------|-------|-------------|
| **Admin** | `admin` | Complet | Gestion système, tous droits |
| **SAL** | `sal` | Lecture + validation | Service Après-Vente, validation rapports |
| **ST** | `st` | Missions assignées | Sous-traitant / Technicien |
| **Client** | `client` | Portail client | Consultation documents, demandes |
| **Manager** | `manager` | Vue consolidée | Responsable (peu utilisé) |

---

## 🔐 Sécurité

- **RLS activé** sur 100% des tables (69/69)
- **Policies** par rôle strictes (~200 règles)
- **Validation Zod** sur inputs critiques
- **Rate limiting** Edge Functions (10-20 req/min)
- **HTTPS** obligatoire
- **JWT tokens** Supabase
- **RGPD** masquage adresses techniciens

---

## 📊 Métriques

### Base de données
- **69 tables**
- **93 triggers**
- **45+ fonctions SQL**
- **23 ENUMs**
- **5 views**

### Frontend
- **212 fichiers** sources
- **35 pages**
- **50+ composants**
- **15 hooks custom**

### Edge Functions
- **4 fonctions** Deno (PDF + email)

### Tests
- **10 tests** unitaires (Vitest)
- **3 suites** de tests

### Build
- **2.15 MB** bundle JS
- **454 KB** gzip
- **95 KB** CSS

---

## 🚀 Roadmap Phase 4

### Priorité 1
- [ ] Code-splitting (réduire bundle < 500 KB)
- [ ] Tests E2E Playwright
- [ ] Monitoring Sentry + Uptime
- [ ] Configuration Resend production

### Priorité 2
- [ ] Paiements Stripe online
- [ ] Contrats récurrents automatiques
- [ ] Stock fournisseurs + bons commande
- [ ] App mobile React Native
- [ ] Exports Excel/CSV
- [ ] Dashboards graphiques (Recharts)

---

## 📞 Support

**Documentation:**
- React: https://react.dev
- Supabase: https://supabase.com/docs
- Tailwind: https://tailwindcss.com/docs
- Vitest: https://vitest.dev

**Communautés:**
- Discord Supabase: https://discord.supabase.com
- Stack Overflow: tag `supabase` + `react`

---

## 📄 License

Propriétaire - Nexus Clim © 2025

---

**Version:** 1.0.0-rc1
**Dernière mise à jour:** 27 Octobre 2025
**Statut:** ✅ Production Ready MVP

🎉 **Phase 3 complétée avec succès !**
