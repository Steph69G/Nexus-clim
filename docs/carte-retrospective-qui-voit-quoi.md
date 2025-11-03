# Rétrospective Carte : Qui voit quoi ?

## Résumé Exécutif

**PROBLÈME IDENTIFIÉ** : Les techniciens et missions en brouillon utilisent tous deux la couleur GRISE (#9CA3AF / #6B7280), créant une **confusion visuelle majeure**.

---

## 1. Architecture des Cartes

### 1.1 Trois cartes distinctes

| Carte | Fichier | Utilisateurs | Fonction API |
|-------|---------|--------------|--------------|
| **ADMIN** | `AdminMapPage.tsx` | admin, manager, sal | `getAdminMissionsForMap()` |
| **TECH** | `TechMapPage.tsx` | tech, sal | `fetchMissionPoints()` |
| **ST** | `MapPage.tsx` (SubcontractorMapView) | st | `fetchMissionPoints()` |

---

## 2. Permissions RLS (Row Level Security)

### 2.1 Politique SELECT sur table `missions`

```sql
-- ADMIN/SAL/MANAGER : Tout voir
CREATE POLICY missions_select_admin ON missions
  FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE user_id = current_user_id())
         IN ('admin', 'manager', 'sal'));

-- TECH/ST : Uniquement missions assignées
CREATE POLICY missions_select_tech ON missions
  FOR SELECT TO authenticated
  USING (assigned_user_id = current_user_id()
         AND (SELECT role FROM profiles WHERE user_id = current_user_id())
         IN ('tech', 'st'));

-- CLIENT : Uniquement ses missions
CREATE POLICY missions_select_client ON missions
  FOR SELECT TO authenticated
  USING (client_id = current_user_id());
```

### 2.2 Conséquences

| Rôle | Peut voir |
|------|-----------|
| **Admin / Manager / SAL** | TOUTES les missions (y compris brouillons) |
| **Tech / ST** | SEULEMENT missions assignées à eux |
| **Client** | SEULEMENT leurs missions |

---

## 3. Analyse par Carte

### 3.1 Carte ADMIN (`AdminMapPage.tsx`)

**Utilisateurs** : admin, manager, sal

**API** : `getAdminMissionsForMap()`
- Récupère TOUTES les missions via RLS
- Pas de filtrage par statut
- Inclut missions en brouillon ("Nouveau")

**Statuts visibles** :
- ✅ **Nouveau** (Brouillon) → Jaune `#EAB308`
- ✅ **Publiée** → Indigo `#6366F1`
- ✅ **Assignée** → Vert `#22C55E`
- ✅ **En cours** → Bleu `#3B82F6`
- ✅ **Bloqué** → Rouge `#F87171`
- ✅ **Terminé** → GRIS `#9CA3AF` ⚠️

**Intervenants affichés** :
- Tous les ST (Sous-traitants) → Pins avec carré blanc
- Tous les SAL (Salariés) → Pins avec cercle blanc
- Couleur intervenant :
  - Vert `#10B981` : Dans le rayon / éligible
  - Rouge `#EF4444` : Hors rayon
  - **GRIS `#6B7280` : Autres techniciens** ⚠️

---

### 3.2 Carte TECH (`TechMapPage.tsx`)

**Utilisateurs** : tech, sal

**API** : `fetchMissionPoints()`
- Récupère missions selon RLS (assignées uniquement pour tech)
- Pas de filtrage explicite par statut

**Statuts visibles** :
```typescript
const color = isCompleted ? '#10B981'   // Terminé = Vert
            : isAvailable ? '#EF4444'   // En cours = Rouge
            : '#F59E0B';                // Autres = Orange
```

**Logique actuelle** :
- **Vert** `#10B981` : Terminé
- **Rouge** `#EF4444` : En cours
- **Orange** `#F59E0B` : Tous les autres (Nouveau, Publiée, Assignée, Bloqué)

**⚠️ PROBLÈME** : Un tech ne devrait JAMAIS voir de mission "Nouveau" (brouillon), mais si RLS le permet, elle serait affichée en ORANGE.

**Intervenants affichés** :
- Autres techniciens → **GRIS** `#6B7280` ⚠️

---

### 3.3 Carte ST (`MapPage.tsx` - SubcontractorMapView)

**Utilisateurs** : st (sous-traitants)

**API** : `fetchMissionPoints()`
- Récupère missions selon RLS (assignées uniquement)
- Pas de filtrage par statut

**Statuts visibles** :
```typescript
const missionColor = p.status === "En cours" ? "#3B82F6"    // Bleu
                   : p.status === "Bloqué" ? "#F59E0B"       // Orange
                   : p.status === "Terminé" ? "#10B981"      // Vert
                   : "#64748B";                              // GRIS par défaut
```

**⚠️ PROBLÈME** : Les missions "Nouveau", "Publiée", "Assignée" sont affichées en **GRIS** `#64748B` — même couleur que les techniciens !

**Intervenants affichés** :
- Autres techniciens → **GRIS** `#64748B` ⚠️

---

## 4. Problèmes Identifiés

### 4.1 Confusion Couleur GRISE

| Élément | Couleur | Carte |
|---------|---------|-------|
| **Missions Terminées** | `#9CA3AF` | Admin |
| **Missions Brouillon** | `#EAB308` (jaune) | Admin |
| **Missions "autres" (Nouveau/Publiée/Assignée)** | `#64748B` GRIS | ST |
| **Techniciens / Intervenants** | `#6B7280` GRIS | Admin, Tech, ST |

**🔴 CONFLIT MAJEUR** : Sur la carte ST, les missions non-catégorisées (dont potentiellement "Nouveau") ont la MÊME couleur GRISE que les techniciens.

---

### 4.2 Incohérence Statuts entre Cartes

| Statut | Admin | Tech | ST |
|--------|-------|------|-----|
| Nouveau | Jaune `#EAB308` | Orange `#F59E0B` | **GRIS** `#64748B` ⚠️ |
| Publiée | Indigo `#6366F1` | Orange `#F59E0B` | **GRIS** `#64748B` ⚠️ |
| Assignée | Vert `#22C55E` | Orange `#F59E0B` | **GRIS** `#64748B` ⚠️ |
| En cours | Bleu `#3B82F6` | **Rouge** `#EF4444` ⚠️ | Bleu `#3B82F6` |
| Bloqué | Rouge `#F87171` | Orange `#F59E0B` | Orange `#F59E0B` |
| Terminé | **GRIS** `#9CA3AF` ⚠️ | Vert `#10B981` | Vert `#10B981` |

---

## 5. Sécurité : Qui devrait voir quoi ?

### 5.1 Missions en Brouillon ("Nouveau")

**Règle métier** : Les brouillons ne doivent être vus QUE par Admin/Manager/SAL.

**État actuel** :
- ✅ Admin : Voit les brouillons (correct)
- ❓ Tech/ST : Ne devraient PAS voir de brouillons (dépend des données en BDD)

**Recommandation** :
```typescript
// Dans fetchMissionPoints(), filtrer côté client ou API :
.not("status", "eq", "Nouveau")  // Exclure brouillons pour tech/st
```

### 5.2 Missions Publiées ("Publiée")

**Règle métier** : Visibles par Admin pour assignation, mais pas encore par Tech/ST.

**État actuel** :
- ✅ Admin : Voit les publiées (correct)
- ⚠️ Tech/ST : Voient les publiées SI assignées (règle RLS), mais logiquement elles ne devraient pas être assignées

---

## 6. Système de Couleurs Global (`statusColors.ts`)

```typescript
export const STATUS_COLORS: Record<UIStatus, StatusColorConfig> = {
  "Nouveau":  { hex: "#EAB308", label: "Brouillon" },      // Jaune
  "Publiée":  { hex: "#6366F1", label: "Publiée" },        // Indigo
  "Assignée": { hex: "#22C55E", label: "Assignée" },       // Vert
  "En cours": { hex: "#3B82F6", label: "En cours" },       // Bleu
  "Bloqué":   { hex: "#F87171", label: "Bloqué" },         // Rouge
  "Terminé":  { hex: "#9CA3AF", label: "Terminé" }         // GRIS ⚠️
};
```

**Problème** : "Terminé" en GRIS crée confusion avec techniciens (aussi gris).

---

## 7. Recommandations

### 7.1 Urgent : Changer couleur Techniciens

**Solution** : Utiliser une couleur distinctive pour les techniciens.

Options :
- **Option A** : Bleu plus foncé `#1E40AF` (Navy Blue)
- **Option B** : Violet `#8B5CF6` (Purple)
- **Option C** : Cyan `#06B6D4` (Turquoise)

### 7.2 Urgent : Changer couleur Missions Terminées

**Solution** : Utiliser une couleur positive/neutre distinctive.

Options :
- **Option A** : Vert foncé `#059669` (Green-600)
- **Option B** : Bleu-gris `#64748B` mais alors changer techniciens
- **Option C** : Garder gris MAIS changer techniciens en couleur vive

### 7.3 Moyen terme : Unifier logique statuts

Créer un helper centralisé :
```typescript
export function getMissionColorForRole(
  status: string,
  role: 'admin' | 'tech' | 'st'
): string {
  const normalized = normalizeStatus(status);

  // Admin : utilise les couleurs officielles
  if (role === 'admin') return STATUS_COLORS[normalized].hex;

  // Tech/ST : logique simplifiée
  if (normalized === "Terminé") return "#10B981";
  if (normalized === "En cours") return "#3B82F6";
  if (normalized === "Bloqué") return "#F59E0B";

  // Fallback : ne devrait jamais arriver si RLS correct
  return "#6B7280";
}
```

### 7.4 Long terme : Fusionner les cartes ?

**Avantage** : Code unique, maintenance simplifiée, UX cohérente.

**Structure proposée** :
```typescript
export default function UnifiedMapPage() {
  const { profile } = useProfile();

  return (
    <MapView
      role={profile.role}
      showAdminFeatures={['admin', 'manager', 'sal'].includes(profile.role)}
      showAllMissions={['admin', 'manager', 'sal'].includes(profile.role)}
    />
  );
}
```

---

## 8. Tableau de Bord Final

| Carte | Missions Brouillon | Missions Assignées | Toutes Missions | Techniciens | Assignation |
|-------|-------------------|-------------------|----------------|-------------|-------------|
| **Admin** | ✅ Oui (Jaune) | ✅ Oui | ✅ Oui | ✅ Oui (Gris) | ✅ Oui |
| **Tech** | ❌ Non (RLS) | ✅ Oui | ❌ Non | ✅ Oui (Gris) | ❌ Non |
| **ST** | ❌ Non (RLS) | ✅ Oui | ❌ Non | ✅ Oui (Gris) | ❌ Non |

---

## 9. Conclusion

### Points critiques à corriger immédiatement :

1. **🔴 Couleur Techniciens** : Changer du gris vers couleur distinctive
2. **🔴 Couleur Terminé** : Éviter le gris si techniciens restent gris
3. **🟡 Filtrage Brouillons** : Ajouter filtrage `.not("status", "eq", "Nouveau")` pour Tech/ST
4. **🟡 Unification Couleurs** : Utiliser `statusColors.ts` partout

### Points à planifier :

5. **Fusion des cartes** : Évaluer faisabilité d'une carte unique
6. **Tests RLS** : Vérifier qu'aucun tech/st ne peut voir de brouillon
7. **Documentation** : Mettre à jour docs utilisateur sur codes couleurs

---

**Date** : 2025-11-03
**Auteur** : Analyse système
