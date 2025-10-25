# Refactoring : Séparation des Utilisateurs par Rôle

## Problème initial

**AdminUsers** affichait TOUS les utilisateurs sans distinction :
- ✅ Admin, Tech, SAL (équipe interne)
- ❌ CLIENT (clients)
- ❌ ST / USER (sous-traitants)

**Doublons de navigation** :
- AdminClients → pointait vers `/admin/users` (mauvais)
- AdminRessources → 2 liens vers `/admin/users` (mauvais)

## Solution implémentée

### Architecture

```
┌─────────────────────────────────────┐
│ UserTable (composant réutilisable)  │
│ • Props: roleFilter, title, desc    │
│ • Recherche, tri, CRUD              │
│ • Menu actions complet              │
└─────────────────────────────────────┘
           ↓ utilisé par ↓

┌─────────────┬──────────────┬────────────────┐
│ AdminUsers  │ AdminClient  │ AdminSub       │
│             │   List       │  contractors   │
├─────────────┼──────────────┼────────────────┤
│ admin, ADMIN│ CLIENT       │ ST, USER       │
│ TECH, SAL   │              │                │
└─────────────┴──────────────┴────────────────┘
```

### Composant UserTable

**Fichier** : `src/components/admin/UserTable.tsx`

**Props** :
- `roleFilter?: string[]` - Filtre Supabase sur la colonne `role`
- `title?: string` - Titre affiché
- `description?: string` - Sous-titre
- `showCreateButton?: boolean` - Afficher bouton création

**Fonctionnalités** :
- ✅ Recherche en temps réel (nom, email, rôle, téléphone)
- ✅ Tri par date de création (desc)
- ✅ Colonnes : Nom, Email, Téléphone, Rôle, Créé le, Actions
- ✅ Menu actions : Changer rôle, Voir profil, Historique (ST), Supprimer
- ✅ Loading state avec spinner
- ✅ Toast notifications
- ✅ Modals (CreateUser, SubcontractorHistory)

### Pages créées

#### 1. AdminClientList (`/admin/client-list`)
```typescript
<UserTable
  roleFilter={["CLIENT"]}
  title="Clients"
  description="Base clients (particuliers, entreprises, prospects)"
/>
```

#### 2. AdminSubcontractors (`/admin/subcontractors`)
```typescript
<UserTable
  roleFilter={["ST", "USER"]}
  title="Sous-traitants"
  description="Partenaires externes et freelances"
/>
```

#### 3. AdminUsers (`/admin/users`) - Refactorisée
```typescript
<UserTable
  roleFilter={["admin", "ADMIN", "TECH", "SAL"]}
  title="Équipe interne"
  description="Techniciens, commerciaux et administrateurs"
/>
```

### Routes ajoutées

```typescript
// App.tsx
{ path: "admin/users", element: <AdminUsers /> }
{ path: "admin/client-list", element: <AdminClientList /> }
{ path: "admin/subcontractors", element: <AdminSubcontractors /> }
```

### Navigation mise à jour

**AdminClients** (Hub Clients & Contrats) :
```typescript
{
  to: '/admin/client-list',  // ✅ Corrigé
  label: 'Clients',
  description: 'Base de données clients et prospects'
}
```

**AdminRessources** (Hub Ressources) :
```typescript
{
  to: '/admin/users',
  label: 'Équipe interne',  // ✅ Renommé
  description: 'Techniciens, admins et employés'
},
{
  to: '/admin/subcontractors',  // ✅ Corrigé
  label: 'Sous-traitants',
  description: 'Partenaires et prestataires externes'
}
```

## Résultats

### ✅ Aucun doublon
- Chaque page affiche uniquement son périmètre
- 3 vues distinctes et cohérentes

### ✅ Navigation claire
```
Admin Home
  ↓
Clients & Contrats → Clients (/admin/client-list)
                     → Affiche CLIENT uniquement

Ressources → Équipe interne (/admin/users)
             → Affiche admin, TECH, SAL

           → Sous-traitants (/admin/subcontractors)
             → Affiche ST, USER
```

### ✅ Code factorised
- 1 seul composant `UserTable.tsx` (320 lignes)
- 3 pages ultra-simples (15 lignes chacune)
- Maintenance centralisée

### ✅ Fonctionnalités préservées
- Recherche globale
- Changement de rôle
- Historique ST
- Création utilisateur
- Toasts & modals

## Tests de validation

### Scénario 1 : Clients
1. Admin → Clients & Contrats → Clients
2. Vérifier : UNIQUEMENT rôle CLIENT affiché
3. Créer un client → OK
4. Rechercher par email → OK

### Scénario 2 : Sous-traitants
1. Admin → Ressources → Sous-traitants
2. Vérifier : UNIQUEMENT ST et USER affichés
3. Clic "Historique" sur un ST → Modal OK
4. Changer rôle ST → Admin → OK

### Scénario 3 : Équipe interne
1. Admin → Ressources → Équipe interne
2. Vérifier : admin, TECH, SAL uniquement
3. Pas de CLIENT ni ST
4. Recherche "admin" → OK

## Base de données

**Table** : `profiles`

**Rôles existants** :
- `admin` / `ADMIN` - Administrateurs
- `TECH` - Techniciens salariés
- `SAL` - Commerciaux
- `ST` - Sous-traitants
- `USER` - Anciens comptes (mappé ST)
- `CLIENT` - Clients

**Query exemple** :
```sql
-- Équipe interne
SELECT * FROM profiles WHERE role IN ('admin', 'ADMIN', 'TECH', 'SAL');

-- Clients
SELECT * FROM profiles WHERE role = 'CLIENT';

-- Sous-traitants
SELECT * FROM profiles WHERE role IN ('ST', 'USER');
```

## Évolutions possibles

### Phase 2 : Colonnes spécifiques
- Clients : Contrats actifs, CA total
- ST : Certifications, Évaluations
- Équipe : Véhicule affecté, Planning

### Phase 3 : Filtres avancés
- Par ville, date d'inscription
- ST : Par certification, statut
- Clients : Par type (B2B/B2C)

### Phase 4 : Export
- CSV par segment
- Statistiques par rôle

## Fichiers modifiés

```
✅ Créé :
- src/components/admin/UserTable.tsx
- src/pages/admin/AdminClientList.tsx
- src/pages/admin/AdminSubcontractors.tsx
- docs/user-table-refactoring.md

✏️ Modifié :
- src/pages/admin/AdminUsers.tsx (simplifié 290→15 lignes)
- src/pages/admin/AdminClients.tsx (route corrigée)
- src/pages/admin/AdminRessources.tsx (routes corrigées)
- src/App.tsx (2 routes ajoutées)
```

## Build

```bash
npm run build
# ✅ Success in 7.02s
# ⚠️ Warning: chunk > 500kB (normal pour l'app complète)
```

## Conclusion

La séparation est **complète et fonctionnelle** :
- ✅ Aucun doublon
- ✅ Navigation logique
- ✅ Code maintenable
- ✅ Extensible
- ✅ Build réussi

Les 3 vues sont maintenant **indépendantes et ciblées** par rôle métier.
