# 🧹 Cache Vite Purgé + Dedupe Activé

## ✅ Changements Appliqués

### **1️⃣ Vite Config - Anti-Doublons** (`vite.config.ts`)

```typescript
resolve: {
  dedupe: ["react", "react-dom", "zustand"]  // ← Force une seule instance
},
optimizeDeps: {
  include: ["zustand", "react", "react-dom"]  // ← Optimisation unique
}
```

**Pourquoi ?**
- Vite peut créer plusieurs instances de zustand si le code-splitting sépare les chunks
- `dedupe` garantit qu'un seul module zustand existe dans tout le bundle
- Évite le symptôme "la modale voit le store, mais pas la page"

---

### **2️⃣ Sondes de Debug Ajoutées**

#### Dans `chatStore.ts` :
```typescript
console.log("[chatStore] Store registered as singleton ✅");
console.log("[chatStore] Zustand instances count:", X);
```

#### Dans `ConversationView.tsx` et `ChatWindow.tsx` :
```typescript
console.log("[Component] 🔍 Store check:", {
  storeMatches: useChatStore === window.__CHAT_STORE__,
  zustandInstancesCount: window.__ZUSTAND_INSTANCES__?.size
});
```

---

## 🧪 Checklist de Test (après Ctrl+Shift+R)

### **1️⃣ Vérifier le Singleton Zustand**

Console attendue :
```
[chatStore] Store registered as singleton ✅
[chatStore] Zustand instances count: 1 ✅
```

❌ Si tu vois :
```
[chatStore] Zustand instances count: 2 ⚠️ MULTIPLE INSTANCES!
```
→ Il reste un problème de bundling (mais normalement résolu avec dedupe)

---

### **2️⃣ Vérifier que Page et Modale Lisent le Même Store**

Quand tu ouvres `/communication/tchat` :
```
[ConversationView] 🔍 Store check: { storeMatches: true, zustandInstancesCount: 1 }
```

Quand tu ouvres la modale (bulle) :
```
[ChatWindow] 🔍 Store check: { storeMatches: true, zustandInstancesCount: 1 }
```

✅ **`storeMatches: true`** = les deux composants utilisent la même instance
❌ **`storeMatches: false`** = doublon (ne devrait plus arriver)

---

### **3️⃣ Vérifier le Realtime**

Console complète attendue :
```
[chatStore] Store registered as singleton ✅
[chatStore] Zustand instances count: 1 ✅
[useChatSubscription] Setting up singleton subscription
[chat] realtime subscribed ✅
```

Après envoi de message :
```
[ConversationView] 📤 Sending message: { conversationId: "...", text: "test" }
[ConversationView] ✅ Message sent successfully
[chat] 🔔 INSERT received from realtime: [payload]
[chat] 📥 Adding message to store: [message]
```

---

### **4️⃣ Test de Synchronisation Final**

1. Va sur `/communication/tchat`
2. Sélectionne une conversation
3. Envoie un message
4. **Le message doit rester visible**
5. Ouvre la modale (bulle)
6. **Le message doit être visible dans la modale aussi**
7. Envoie depuis la modale
8. **Le message doit apparaître dans la page instantanément**

---

## 🎯 Résultat Attendu

| Élément | État Attendu |
|---------|--------------|
| Store singleton | ✅ 1 instance |
| Zustand dedupe | ✅ 1 instance |
| Realtime activé | ✅ sur chat_messages |
| Page lit le store | ✅ storeMatches: true |
| Modale lit le store | ✅ storeMatches: true |
| Messages persistents | ✅ après envoi |
| Synchro bidirectionnelle | ✅ page ↔ modale |

---

## 🐛 Si Ça Ne Marche Toujours Pas

Copie/colle **TOUS les logs de la console** depuis le boot jusqu'après l'envoi d'un message, incluant :

1. Les logs `[chatStore]`
2. Les logs `[useChatSubscription]`
3. Les logs `[ConversationView] 🔍 Store check`
4. Les logs `[ChatWindow] 🔍 Store check`
5. Les logs après envoi (`📤`, `🔔`, `📥`)

Avec ces infos, on identifiera le problème en 1 passe. 🎯
