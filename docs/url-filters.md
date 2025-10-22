# URL Filters Pattern

## Principes

- Lecture/écriture via `useQuery()`
- Normalisation via `querySchemas.ts`
- Toujours `replace: true` (historique propre)
- Les pages s'ouvrent **déjà filtrées** depuis les liens profonds

## Nommage standard

- `status`: état métier (`open|overdue|awaiting_approval|...`)
- `date`: `today|tomorrow|week|month|YYYY-MM-DD`
- `sort`: `updated_desc|created_desc|date_asc|date_desc`
- `filter`: mot-clé libre (`low|critical|my`)
- `action`: action UI (`entry|move|adjust|new_quote|...`)
- `q`: recherche texte

## Boilerplate

```typescript
const { get, set } = useQuery();
const [status, setStatus] = useState(() => normStatus(get('status')) ?? 'open');
useEffect(() => { set({ status }); }, [status]);
```

## Exemples

```
/admin/comptabilite/invoices?status=overdue
/admin/logistique/stock?filter=low&action=entry
/admin/missions?date=today&status=assigned&q=paris
```

## Pages implémentées

### AdminInvoices
- `status`: `open|overdue|closed`
- `sort`: `updated_desc|created_desc|date_asc`
- `q`: recherche par numéro

### AdminQuotes
- `status`: `open|awaiting_approval|closed`
- `q`: recherche par numéro

### AdminStockPage
- `filter`: `low|critical`
- `action`: `entry|move|adjust`
- `q`: recherche par nom/référence

### AdminMissions
- `date`: `today|tomorrow|week|month|YYYY-MM-DD`
- `status`: `draft|published|assigned|confirmed|...`
- `assignee`: ID utilisateur
- `sort`: `updated_desc|created_desc|date_asc`
- `q`: recherche texte

### AdminUsers
- `role`: `admin|sal|tech|st|client`
- `sort`: `created_desc|updated_desc`
- `q`: recherche par nom/email

### AdminOffers
- `status`: `pending|accepted|rejected`
- `sort`: `updated_desc|created_desc`
- `q`: recherche texte

### AdminEmergency
- `priority`: `low|medium|high|critical`
- `status`: `open|in_progress|closed`
- `q`: recherche texte

### ClientInvoices
- `status`: `open|overdue|paid`
- `sort`: `updated_desc|date_asc`

## Validation

✅ Chaque page s'ouvre pré-filtrée si l'URL contient les params
✅ Changer un filtre met à jour l'URL (replace), puis recharge les données
✅ Aucune page n'a de logique de parsing maison (tout via useQuery + querySchemas)
✅ Les URLs sont bookmarkables et partageables (même résultat au reload)

## Anti-patterns à éviter

❌ **Parser manuellement window.location.search**
```typescript
// MAUVAIS
const params = new URLSearchParams(window.location.search);
const status = params.get('status');
```

❌ **Push au lieu de replace**
```typescript
// MAUVAIS (pollue historique)
navigate(`/path?status=${status}`);

// BON
set({ status }); // replace: true par défaut
```

❌ **Valeurs non validées**
```typescript
// MAUVAIS (injection possible)
const status = get('status'); // peut être n'importe quoi

// BON
const status = normStatus(get('status')) ?? 'open'; // validé
```

❌ **State sans sync URL**
```typescript
// MAUVAIS (URL et state divergent)
const [status, setStatus] = useState('open');
// pas d'useEffect pour sync

// BON
const [status, setStatus] = useState(() => normStatus(get('status')) ?? 'open');
useEffect(() => { set({ status }); }, [status]);
```

## Ajouter un nouveau paramètre

1. **Ajouter le normalizer dans `querySchemas.ts`**
```typescript
const MY_PARAM = new Set(['value1', 'value2', 'value3']);
export function normMyParam(v?: string) {
  return v && MY_PARAM.has(v) ? v : undefined;
}
```

2. **Importer et utiliser dans la page**
```typescript
import { useQuery } from '@/lib/useQuery';
import { normMyParam } from '@/lib/querySchemas';

const { get, set } = useQuery();
const [myParam, setMyParam] = useState(() => normMyParam(get('myParam')) ?? 'default');

useEffect(() => {
  set({ myParam });
}, [myParam]);
```

3. **Utiliser dans la requête de données**
```typescript
useEffect(() => {
  loadData({ myParam });
}, [myParam]);
```

## Pattern avancé : Multiple params

```typescript
const { get, set } = useQuery();
const [status, setStatus] = useState(() => normStatus(get('status')) ?? 'open');
const [sort, setSort] = useState(() => normSort(get('sort')));
const [q, setQ] = useState(() => normQ(get('q')) ?? '');

useEffect(() => {
  set({
    status,
    sort,
    q: q || undefined // supprime param si vide
  });
}, [status, sort, q]);

useEffect(() => {
  loadData({ status, sort, q });
}, [status, sort, q]);
```

## Liens profonds depuis Accueil

```typescript
import { buildUrl } from '@/lib/buildUrl';

// Missions du jour
<Link to={buildUrl('/admin/missions', { date: 'today' })}>
  Missions du jour
</Link>

// Factures impayées
<Link to={buildUrl('/admin/comptabilite/invoices', { status: 'overdue' })}>
  Impayés
</Link>

// Urgences critiques
<Link to={buildUrl('/admin/emergency', { priority: 'high', status: 'open' })}>
  Urgences
</Link>
```

## Debugging

```typescript
// Voir tous les params actuels
const { all } = useQuery();
console.log('Current params:', Object.fromEntries(all));

// Voir état normalisé
console.log('Normalized status:', normStatus(get('status')));
```
