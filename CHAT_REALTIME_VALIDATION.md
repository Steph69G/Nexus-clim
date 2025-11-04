# 🧪 Validation Finale du Chat Realtime

## ✅ Checklist de Préparation

Tous les éléments suivants ont été mis en place :

- [x] **Store singleton** avec guard de détection de duplicata
- [x] **Imports normalisés** : tous utilisent `@/components/chat/chatStore`
- [x] **Subscription globale** : `useChatSubscription()` appelé dans `RootLayout` (pas dans modale)
- [x] **Logs de debug** : traces complètes pour diagnostiquer
- [x] **Hydratation du store** : `loadMessages()` met à jour le store
- [x] **Lecture reactive** : `ConversationView` lit depuis le store, pas depuis props

---

## 🔍 Tests à Réaliser (dans l'ordre)

### **Test 1️⃣ : Vérification du Singleton au Boot**

1. Ouvre l'application
2. Ouvre la console (F12)
3. **SANS ouvrir la modale**, vérifie les logs :

**✅ Logs attendus :**
```
[chatStore] Store registered as singleton ✅
[useChatSubscription] Setting up singleton subscription
[chat] channel created: [Object]
[chat] realtime subscribed ✅
```

**❌ Si tu vois ça :**
```
[chatStore] ⚠️ Duplicate store instance detected!
```
→ **STOP** : il reste un import avec un chemin différent. Cherche dans le code.

---

### **Test 2️⃣ : Envoi de Message depuis la Page**

1. Va sur `/communication/tchat`
2. Sélectionne une conversation
3. Tape un message et envoie
4. Vérifie la console :

**✅ Logs attendus :**
```
[ConversationView] 📤 Sending message: { conversationId: "...", text: "test" }
[ConversationView] ✅ Message sent successfully
[chat] 🔔 INSERT received from realtime: [payload]
[chat] 📥 Adding message to store: [message with sender]
```

5. **Le message doit rester visible dans la page** (pas disparaître)

**❌ Si le message disparaît :**
→ Le realtime INSERT n'arrive pas ou le store n'est pas mis à jour

---

### **Test 3️⃣ : Synchronisation Page ↔ Modale**

1. Reste sur `/communication/tchat` avec une conversation ouverte
2. Ouvre la modale (bulle en bas à droite)
3. Envoie un message **depuis la page**
4. **Le message doit apparaître dans la modale instantanément**
5. Envoie un message **depuis la modale**
6. **Le message doit apparaître dans la page instantanément**

**✅ Résultat attendu :**
- Les deux interfaces restent parfaitement synchronisées
- Pas de delay ou de "refresh" nécessaire
- Console montre les INSERT realtime pour chaque envoi

---

### **Test 4️⃣ : Persistance après Rechargement**

1. Envoie 3 messages dans une conversation
2. Recharge la page (Ctrl+Shift+R)
3. Ouvre la console et vérifie :

**✅ Logs attendus :**
```
[chatStore] Store registered as singleton ✅
[useChatSubscription] Setting up singleton subscription
[chat] realtime subscribed ✅
[TchatPage] Loaded conversations: X conversations
[ConversationView] Loading messages for conversation: <id>
[ConversationView] Loaded messages: 3 [array with 3 items]
```

4. **Les 3 messages doivent être visibles dans la page**

**❌ Si la liste est vide :**
→ `loadMessages()` ne met pas à jour le store OU la query Supabase échoue

---

## 🐛 Diagnostics Rapides

### **Symptôme : "La page ne bouge pas, mais la modale oui"**

**Cause :** Deux instances de store (imports différents)

**Vérif :**
```bash
# Cherche tous les imports du store
rg 'from.*chatStore' src/ --no-heading
```

**Fix :**
- Tous doivent utiliser **exactement** : `from "@/components/chat/chatStore"`
- Aucun chemin relatif (`./chatStore`, `../../chatStore`)

---

### **Symptôme : "Le realtime ne démarre pas"**

**Cause :** `useChatSubscription()` pas appelé au bon endroit

**Vérif :**
- Doit être dans `RootLayout.tsx` ligne ~25
- **PAS** dans la modale ou dans `TchatPage`
- **PAS** derrière une condition (`if (user)`, `if (isOpen)`)

---

### **Symptôme : "Les messages disparaissent après envoi"**

**Cause :** Realtime INSERT n'arrive pas

**Vérif :**
1. Console → tab Network → WS (WebSocket)
2. Tu dois voir une connexion active vers `realtime-*.supabase.co`
3. Envoie un message → tu dois voir un frame WS avec l'INSERT

**Causes possibles :**
- RLS trop restrictive sur `chat_messages`
- Realtime pas activé sur la table dans Supabase Dashboard
- Le user n'est pas participant de la conversation

---

### **Symptôme : "Messages vides après reload"**

**Cause :** `loadMessages()` ne met pas à jour le store

**Vérif :**
```typescript
// ConversationView.tsx ~ligne 103
const loadMessages = async () => {
  const msgs = await fetchConversationMessages(conversationId);
  setMessages(conversationId, msgs); // ⬅️ Cette ligne DOIT être présente
};
```

---

## 📊 État Attendu du Store (Debug Window)

Ouvre la console et tape :
```javascript
window.__CHAT_STORE__.getState()
```

Tu devrais voir :
```javascript
{
  conversations: {
    "uuid-1": { id: "uuid-1", title: "Conv 1", ... },
    "uuid-2": { id: "uuid-2", title: "Conv 2", ... }
  },
  messages: {
    "uuid-1": [
      { id: "msg-1", conversation_id: "uuid-1", text: "Hello", ... },
      { id: "msg-2", conversation_id: "uuid-1", text: "World", ... }
    ]
  },
  activeConversationId: "uuid-1",
  isOpen: false,
  unreadCount: 2
}
```

---

## ✅ Critères de Succès Final

- [ ] Console montre "Store registered as singleton ✅" **une seule fois**
- [ ] Aucun warning "Duplicate store instance detected"
- [ ] Realtime démarre au boot (pas à l'ouverture de la modale)
- [ ] Messages envoyés restent affichés (pas de disparition)
- [ ] Page et modale synchronisées en temps réel
- [ ] Messages persistent après rechargement
- [ ] Scroll auto vers le bas après envoi

---

## 🚀 Si Tout Fonctionne

Félicitations ! Le système de chat realtime est opérationnel :

- ✅ Store unique et singleton
- ✅ Subscription Realtime globale
- ✅ Synchronisation bidirectionnelle
- ✅ Persistance en base de données
- ✅ Hydratation du store au mount

Tu peux maintenant retirer les logs de debug si tu veux (ou les garder pour monitoring).

---

## 🆘 Si Ça Ne Marche Toujours Pas

Copie/colle dans le chat :

1. **Tous les logs de la console au boot** (du début jusqu'à "realtime subscribed")
2. **Les logs après envoi d'un message**
3. La réponse de cette commande :
   ```bash
   rg 'from.*chatStore' src/ --no-heading
   ```

On identifiera le problème en 1 passe. 🎯
