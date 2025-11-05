import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ChatMessageWithSender, ConversationWithParticipants } from "@/types/database";

type ConversationMinimal = {
  id: string;
  title: string | null;
  type?: string;
  last_message_at: string | null;
  last_message_preview?: string | null;
  last_message_sender_id?: string | null;
  unread_count?: number;
};

type ChatState = {
  isOpen: boolean;
  unreadCount: number;
  conversations: Record<string, ConversationMinimal>;
  messages: Record<string, ChatMessageWithSender[]>;
  activeConversationId: string | null;
  lastReadByConv: Record<string, string | null>;
  currentUserId: string | null;

  open: () => void;
  close: () => void;
  toggleOpen: () => void;
  setUnread: (n: number) => void;
  incrementUnread: () => void;

  setCurrentUserId: (userId: string) => void;
  setConversations: (conversations: ConversationWithParticipants[]) => void;
  upsertConversation: (conversation: any) => void;
  updateConversation: (conversationId: string, updates: Partial<ConversationMinimal>) => void;

  setMessages: (conversationId: string, messages: ChatMessageWithSender[]) => void;
  addMessage: (message: any) => void;
  updateMessage: (message: any) => void;
  softDeleteMessage: (message: any) => void;

  setActiveConversation: (conversationId: string | null) => void;

  setLastRead: (convId: string, iso: string) => void;

  refreshNeeded: boolean;
  triggerRefresh: () => void;
  clearRefresh: () => void;
};

export const useChatStore = create<ChatState>()(
  devtools((set, get) => ({
    isOpen: false,
    unreadCount: 0,
    conversations: {},
    messages: {},
    activeConversationId: null,
    refreshNeeded: false,
    lastReadByConv: {},
    currentUserId: null,

    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggleOpen: () =>
      set((s) => ({
        isOpen: !s.isOpen,
      })),
    setUnread: (n) => set({ unreadCount: n }),
    incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),

    setCurrentUserId: (userId) => set({ currentUserId: userId }),

    setConversations: (list) =>
      set((state) => {
        const next: Record<string, ConversationMinimal> = {};
        let changed = false;

        for (const conv of list) {
          const prev = state.conversations[conv.id];
          const normalized: ConversationMinimal = {
            id: conv.id,
            title: conv.title ?? null,
            type: conv.type ?? undefined,
            last_message_at: conv.last_message_at ?? null,
            last_message_preview: (conv as any).last_message?.message_text ?? null,
            last_message_sender_id: (conv as any).last_message?.sender_id ?? null,
            unread_count: Number((conv as any).unread_count ?? 0),
          };

          const merged = prev
            ? JSON.stringify(prev) === JSON.stringify({ ...prev, ...normalized })
              ? prev
              : { ...prev, ...normalized }
            : normalized;

          if (state.conversations[conv.id] !== merged) changed = true;
          next[conv.id] = merged;
        }

        for (const id in state.conversations) {
          if (!next[id]) changed = true;
        }

        if (!changed) return {};
        return { conversations: next };
      }),

    upsertConversation: (conversation) =>
      set((state) => ({
        conversations: {
          ...state.conversations,
          [conversation.id]: {
            ...state.conversations[conversation.id],
            ...conversation,
          },
        },
      })),

    updateConversation: (conversationId, updates) =>
      set((state) => ({
        conversations: {
          ...state.conversations,
          [conversationId]: {
            ...state.conversations[conversationId],
            ...updates,
          },
        },
      })),

    setMessages: (conversationId, messages) =>
      set((state) => ({
        messages: { ...state.messages, [conversationId]: messages || [] },
      })),

    addMessage: (msg) =>
      set((state) => {
        const conversationId = msg.conversation_id;
        const list = state.messages[conversationId] ?? [];
        if (list.some((m) => m.id === msg.id)) return {};

        const updated = [...list, msg].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const conv = state.conversations[conversationId];
        const me = state.currentUserId;
        const lastRead = state.lastReadByConv[conversationId] ?? null;
        const isFromOther = msg.sender_id !== me;
        const isAfterLastRead = !lastRead || new Date(msg.created_at) > new Date(lastRead);

        const messagePreview = msg.message_type === 'image'
          ? '🖼️ Image'
          : msg.message_type === 'file'
          ? '📎 Fichier'
          : msg.message_text ?? null;

        return {
          messages: {
            ...state.messages,
            [conversationId]: updated,
          },
          conversations: {
            ...state.conversations,
            [conversationId]: {
              ...(conv ?? { id: conversationId, title: null, last_message_at: null }),
              last_message_at: msg.created_at,
              last_message_preview: messagePreview,
              last_message_sender_id: msg.sender_id ?? null,
              unread_count: (conv?.unread_count ?? 0) + (isFromOther && isAfterLastRead ? 1 : 0),
            },
          },
        };
      }),

    updateMessage: (msg) =>
      set((state) => {
        const conversationId = msg.conversation_id;
        const list = state.messages[conversationId] ?? [];
        const updated = list.map((m) => (m.id === msg.id ? { ...m, ...msg } : m));

        const conv = state.conversations[conversationId];
        const lastMsg = updated[updated.length - 1];
        const isLastMessage = lastMsg?.id === msg.id;

        if (!isLastMessage) {
          return {
            messages: { ...state.messages, [conversationId]: updated },
          };
        }

        const messagePreview = msg.message_type === 'image'
          ? '🖼️ Image'
          : msg.message_type === 'file'
          ? '📎 Fichier'
          : msg.message_text ?? null;

        return {
          messages: { ...state.messages, [conversationId]: updated },
          conversations: {
            ...state.conversations,
            [conversationId]: {
              ...conv,
              last_message_preview: messagePreview,
            },
          },
        };
      }),

    softDeleteMessage: (msg) =>
      set((state) => {
        const conversationId = msg.conversation_id;
        const list = state.messages[conversationId] ?? [];
        const updated = list.map((m) =>
          m.id === msg.id ? { ...m, deleted_at: msg.deleted_at } : m
        );

        const conv = state.conversations[conversationId];
        const lastMsg = updated[updated.length - 1];
        const isLastMessage = lastMsg?.id === msg.id;

        if (!isLastMessage) {
          return {
            messages: { ...state.messages, [conversationId]: updated },
          };
        }

        const visibleMessages = updated.filter((m) => !m.deleted_at);
        const newLastMsg = visibleMessages[visibleMessages.length - 1];

        const messagePreview = newLastMsg
          ? newLastMsg.message_type === 'image'
            ? '🖼️ Image'
            : newLastMsg.message_type === 'file'
            ? '📎 Fichier'
            : newLastMsg.message_text ?? null
          : null;

        return {
          messages: { ...state.messages, [conversationId]: updated },
          conversations: {
            ...state.conversations,
            [conversationId]: {
              ...conv,
              last_message_preview: messagePreview,
              last_message_sender_id: newLastMsg?.sender_id ?? null,
              last_message_at: newLastMsg?.created_at ?? null,
            },
          },
        };
      }),

    setActiveConversation: (conversationId) =>
      set((s) => ({
        activeConversationId: conversationId,
        conversations: conversationId
          ? {
              ...s.conversations,
              [conversationId]: {
                ...s.conversations[conversationId],
                unread_count: 0,
              },
            }
          : s.conversations,
      })),

    setLastRead: (convId, iso) =>
      set((s) => ({
        lastReadByConv: { ...s.lastReadByConv, [convId]: iso },
        conversations: {
          ...s.conversations,
          [convId]: {
            ...s.conversations[convId],
            unread_count: 0,
          },
        },
      })),

    triggerRefresh: () => set({ refreshNeeded: true }),
    clearRefresh: () => set({ refreshNeeded: false }),
  }))
);

export const useConversationsObject = () =>
  useChatStore((s) => s.conversations);

// Sélecteur: total des non-lus hors conversation active
export const useUnreadTotalExcludingActive = () =>
  useChatStore((s) => {
    const active = s.activeConversationId;
    return Object.values(s.conversations).reduce((sum, c) => {
      const n = c.unread_count ?? 0;
      return sum + (c.id === active ? 0 : n);
    }, 0);
  });

if (typeof window !== "undefined") {
  const g = window as any;
  if (g.__CHAT_STORE__ && g.__CHAT_STORE__ !== useChatStore) {
    console.warn("[chatStore] ⚠️ Duplicate store instance detected! Two different imports exist.");
    console.warn("[chatStore] Existing store:", g.__CHAT_STORE__);
    console.warn("[chatStore] New store:", useChatStore);
  }
  g.__CHAT_STORE__ = useChatStore;
  console.log("[chatStore] Store registered as singleton ✅");

  if (!g.__ZUSTAND_INSTANCES__) {
    g.__ZUSTAND_INSTANCES__ = new Set();
  }
  g.__ZUSTAND_INSTANCES__.add(useChatStore);
  console.log("[chatStore] Zustand instances count:", g.__ZUSTAND_INSTANCES__.size, g.__ZUSTAND_INSTANCES__.size === 1 ? "✅" : "⚠️ MULTIPLE INSTANCES!");
}
