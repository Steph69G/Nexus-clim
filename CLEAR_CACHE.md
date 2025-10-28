# Comment vider le cache du navigateur

Si vous rencontrez l'erreur `PGRST200` concernant `user_clients`, c'est que votre navigateur utilise l'ancienne version du code JavaScript.

## Solution rapide

### Chrome / Edge / Brave
1. Appuyez sur `Ctrl + Shift + R` (Windows/Linux) ou `Cmd + Shift + R` (Mac)
2. OU : Ouvrez DevTools (F12) → Onglet "Network" → Cochez "Disable cache" → Rechargez

### Firefox
1. Appuyez sur `Ctrl + Shift + R` (Windows/Linux) ou `Cmd + Shift + R` (Mac)
2. OU : Ouvrez DevTools (F12) → Onglet "Network" → Cochez "Disable cache" → Rechargez

### Safari
1. Ouvrez le menu "Develop" → "Empty Caches"
2. OU : `Cmd + Option + E` puis rechargez la page

## Vérification

Après avoir vidé le cache, la recherche de clients devrait fonctionner correctement sans l'erreur `PGRST200`.

## Détails techniques

L'ancienne version du code tentait une jointure automatique entre `profiles` et `user_clients` :
```typescript
// ❌ Ancienne version (causait l'erreur)
.select(`
  user_id,
  full_name,
  user_clients (company_name, siret)
`)
```

La nouvelle version fait deux requêtes séparées :
```typescript
// ✅ Nouvelle version (fonctionne)
// 1. Récupérer les profiles
.from("profiles").select("user_id, full_name, ...")

// 2. Récupérer les user_clients correspondants
.from("user_clients").select("...").in("user_id", userIds)
```
