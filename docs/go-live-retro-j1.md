# 📊 Retro J+1 - Analyse Post Go-Live

**Date go-live:** `__________`
**Date retro:** `__________` (J+1)
**Participants:** `__________`

---

## 🎯 OBJECTIFS RETRO

1. Analyser l'adoption des nouvelles features
2. Identifier les problèmes non détectés au smoke test
3. Mesurer la performance en production
4. Planifier les optimisations Phase 19

**Durée:** 30-45 minutes

---

## 📈 MÉTRIQUES ADOPTION (Top 10 actions)

### Query à exécuter:

```sql
-- Top 10 actions depuis Accueil (J+1)
SELECT
  event_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users,
  ROUND(AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at)))), 2) as avg_interval_sec
FROM app_events
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND event_type LIKE 'home_click_%'
GROUP BY event_type
ORDER BY count DESC
LIMIT 10;
```

**Résultats attendus:**

| Action | Count | Utilisateurs uniques | Notes |
|--------|-------|----------------------|-------|
| home_click_impaye | _____ | _____ | Factures impayées |
| home_click_devis | _____ | _____ | Devis à valider |
| home_click_stock | _____ | _____ | Stock bas |
| home_click_offres | _____ | _____ | Offres disponibles |
| home_click_urgences | _____ | _____ | Urgences ouvertes |
| ... | | | |

**Analyse:**
```
Top 3 actions les plus utilisées:
1. _________________
2. _________________
3. _________________

Actions peu utilisées (< 5 clics):
- _________________
→ Raison possible: __________
→ Action: __________
```

---

## ⚡ PERFORMANCE (temps de réponse)

### Query à exécuter:

```sql
-- Temps moyen chargement pages clés
SELECT
  page_path,
  COUNT(*) as views,
  ROUND(AVG(load_time_ms), 0) as avg_load_ms,
  ROUND(MIN(load_time_ms), 0) as min_load_ms,
  ROUND(MAX(load_time_ms), 0) as max_load_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY load_time_ms), 0) as p95_load_ms
FROM page_views
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY page_path
ORDER BY views DESC
LIMIT 10;
```

**Si table `page_views` n'existe pas:**
Utiliser Google Analytics / Vercel Analytics / Lighthouse

**Résultats attendus:**

| Page | Vues | Avg (ms) | P95 (ms) | Status |
|------|------|----------|----------|--------|
| /admin | _____ | _____ | _____ | ✅/⚠️ |
| /admin/comptabilite/invoices | _____ | _____ | _____ | ✅/⚠️ |
| /admin/comptabilite/quotes | _____ | _____ | _____ | ✅/⚠️ |
| /admin/logistique/stock | _____ | _____ | _____ | ✅/⚠️ |
| /admin/offers | _____ | _____ | _____ | ✅/⚠️ |
| /admin/emergency | _____ | _____ | _____ | ✅/⚠️ |

**Seuils:**
- ✅ < 3s : Excellent
- ⚠️ 3-5s : Acceptable
- 🔴 > 5s : À optimiser

**Pages lentes identifiées:**
```
1. _____________ (_____ ms)
   → Cause probable: __________
   → Action: __________

2. _____________ (_____ ms)
   → Cause probable: __________
   → Action: __________
```

---

## 🐛 ERREURS DÉTECTÉES (404 / 403 / 500)

### Query Supabase Logs:

```
Dashboard > Logs > Error logs
Filtrer: created_at > NOW() - INTERVAL '24 hours'
```

### Query console errors (si Sentry):

```
Dashboard > Issues
Filtre: First Seen = Last 24h
Sort by: Event count DESC
```

**Résumé erreurs:**

| Type | Count | Impact | Status |
|------|-------|--------|--------|
| 404 Not Found | _____ | ⚠️ / 🔴 | Ticket #___ |
| 403 Forbidden | _____ | ⚠️ / 🔴 | Ticket #___ |
| 500 Server Error | _____ | 🔴 | Ticket #___ |
| JS Runtime Error | _____ | ⚠️ / 🔴 | Ticket #___ |
| Enum SQL Error | _____ | 🔴 | Devrait être 0 ! |

**Détail erreurs critiques:**

```
Erreur 1:
  Type: _____________
  Message: _____________
  Fréquence: _____ fois
  Contexte: _____________
  Action: _____________

Erreur 2:
  Type: _____________
  Message: _____________
  Fréquence: _____ fois
  Contexte: _____________
  Action: _____________
```

---

## 🔒 RLS SPOT-CHECK (validation sécurité)

### Test 1: Compte Tech

```
Login: tech@climpassion.test (ou équivalent)

Actions testées:
[ ] Accès /tech/missions → ✅ Voit ses missions uniquement
[ ] Essai /admin → ✅ 403 ou redirect /forbidden
[ ] Essai /admin/comptabilite/invoices → ✅ Bloqué
[ ] Consultation facture autre client → ✅ Bloqué

Fuite détectée: ☐ NON / ☐ OUI (CRITIQUE)
```

**Si fuite détectée:**
```
🚨 PROBLÈME RLS DÉTECTÉ

Type: _____________
Impact: _____________
Action immédiate: _____________
Ticket: #_____________
```

### Test 2: Compte Client

```
Login: client@example.test (ou équivalent)

Actions testées:
[ ] Accès /client/invoices → ✅ Voit ses factures uniquement
[ ] Essai /admin → ✅ 403 ou redirect /forbidden
[ ] Essai voir facture autre client → ✅ Bloqué
[ ] Essai voir missions autres → ✅ Bloqué

Fuite détectée: ☐ NON / ☐ OUI (CRITIQUE)
```

---

## 🎯 DEEP LINKS VALIDATION (5/5)

| Link | URL | Clics J+1 | Status |
|------|-----|-----------|--------|
| Impayés | `/admin/comptabilite/invoices?status=overdue` | _____ | ✅/❌ |
| Devis | `/admin/comptabilite/quotes?status=awaiting_approval` | _____ | ✅/❌ |
| Stock | `/admin/logistique/stock?filter=low` | _____ | ✅/❌ |
| Offres | `/admin/offers?filter=available` | _____ | ✅/❌ |
| Urgences | `/admin/emergency?status=open` | _____ | ✅/❌ |

**Score:** _____ / 5

**Si < 5/5:**
```
Link cassé: _____________
Erreur: _____________
Action: _____________
```

---

## 📝 FEEDBACK UTILISATEURS

**Canaux:**
- Slack #support
- Tickets Jira/Linear
- Email direct
- Messages internes

**Synthèse (J+1):**

### Positif
```
1. _________________________________
2. _________________________________
3. _________________________________
```

### Négatif / Bugs signalés
```
1. _________________________________
   → Ticket: #_____
   → Priorité: P1/P2/P3

2. _________________________________
   → Ticket: #_____
   → Priorité: P1/P2/P3

3. _________________________________
   → Ticket: #_____
   → Priorité: P1/P2/P3
```

### Demandes features
```
1. _________________________________
   → Phase 19: ☐ OUI / ☐ NON

2. _________________________________
   → Phase 19: ☐ OUI / ☐ NON
```

---

## 🔍 ALERTES DB (vérification)

```sql
-- Exécuter checks alertes
SELECT * FROM run_all_alert_checks();

-- Vérifier stock négatif (doit être 0)
SELECT COUNT(*) as stock_negatif_count FROM stock_negative;

-- Vérifier factures en retard
SELECT COUNT(*) as impaye_count
FROM invoices
WHERE payment_status = 'en_retard'
  AND due_date < NOW();

-- Vérifier urgences non traitées
SELECT COUNT(*) as urgence_open_count
FROM emergency_requests
WHERE status = 'open'
  AND created_at < NOW() - INTERVAL '24 hours';
```

**Résultats:**

| Métrique | Count | Attendu | Status |
|----------|-------|---------|--------|
| Stock négatif | _____ | 0 | ✅/🔴 |
| Factures impayées | _____ | Variable | ℹ️ |
| Urgences > 24h | _____ | < 5 | ✅/⚠️ |

---

## 📊 MÉTRIQUES TECHNIQUES

### Bundle Size

```bash
ls -lh dist/assets/*.js
```

**Résultat:**
- Minified: _____ MB
- Gzipped: _____ KB (cible: < 500 KB)

**Action si > 500 KB:**
- [ ] Code splitting à planifier (Phase 19)
- [ ] Lazy loading routes secondaires
- [ ] Tree shaking optimisation

### Lighthouse Score (optionnel)

```
Chrome DevTools > Lighthouse > Run

Performance: _____ / 100 (cible: > 70)
Accessibility: _____ / 100 (cible: > 90)
Best Practices: _____ / 100 (cible: > 80)
SEO: _____ / 100
```

**Si score < cible:**
```
Optimisations identifiées:
1. _________________________________
2. _________________________________
3. _________________________________
```

---

## 🎯 DÉCISIONS & ACTIONS

### Bugs critiques (P1) - Fix < 48h
```
1. _________________________________
   → Assigné: _________
   → ETA: _________

2. _________________________________
   → Assigné: _________
   → ETA: _________
```

### Optimisations prioritaires (Phase 19)
```
1. _________________________________
   → Priorité: Haute / Moyenne / Basse
   → Estimation: _____ jours

2. _________________________________
   → Priorité: Haute / Moyenne / Basse
   → Estimation: _____ jours

3. _________________________________
   → Priorité: Haute / Moyenne / Basse
   → Estimation: _____ jours
```

### Features Phase 19
```
[ ] URL filters 3 pages restantes (Missions, Users, ClientInvoices)
[ ] Tests E2E automatisés (Playwright)
[ ] Vues SQL "_ui" (découplage FR/EN DB)
[ ] Code splitting / bundle optimization
[ ] Monitoring dashboards (Grafana/Datadog)
[ ] Documentation API
```

---

## 🏆 SUCCÈS PHASE 18

**Ce qui a bien marché:**
```
1. _________________________________
2. _________________________________
3. _________________________________
```

**Ce qui a mal marché:**
```
1. _________________________________
   → Leçon: _________

2. _________________________________
   → Leçon: _________
```

**Améliorations processus:**
```
1. _________________________________
2. _________________________________
3. _________________________________
```

---

## ✅ VALIDATION GO-LIVE

| Critère | Status | Notes |
|---------|--------|-------|
| Build stable | ✅/❌ | |
| 5 deep links OK | ✅/❌ | |
| Performance < 3s | ✅/⚠️ | |
| RLS sécurisé | ✅/🔴 | |
| 0 erreur critique | ✅/❌ | |
| Feedback positif | ✅/⚠️ | |

**Score final:** _____ / 6

**Décision:**
- ✅ **6/6 → GO-LIVE CONFIRMÉ**
- ⚠️ **4-5/6 → GO avec réserves, tickets créés**
- 🔴 **< 4/6 → Investiguer problèmes critiques**

---

## 📅 PROCHAINES ÉTAPES

**Court terme (J+7):**
```
[ ] Monitoring continu
[ ] Fix bugs critiques
[ ] Collecte feedback continu
```

**Moyen terme (Phase 19):**
```
[ ] Planification features
[ ] Sprint planning
[ ] Priorisation backlog
```

---

**Retro complétée par:** `__________`
**Date:** `__________`
**Prochaine retro:** J+7 (`__________`)
