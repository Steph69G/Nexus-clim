import { useState, useEffect, useRef } from "react";
import { X, ExternalLink, Send, Loader2 } from "lucide-react";
import { useChatStore } from "./chatStore";
import { fetchMyConversations, fetchConversationMessages, sendMessage, getTotalUnreadCount, markConversationAsRead } from "@/api/chat";
import { supabase } from "@/lib/supabase";
import { formatTime } from "@/lib/dateUtils";
import type { ChatMessageWithSender, ConversationWithParticipants } from "@/types/database";

export default function ChatWindow() {
  const { isOpen, close, setUnread } = useChatStore();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ConversationWithParticipants | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      initializeChat();
    }
  }, [isOpen]);

  useEffect(() => {
    updateUnreadCount();
    const interval = setInterval(updateUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);
    await loadLatestConversation();
  };

  const loadLatestConversation = async () => {
    setLoading(true);
    try {
      const conversations = await fetchMyConversations();
      if (conversations.length > 0) {
        const latest = conversations[0];
        setCurrentConversation(latest);
        const msgs = await fetchConversationMessages(latest.id, 20);
        setMessages(msgs);

        await markConversationAsRead(latest.id);
        await updateUnreadCount();
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUnreadCount = async () => {
    try {
      const count = await getTotalUnreadCount();
      setUnread(count);
    } catch (error) {
      console.error('Error updating unread count:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentConversation || sending) return;

    setSending(true);
    try {
      await sendMessage(currentConversation.id, message.trim());
      setMessage("");
      await loadLatestConversation();
      await updateUnreadCount();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[5000] w-[360px] max-w-[92vw] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-blue-50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <h4 className="font-semibold text-slate-900">Tchat en direct</h4>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/communication/tchat"
            className="text-slate-500 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-white/50"
            aria-label="Ouvrir en plein écran"
            title="Ouvrir en plein écran"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
          <button
            onClick={close}
            aria-label="Fermer"
            className="text-slate-500 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-white/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="h-64 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-6 h-6 text-sky-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-sm text-slate-500">
              Aucun message pour le moment.<br />
              <a href="/communication/tchat" className="text-sky-600 hover:underline">
                Créez une conversation
              </a>
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                    isOwn
                      ? 'ml-auto bg-gradient-to-br from-sky-600 to-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  {!isOwn && msg.sender && (
                    <div className="text-xs font-semibold mb-1 text-sky-700">
                      {msg.sender.full_name}
                    </div>
                  )}
                  <p className="text-sm">{msg.message_text}</p>
                  <span className={`text-xs mt-1 block ${isOwn ? 'text-sky-100 text-right' : 'text-slate-500'}`}>
                    {formatTime(new Date(msg.created_at))}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-slate-200 bg-white">
        <input
          type="text"
          placeholder="Écrire un message…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={sending || !currentConversation}
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={!message.trim() || sending || !currentConversation}
          className="rounded-xl h-10 w-10 flex items-center justify-center bg-sky-600 text-white hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
          aria-label="Envoyer le message"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </form>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in-95 {
          from { transform: scale(0.95); }
          to { transform: scale(1); }
        }
        .animate-in {
          animation: fade-in 0.3s ease-out, zoom-in-95 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
