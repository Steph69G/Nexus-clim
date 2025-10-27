# Déploiement de la correction Edge Function

## Problème résolu

L'Edge Function `send-conversation-invite` avait des problèmes CORS qui empêchaient l'appel depuis le frontend.

## Modifications apportées

### 1. Headers CORS corrigés
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
```

### 2. Gestion OPTIONS (preflight)
```typescript
if (req.method === "OPTIONS") {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
```

### 3. Toutes les erreurs retournent maintenant les headers CORS
- Erreurs de parsing JSON → 400 avec CORS
- Erreurs d'authentification → 401 avec CORS
- Conversation non trouvée → 404 avec CORS
- Pas participant → 403 avec CORS
- Template manquant → 500 avec CORS
- Erreur Resend → 500 avec CORS

## Comment déployer

### Option 1 : Via Supabase Dashboard (recommandé)

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Dans le menu de gauche, cliquez sur "Edge Functions"
4. Trouvez `send-conversation-invite`
5. Cliquez sur "Deploy"
6. Copiez/collez le contenu de `/tmp/cc-agent/57318813/project/supabase/functions/send-conversation-invite/index.ts`
7. Cliquez "Deploy"

### Option 2 : Via Supabase CLI

```bash
# Si vous avez le CLI installé localement
supabase functions deploy send-conversation-invite
```

## Test après déploiement

1. Ouvrez l'application
2. Allez dans une conversation
3. Cliquez sur "Inviter"
4. Entrez un email
5. Choisissez "Envoyer par email"
6. Cliquez "Inviter"
7. ✅ L'email devrait être envoyé sans erreur CORS

## Vérification des logs

Dans le dashboard Supabase :
1. Edge Functions → send-conversation-invite
2. Onglet "Logs"
3. Vérifiez les logs d'exécution

## Migrations à appliquer avant

Assurez-vous que cette migration est appliquée :
- `20251027160000_fix_conversation_invitations_upsert.sql`

Elle ajoute :
- Colonne `resent_count`
- Colonne `send_method`
- Index unique partiel sur `(conversation_id, invited_email) WHERE status='pending'`

## Comportement attendu

### Mode "Copier le lien" (manual)
```json
{
  "success": true,
  "message": "Invitation créée. Partagez le lien manuellement.",
  "invitation_id": "uuid",
  "invitation_link": "https://app.com/register?invitation=token",
  "send_method": "manual"
}
```

### Mode "Envoyer par email" (email)
```json
{
  "success": true,
  "message": "Invitation envoyée par email avec succès",
  "invitation_id": "uuid",
  "email_id": "resend-email-id",
  "send_method": "email"
}
```

## Troubleshooting

### Erreur "Email template not found"
Vous devez créer le template `conversation_invitation` dans la table `email_templates` :

```sql
INSERT INTO email_templates (
  template_name,
  subject,
  body_html,
  body_text,
  is_active
) VALUES (
  'conversation_invitation',
  '{{inviter_name}} vous invite à rejoindre une conversation',
  '<h1>Invitation à une conversation</h1>
   <p>{{inviter_name}} vous invite à rejoindre : <strong>{{conversation_title}}</strong></p>
   <p>{{message}}</p>
   <p><a href="{{invitation_link}}">Cliquez ici pour accepter</a></p>
   <p>Cette invitation expire le {{expiration_date}}</p>',
  '{{inviter_name}} vous invite à rejoindre : {{conversation_title}}

   {{message}}

   Lien : {{invitation_link}}

   Expire le {{expiration_date}}',
  true
);
```

### Erreur "RESEND_API_KEY not configured"
Mode email simulé, le lien est quand même généré. Configurez `RESEND_API_KEY` dans les secrets de l'Edge Function.

### Erreur CORS persiste
1. Vérifiez que la fonction est bien redéployée
2. Videz le cache du navigateur (Ctrl+Shift+R)
3. Vérifiez dans l'onglet Network que la requête OPTIONS retourne 200
