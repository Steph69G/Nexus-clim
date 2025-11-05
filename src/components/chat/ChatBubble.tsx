import { MessageCircle } from "lucide-react";
import { useChatStore, useUnreadTotalExcludingActive } from "@/components/chat/chatStore";

export default function ChatBubble() {
  const unreadCount = useUnreadTotalExcludingActive();
  const toggleOpen = useChatStore((s) => s.toggleOpen);

  return (
    <button
      aria-label="Ouvrir le tchat"
      role="button"
      onClick={toggleOpen}
      className="fixed bottom-6 right-6 md:bottom-6 md:right-6 z-[5000] h-14 w-14 rounded-full bg-sky-100 border border-sky-200 shadow-xl hover:bg-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-300"
    >
      <div className="relative h-full w-full flex items-center justify-center">
        <MessageCircle className="h-6 w-6 text-sky-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-xs font-semibold flex items-center justify-center animate-scale-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>
    </button>
  );
}
