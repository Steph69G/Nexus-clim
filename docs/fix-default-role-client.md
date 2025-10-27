# Fix: Rôle par défaut CLIENT pour les inscriptions publiques

## Problème identifié

**Symptôme** : Lorsqu'un utilisateur s'inscrit via `/register`, son profil est créé avec le rôle `'subcontractor'` au lieu de `'CLIENT'`.

**Cause racine** : Le trigger `handle_new_profile()` ne définissait pas de rôle par défaut lors de la création du profil.

## Solution implémentée

### 1. Migration : `20251027150000_fix_default_role_to_client.sql`

**Modifications** :
- Le trigger `handle_new_profile()` assigne maintenant un rôle par défaut
- Logique de détection :
  - Si `raw_user_meta_data->>'role'` existe → utilise ce rôle (création admin via Edge Function)
  - Sinon → assigne `'CLIENT'` par défaut (inscription publique)

**Code trigger** :
```sql
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, phone, role)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', ''),
      COALESCE(new.raw_user_meta_data->>'phone', ''),
      -- Si rôle fourni dans metadata (création admin), l'utiliser
      -- Sinon, défaut à 'CLIENT' pour inscriptions publiques
      COALESCE(new.raw_user_meta_data->>'role', 'CLIENT')
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ne jamais casser l'inscription
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Edge Function : `create-user/index.ts`

**Modification** : Ajout du rôle dans les `user_metadata` lors de la création admin.

**Avant** :
```typescript
user_metadata: {
  full_name,
}
```

**Après** :
```typescript
user_metadata: {
  full_name,
  phone,
  role,  // ✅ Ajouté pour que le trigger puisse le récupérer
}
```

## Comportement résultant

### Inscription publique (`/register`)
```typescript
// RegisterPage.tsx
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: fullName }
    // ⚠️ Pas de rôle spécifié
  }
});

// → Trigger détecte l'absence de role
// → Assigne role = 'CLIENT' par défaut ✅
```

### Création admin (`CreateUserModal` → Edge Function)
```typescript
// create-user/index.ts
await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    full_name,
    phone,
    role,  // ✅ Role spécifié par l'admin
  },
});

// → Trigger récupère le rôle des metadata
// → Assigne le rôle choisi (TECH, SAL, admin, etc.) ✅
```

## Flux de données

```
┌─────────────────────────────────────────────────────────┐
│ INSCRIPTION PUBLIQUE                                    │
├─────────────────────────────────────────────────────────┤
│ RegisterPage → signUp()                                 │
│   ↓                                                      │
│ auth.users créé (metadata: {full_name})                 │
│   ↓                                                      │
│ TRIGGER handle_new_profile()                            │
│   ↓                                                      │
│ raw_user_meta_data->>'role' = NULL                      │
│   ↓                                                      │
│ COALESCE(..., 'CLIENT') → 'CLIENT' ✅                   │
│   ↓                                                      │
│ profiles créé avec role = 'CLIENT'                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ CRÉATION ADMIN                                          │
├─────────────────────────────────────────────────────────┤
│ CreateUserModal → Edge Function create-user             │
│   ↓                                                      │
│ auth.users créé (metadata: {full_name, phone, role})    │
│   ↓                                                      │
│ TRIGGER handle_new_profile()                            │
│   ↓                                                      │
│ raw_user_meta_data->>'role' = 'TECH' (exemple)          │
│   ↓                                                      │
│ COALESCE('TECH', 'CLIENT') → 'TECH' ✅                  │
│   ↓                                                      │
│ profiles créé avec role = 'TECH'                        │
└─────────────────────────────────────────────────────────┘
```

## Tests de validation

### Test 1 : Inscription publique
```bash
# Action
1. Aller sur /register
2. Remplir le formulaire (email, password, nom)
3. Cliquer "S'inscrire"

# Vérification
SELECT user_id, email, role FROM profiles
WHERE email = '<email-test>';

# Résultat attendu
role = 'CLIENT' ✅
```

### Test 2 : Création admin → Technicien
```bash
# Action
1. Admin → Ressources → Équipe interne → Créer
2. Remplir formulaire + choisir rôle "Technicien"
3. Soumettre

# Vérification
SELECT user_id, email, role FROM profiles
WHERE email = '<email-test>';

# Résultat attendu
role = 'TECH' ✅
```

### Test 3 : Création admin → Sous-traitant
```bash
# Action
1. Admin → Ressources → Sous-traitants → Créer
2. Remplir formulaire + choisir rôle "Sous-traitant"
3. Soumettre

# Vérification
SELECT user_id, email, role FROM profiles
WHERE email = '<email-test>';

# Résultat attendu
role = 'ST' ✅
```

## Rôles disponibles

| Rôle DB | Rôle UI | Description | Création |
|---------|---------|-------------|----------|
| `CLIENT` | Client | Clients particuliers/entreprises | **Inscription publique** |
| `TECH` | Technicien | Techniciens salariés | Admin |
| `SAL` | Commercial | Commerciaux salariés | Admin |
| `ST` | Sous-traitant | Partenaires externes | Admin |
| `admin` | Administrateur | Administrateurs système | Admin |
| `USER` | (Legacy) | Anciens comptes mappés → ST | Admin |

## Impact sur l'existant

### ✅ Rétro-compatible
- Les profils existants conservent leur rôle actuel
- Seules les **nouvelles créations** sont affectées

### ✅ Pas de migration de données
- Aucune modification des données existantes
- Trigger agit uniquement sur les `INSERT` futurs

### ✅ Sécurité préservée
- RLS inchangé
- Permissions inchangées
- Le trigger reste `SECURITY DEFINER`

## Fichiers modifiés

```
✅ Créé :
- supabase/migrations/20251027150000_fix_default_role_to_client.sql
- docs/fix-default-role-client.md

✏️ Modifié :
- supabase/functions/create-user/index.ts (ajout role dans metadata)
```

## Recommandations futures

### Option A : Demande d'upgrade ST
Si un client veut devenir sous-traitant :
1. Créer une table `role_change_requests`
2. Workflow validation admin
3. Changement manuel du rôle après vérification

### Option B : Validation documents
- Certifications (Qualiclimafroid, etc.)
- SIRET / Kbis
- Assurance décennale
- Validation automatique ou manuelle

### Option C : Onboarding différencié
- Client : accès immédiat portail client
- ST : formulaire complémentaire (certifs, SIRET, zone d'intervention)
- Validation admin avant activation

## Conclusion

Le comportement par défaut est maintenant **cohérent** :
- ✅ Inscription publique → `CLIENT`
- ✅ Création admin → rôle choisi
- ✅ Pas de breaking change
- ✅ Trigger idempotent et sûr

Les nouveaux utilisateurs ne seront plus automatiquement considérés comme sous-traitants.
