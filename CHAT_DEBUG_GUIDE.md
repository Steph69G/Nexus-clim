# 🔍 Guide de Debug du Chat Realtime

## 1️⃣ Vérifier le Singleton du Store

**Au chargement de la page**, ouvre la console (F12) et cherche :

✅ **OK** :
```
[chatStore] Store registered as singleton ✅
```

❌ **PROBLÈME** (doublon détecté) :
```
[chatStore] ⚠️ Duplicate store instance detected!
```

Si tu vois le warning ⚠️, cela signifie que deux chemins d'import différents créent deux instances du store.

---

## 2️⃣ Vérifier la Subscription Realtime

**Au chargement de la page** (SANS ouvrir la modale), tu devrais voir :

✅ **OK** :
```
[useChatSubscription] Setting up singleton subscription
[chat] realtime subscribed ✅
```

❌ **PROBLÈME** :
- Si tu ne vois rien → la subscription ne démarre pas
- Si tu vois ça seulement après ouverture de la modale → mauvais endroit

---

## 3️⃣ Tester l'Envoi de Message

### Depuis la page `/communication/tchat` :

1. Sélectionne une conversation
2. Envoie un message
3. Dans la console, tu devrais voir :

✅ **OK** :
```
[ConversationView] Sending message: <ton message>
[ConversationView] Message sent successfully
[useChatSubscription] INSERT message (via realtime)
```

4. Le message doit apparaître **immédiatement** dans la page

---

## 4️⃣ Tester la Synchronisation Page ↔ Modale

1. Ouvre la page `/communication/tchat`
2. Ouvre la modale (bulle en bas à droite)
3. Envoie un message depuis la page
4. **Le message doit apparaître dans la modale instantanément**
5. Envoie un message depuis la modale
6. **Le message doit apparaître dans la page instantanément**

---

## 5️⃣ Tester après Rechargement

1. Envoie 3 messages
2. Recharge la page (Ctrl+Shift+R)
3. **Les 3 messages doivent être visibles**

Console attendue :
```
[chatStore] Store registered as singleton ✅
[useChatSubscription] Setting up singleton subscription
[TchatPage] Loaded conversations: X conversations
[ConversationView] Loading messages for conversation: <id>
[ConversationView] Loaded messages: 3 <array>
```

---

## 🐛 Problèmes Courants

### Le message "disparaît" après envoi
→ Le store n'est pas mis à jour après l'envoi
→ Vérifie que `sendMessage()` ne retourne pas d'erreur

### Les messages ne s'affichent pas après reload
→ `loadMessages()` ne met pas à jour le store
→ Vérifie que `setMessages(conversationId, msgs)` est bien appelé

### La page ne bouge pas, mais la modale oui
→ Doublon de store : deux instances différentes
→ Vérifie qu'il n'y a pas le warning ⚠️ dans la console
→ Vérifie que tous les imports utilisent `@/components/chat/chatStore`

---

## ✅ État Sain

Console au chargement :
```
[chatStore] Store registered as singleton ✅
[useChatSubscription] Setting up singleton subscription
[chat] realtime subscribed ✅
[TchatPage] Loaded conversations: 2 conversations
```

Console après envoi de message :
```
[ConversationView] Sending message: Hello
[ConversationView] Message sent successfully
<realtime INSERT event>
```

Comportement :
- Messages visibles après reload
- Messages apparaissent instantanément (realtime)
- Page et modale synchronisées
- Pas de duplicata
