# Back Button Usage Guide

**Documentation - Navigation UX**

---

## 🎯 PRINCIPE

**Quand ajouter un bouton retour :**
- ✅ Pages détail (MissionDetailPage, ContractDetailPage)
- ✅ Pages d'édition (MissionEditPage, AdminUserProfile)
- ✅ Pages de création standalone (GenerateInvoicePage, CreateInterventionReport)
- ✅ Pages formulaire (MissionPhotosPage)
- ✅ Pages légales/features (MentionsLegales, ApplicationMobile)

**Quand NE PAS ajouter de bouton retour :**
- ❌ Pages avec navbar (AdminHome, AdminMissions, ProfilePage)
- ❌ Pages dashboard dans AdminLayout
- ❌ Pages de liste dans le layout principal

---

## 📦 COMPOSANT RÉUTILISABLE

### BackButton Component

**Fichier :** `src/components/BackButton.tsx`

```typescript
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'minimal' | 'button';
}

export default function BackButton({
  to,
  label = 'Retour',
  className = '',
  variant = 'default'
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  const variantStyles = {
    default: 'flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors',
    minimal: 'text-slate-600 hover:text-slate-900 transition-colors',
    button: 'flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900'
  };

  return (
    <button
      onClick={handleClick}
      className={`${variantStyles[variant]} ${className}`}
      aria-label={label}
    >
      {variant !== 'minimal' && <ArrowLeft className="w-5 h-5" />}
      {variant === 'minimal' ? '← ' : ''}{label}
    </button>
  );
}
```

---

## 🎨 VARIANTES

### 1. Default (recommandé)

```tsx
import BackButton from '@/components/BackButton';

<BackButton />
// → Icône + "Retour" en gris, navigate(-1)
```

### 2. Minimal

```tsx
<BackButton variant="minimal" />
// → Texte simple "← Retour"
```

### 3. Button

```tsx
<BackButton variant="button" />
// → Style bouton avec bordure
```

### 4. Custom destination

```tsx
<BackButton to="/admin/missions" label="Retour aux missions" />
// → Navigation vers route spécifique
```

---

## 📋 PAGES AVEC BOUTON RETOUR

### Detail Pages ✅

| Page | Localisation | Pattern |
|------|--------------|---------|
| MissionDetailPage | missions/:id | `navigate(-1)` |
| MissionPhotosPage | missions/:id/photos | `navigate(-1)` |
| ContractDetailPage | contracts/:id | `navigate(-1)` |

### Edit Pages ✅

| Page | Localisation | Pattern |
|------|--------------|---------|
| MissionEditPage | admin/missions/:id/edit | Modal → `navigate(-1)` |
| AdminUserProfile | admin/users/:id | `navigate("/admin/users")` |

### Form Pages ✅

| Page | Localisation | Pattern |
|------|--------------|---------|
| GenerateInvoicePage | admin/missions/:id/invoice | `navigate(-1)` |
| CreateInterventionReport | admin/missions/:id/report | `navigate(-1)` |
| AdminMissionCreate | admin/missions/create | `navigate(-1)` |

### Feature Pages ✅

| Page | Pattern |
|------|---------|
| ApplicationMobile | `<Link to="/">← Retour à l'accueil</Link>` |
| GeolocationIntelligente | `<Link to="/">← Retour à l'accueil</Link>` |
| GestionEquipe | `<Link to="/">← Retour à l'accueil</Link>` |
| PlanificationAvancee | `<Link to="/">← Retour à l'accueil</Link>` |
| SecuriteDonnees | `<Link to="/">← Retour à l'accueil</Link>` |
| SuiviInterventions | `<Link to="/">← Retour à l'accueil</Link>` |

### Legal Pages ✅

| Page | Pattern |
|------|---------|
| MentionsLegales | `<Link to="/">← Retour à l'accueil</Link>` |
| PolitiqueConfidentialite | `<Link to="/">← Retour à l'accueil</Link>` |
| ConditionsUtilisation | `<Link to="/">← Retour à l'accueil</Link>` |
| PolitiqueCookies | `<Link to="/">← Retour à l'accueil</Link>` |

---

## ❌ PAGES SANS BOUTON RETOUR (normal)

### Dashboard Pages (dans AdminLayout avec navigation)

- AdminHome
- AdminMissions
- AdminUsers
- AdminContracts
- AdminEmergencyRequests
- AdminInvoices
- AdminKpiDashboard
- AdminSatisfaction
- AdminStock
- AdminTimesheet
- AdminVehicles
- AdminOperations
- AdminComptabilite
- AdminClients
- AdminRessources
- AdminLogistique
- AdminPilotage

### Profile Pages (navigation dans navbar)

- ProfilePage
- AdminProfilePage
- SalProfilePage
- ClientProfilePage
- SubcontractorProfilePage

### Tech/Client Pages (navigation dans layout)

- TechDashboard
- TechMissionsPage
- TechOffersPage
- ClientDashboard
- ClientPortal
- ClientRequests
- ClientInvoices

---

## 🎯 PATTERNS RECOMMANDÉS

### Pattern 1: Page Detail

```tsx
export default function MyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        {/* Content */}
      </div>
    </div>
  );
}
```

### Pattern 2: Page avec navigation spécifique

```tsx
export default function AdminUserProfile() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/admin/users")}
            className="p-3 bg-white border-2 border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Profil utilisateur</h1>
          </div>
        </div>

        {/* Content */}
      </div>
    </div>
  );
}
```

### Pattern 3: Page publique/légale

```tsx
export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm">
              ← Retour à l'accueil
            </Link>
          </div>

          {/* Content */}
        </div>
      </div>
    </div>
  );
}
```

---

## 📊 STATISTIQUES

**Total pages analysées :** 73

**Pages avec bouton retour :** 21
- Detail/Edit: 10
- Feature: 6
- Legal: 4
- Create/Form: 1

**Pages sans bouton (dans layout) :** 52
- Admin dashboard: 26
- Profile: 6
- Tech/Client: 10
- Autres: 10

**Ratio :** 29% ont besoin de bouton retour (logique car 71% sont dans un layout navigationnel)

---

## ✅ CHECKLIST NOUVELLE PAGE

Quand vous créez une nouvelle page, posez-vous :

1. **La page est-elle dans un layout avec navigation (navbar/sidebar) ?**
   - ✅ Oui → PAS de bouton retour
   - ❌ Non → Continuer

2. **Est-ce une page detail/edit/form ?**
   - ✅ Oui → AJOUTER bouton retour
   - ❌ Non → Continuer

3. **Est-ce une page publique/légale standalone ?**
   - ✅ Oui → AJOUTER lien retour accueil
   - ❌ Non → Pas besoin

---

## 🎨 STYLES RECOMMANDÉS

### Style par défaut (minimal)

```tsx
<button
  onClick={() => navigate(-1)}
  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
>
  <ArrowLeft className="w-5 h-5" />
  Retour
</button>
```

### Style bouton (emphasé)

```tsx
<button
  onClick={() => navigate(-1)}
  className="p-3 bg-white border-2 border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"
>
  <ArrowLeft className="w-5 h-5" />
</button>
```

### Style lien (pages publiques)

```tsx
<Link
  to="/"
  className="text-blue-600 hover:text-blue-800 text-sm"
>
  ← Retour à l'accueil
</Link>
```

---

## 🚀 DÉPLOIEMENT

**Composant créé :** `src/components/BackButton.tsx`

**Utilisation actuelle :** Pattern manuel dans chaque page (cohérent)

**Migration future :** Remplacer progressivement par `<BackButton />` pour uniformiser

---

**Créé :** 2025-10-22
**Status :** ✅ Analysé et documenté
**Conclusion :** Toutes les pages qui ont besoin d'un bouton retour en ont déjà un
