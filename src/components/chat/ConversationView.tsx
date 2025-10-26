import { useState, useEffect, useRef } from "react";
import { Send, Users, Loader2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import {
  fetchConversationMessages,
  sendMessage,
  markConversationAsRead,
  subscribeToConversationMessages,
} from "@/api/chat";
import type { ChatMessageWithSender, ConversationWithParticipants } from "@/types/database";

type ConversationViewProps = {
  conversation: ConversationWithParticipants;
  currentUserId: string;
};

export function ConversationView({ conversation, currentUserId }: ConversationViewProps) {
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    markConversationAsRead(conversation.id).catch(console.error);

    const unsubscribe = subscribeToConversationMessages(conversation.id, (newMessage) => {
      setMessages((prev) => [...prev, newMessage as ChatMessageWithSender]);
      markConversationAsRead(conversation.id).catch(console.error);
    });

    return () => {
      unsubscribe();
    };
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const msgs = await fetchConversationMessages(conversation.id);
      setMessages(msgs);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(conversation.id, inputText.trim());
      setInputText("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  const getConversationTitle = (): string => {
    if (conversation.title) return conversation.title;

    if (conversation.type === "direct") {
      const otherParticipant = conversation.participants.find(
        (p) => p.user_id !== currentUserId
      );
      return otherParticipant
        ? `Conversation avec ${otherParticipant.user_id.slice(0, 8)}`
        : "Conversation";
    }

    if (conversation.type === "mission" && conversation.mission_id) {
      return `Mission ${conversation.mission_id.slice(0, 8)}`;
    }

    return "Groupe";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{getConversationTitle()}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500">
              {conversation.participants.length} participant
              {conversation.participants.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium mb-2">Aucun message</p>
              <p className="text-sm text-slate-500">
                Soyez le premier à envoyer un message !
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwnMessage={msg.sender_id === currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-3 p-4 border-t border-slate-200 bg-white">
        <input
          type="text"
          placeholder="Écrire un message…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={sending}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="rounded-xl h-10 w-10 flex items-center justify-center bg-sky-600 text-white hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
          aria-label="Envoyer le message"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </form>
    </div>
  );
}
