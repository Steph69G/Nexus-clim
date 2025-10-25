import { create } from "zustand";

type ChatState = {
  isOpen: boolean;
  unreadCount: number;
  open: () => void;
  close: () => void;
  toggleOpen: () => void;
  setUnread: (n: number) => void;
  incrementUnread: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  unreadCount: 3,
  open: () => set({ isOpen: true, unreadCount: 0 }),
  close: () => set({ isOpen: false }),
  toggleOpen: () =>
    set((s) => ({
      isOpen: !s.isOpen,
      unreadCount: !s.isOpen ? 0 : s.unreadCount,
    })),
  setUnread: (n) => set({ unreadCount: n }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
}));
