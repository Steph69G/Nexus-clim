import { create } from "zustand";
import type { ChatMessageWithSender, ConversationWithParticipants } from "@/types/database";

type ChatState = {
  isOpen: boolean;
  unreadCount: number;
  conversations: ConversationWithParticipants[];
  messages: Record<string, ChatMessageWithSender[]>;
  activeConversationId: string | null;

  open: () => void;
  close: () => void;
  toggleOpen: () => void;
  setUnread: (n: number) => void;
  incrementUnread: () => void;

  setConversations: (conversations: ConversationWithParticipants[]) => void;
  updateConversation: (conversationId: string, updates: Partial<ConversationWithParticipants>) => void;

  setMessages: (conversationId: string, messages: ChatMessageWithSender[]) => void;
  addMessage: (conversationId: string, message: ChatMessageWithSender) => void;

  setActiveConversation: (conversationId: string | null) => void;

  refreshNeeded: boolean;
  triggerRefresh: () => void;
  clearRefresh: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  unreadCount: 3,
  conversations: [],
  messages: {},
  activeConversationId: null,
  refreshNeeded: false,

  open: () => set({ isOpen: true, unreadCount: 0 }),
  close: () => set({ isOpen: false }),
  toggleOpen: () =>
    set((s) => ({
      isOpen: !s.isOpen,
      unreadCount: !s.isOpen ? 0 : s.unreadCount,
    })),
  setUnread: (n) => set({ unreadCount: n }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),

  setConversations: (conversations) => set({ conversations }),
  updateConversation: (conversationId, updates) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, ...updates } : conv
      ),
    })),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages || [] },
    })),

  getMessages: (conversationId) => {
    const state = useChatStore.getState();
    return state.messages[conversationId] || [];
  },
  addMessage: (conversationId, message) =>
    set((state) => {
      const existingMessages = state.messages[conversationId] || [];
      const alreadyExists = existingMessages.some((msg) => msg.id === message.id);
      if (alreadyExists) return state;

      return {
        messages: {
          ...state.messages,
          [conversationId]: [...existingMessages, message],
        },
      };
    }),

  setActiveConversation: (conversationId) => set({ activeConversationId: conversationId }),

  triggerRefresh: () => set({ refreshNeeded: true }),
  clearRefresh: () => set({ refreshNeeded: false }),
}));
