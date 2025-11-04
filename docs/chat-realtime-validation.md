# ✅ Chat Realtime - Plan de validation et micro-patchs

## 📋 Checklist de validation (5 minutes)

### ✅ Test 1 : Insertion basique
- [ ] A envoie message → apparaît instantanément chez A et B (page + modale)
- [ ] Liste remonte : tri par `last_message_at`, `last_message_preview` mis à jour
- [ ] Badge non-lus visible si B n'est pas sur la conversation

### ✅ Test 2 : Non-lus
- [ ] B fermé (pas sur la conv) → `unread_count` ↑
- [ ] B ouvre conv → `markAsRead()` + `setLastRead()` → `unread_count = 0`
- [ ] Badge disparaît immédiatement

### ✅ Test 3 : Multi-onglets
- [ ] Même user, 2 onglets → pas de double incrément de non-lus
- [ ] Message envoyé d'un onglet apparaît dans l'autre

### ✅ Test 4 : Groupes
- [ ] Conv 3+ participants → chacun reçoit 1 event
- [ ] Pas d'explosion des non-lus

### ✅ Test 5 : Reconnexion
- [ ] Couper réseau 10s, envoyer depuis A, rétablir → B reçoit les nouveaux messages
- [ ] Vérifier logs : `[chat] realtime subscribed ✅`

---

## 🧩 Micro-patchs appliqués

### ✅ A. Écouter UPDATE/DELETE de messages

**Fonctionnalités ajoutées** :
- ✅ **Édition de message** : `updateMessage()` met à jour le texte + aperçu si dernier message
- ✅ **Suppression soft** : `softDeleteMessage()` recalcule l'aperçu sur l'avant-dernier message
- ✅ **Types de messages** : `🖼️ Image` et `📎 Fichier` dans l'aperçu

**Subscription** :
```typescript
channel.on("UPDATE", "chat_messages", (payload) => {
  if (payload.new.deleted_at) {
    softDeleteMessage(payload.new);
  } else {
    updateMessage(payload.new);
  }
});
```

**Store** :
- `updateMessage(msg)` : met à jour message dans liste + aperçu si dernier
- `softDeleteMessage(msg)` : marque `deleted_at` + recalcule aperçu
- `last_message_preview` : gère `'text'`, `'image'`, `'file'`

### ✅ B. Logs de reconnexion

**Status monitoring** :
```typescript
channel.subscribe((status) => {
  if (status === "SUBSCRIBED") console.debug("[chat] realtime subscribed ✅");
  if (status === "CHANNEL_ERROR") console.warn("[chat] realtime error ⚠️");
  if (status === "TIMED_OUT") console.warn("[chat] realtime timeout ⏱️");
  if (status === "CLOSED") console.warn("[chat] realtime closed 🔒");
});
```

---

## 🧪 Scénarios de test rapides

### S1 – Direct 1-1
**Action** : A envoie 3 messages pendant que B est sur la page liste (pas dans la conv)
**Attendu** : `unread_count = 3` ; B ouvre → badge = 0

### S2 – Groupe
**Action** : A et C envoient chacun 1 message
**Attendu** : B voit `unread_count = 2`

### S3 – Édition
**Action** : A édite le dernier message
**Attendu** : L'aperçu se met à jour sans dupliquer

### S4 – Suppression
**Action** : A supprime le dernier message
**Attendu** : L'aperçu recule sur l'avant-dernier

### S5 – Reconnect
**Action** : Couper réseau 10s, envoyer depuis A, rétablir réseau
**Attendu** : B reçoit les nouveaux messages + log `subscribed ✅`

---

## 📊 Performances et optimisations

### Performance liste (grosses conversations)
- ✅ Aperçu en cache via `last_message_preview` dans store
- ⚠️ TODO : Paginer messages (50/100) + scroll-to-load si > 1000 messages
- ✅ Sélecteurs shallow : `useMessages(convId)` déjà en place

### RLS & Index (sécurité/rapidité)
- ✅ RLS : policy SELECT vérifie participant
- ⚠️ Indexes recommandés :
  ```sql
  CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created
    ON chat_messages(conversation_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_conversation_participants_unique
    ON conversation_participants(conversation_id, user_id);

  CREATE INDEX IF NOT EXISTS idx_conversations_last_message
    ON conversations(last_message_at DESC NULLS LAST);
  ```

### Normalisation "read" robuste
- ✅ `lastReadByConv` + `currentUserId` en place
- ✅ Condition dans `addMessage()` :
  ```typescript
  const isFromOther = msg.sender_id !== currentUserId;
  const isAfterLastRead = !lastRead || new Date(msg.created_at) > new Date(lastRead);
  const unreadInc = isFromOther && isAfterLastRead ? 1 : 0;
  ```

---

## 🎯 Architecture finale

```
┌─────────────────────────────────────────────────────────────┐
│                    RootLayout (singleton)                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         useChatSubscription() (unique)                 │ │
│  │  • INSERT chat_messages  → addMessage()                │ │
│  │  • UPDATE chat_messages  → updateMessage() / softDelete│ │
│  │  • UPDATE conversations  → upsertConversation()        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  Zustand Store (global)                      │
│  • conversations: Record<id, ConversationMinimal>           │
│  • messages: Record<convId, ChatMessage[]>                  │
│  • lastReadByConv: Record<convId, ISO date>                 │
│  • currentUserId: string                                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────┬──────────────────────────────────────┐
│    TchatPage         │         ChatWindow                   │
│  • Lit conversations │  • Lit messages[convId]              │
│  • Tri + affiche     │  • Écoute realtime                   │
│  • Badge unread      │  • markAsRead()                      │
└──────────────────────┴──────────────────────────────────────┘
```

---

## 🚀 Résultat final

**Flux complet** :
1. ✅ Admin envoie message → `INSERT chat_messages`
2. ✅ Realtime broadcast → `useChatSubscription` reçoit
3. ✅ `addMessage()` met à jour **store.messages** ET **store.conversations**
4. ✅ **TchatPage** re-render → liste affiche nouveau `last_message_preview`
5. ✅ **ChatWindow** re-render → affiche nouveau message
6. ✅ **Badge unread** s'incrémente si autre user
7. ✅ **Édition/Suppression** → aperçu recalculé automatiquement

**Plus besoin de refresh manuel !** 🎉

---

## 📝 Notes techniques

### Types de messages supportés
- `text` : Texte brut
- `image` : 🖼️ Image
- `file` : 📎 Fichier
- `system` : Message système

### Gestion des erreurs
- Reconnexion automatique Supabase
- Logs discrets pour debug
- Pas de crash si profile absent (sender = undefined)

### Sécurité
- RLS sur toutes les tables
- User ne voit QUE ses conversations
- `lastReadByConv` local (pas de leak)
