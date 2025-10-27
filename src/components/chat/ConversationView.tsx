import { useState, useEffect, useRef } from "react";
import { Send, Users, Loader2, MoreVertical, Archive, LogOut, Edit, UserPlus } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import {
  fetchConversationMessages,
  sendMessage,
  markConversationAsRead,
  subscribeToConversationMessages,
  archiveConversation,
  leaveConversation,
  updateConversation,
  addParticipant,
  sendConversationInvitation,
} from "@/api/chat";
import type { ChatMessageWithSender, ConversationWithParticipants } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";

type ConversationViewProps = {
  conversation: ConversationWithParticipants;
  currentUserId: string;
};

export function ConversationView({ conversation, currentUserId }: ConversationViewProps) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviting, setInviting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = profile?.role === "admin" || profile?.role === "sal";

  useEffect(() => {
    loadMessages();
    markConversationAsRead(conversation.id).catch(console.error);

    const unsubscribe = subscribeToConversationMessages(conversation.id, (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
      markConversationAsRead(conversation.id).catch(console.error);
      setTimeout(() => scrollToBottom(), 100);
    });

    return () => {
      unsubscribe();
    };
  }, [conversation.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    };

    if (showOptionsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showOptionsMenu]);

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
      if (otherParticipant && (otherParticipant as any).profile?.full_name) {
        return `Conversation avec ${(otherParticipant as any).profile.full_name}`;
      }
      return otherParticipant
        ? `Conversation avec ${otherParticipant.user_id.slice(0, 8)}`
        : "Conversation";
    }

    if (conversation.type === "mission" && conversation.mission_id) {
      return `Mission ${conversation.mission_id.slice(0, 8)}`;
    }

    return "Groupe";
  };

  const getParticipantsNames = (): string => {
    return conversation.participants
      .map((p) => {
        if ((p as any).profile?.full_name) {
          return (p as any).profile.full_name;
        }
        return `Utilisateur ${p.user_id.slice(0, 8)}`;
      })
      .join(", ");
  };

  const handleArchive = async () => {
    try {
      await archiveConversation(conversation.id);
      alert("Conversation archivée");
      setShowOptionsMenu(false);
    } catch (error) {
      console.error("Error archiving conversation:", error);
      alert("Erreur lors de l'archivage");
    }
  };

  const handleLeave = async () => {
    if (confirm("Voulez-vous vraiment quitter cette conversation ?")) {
      try {
        await leaveConversation(conversation.id);
        alert("Vous avez quitté la conversation");
        setShowOptionsMenu(false);
        window.location.reload();
      } catch (error) {
        console.error("Error leaving conversation:", error);
        alert("Erreur lors de la sortie");
      }
    }
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await updateConversation(conversation.id, { title: editedTitle.trim() });
      setIsEditingTitle(false);
      window.location.reload();
    } catch (error) {
      console.error("Error updating title:", error);
      alert("Erreur lors de la modification du titre");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting) return;

    setInviting(true);
    try {
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail.trim())
        .maybeSingle();

      if (user) {
        const isAlreadyParticipant = conversation.participants.some(
          (p) => p.user_id === user.id
        );

        if (isAlreadyParticipant) {
          alert("Cet utilisateur est déjà participant");
          return;
        }

        if (isAdmin) {
          await addParticipant(conversation.id, user.id);
          alert("Participant ajouté avec succès");
          setShowInviteModal(false);
          setInviteEmail("");
          setInviteMessage("");
          window.location.reload();
          return;
        } else {
          await addParticipant(conversation.id, user.id);
          alert("Participant ajouté avec succès");
          setShowInviteModal(false);
          setInviteEmail("");
          setInviteMessage("");
          window.location.reload();
          return;
        }
      }

      if (isAdmin) {
        alert("Utilisateur introuvable avec cet email. Seuls les administrateurs peuvent inviter des utilisateurs existants.");
        return;
      }

      const result = await sendConversationInvitation(
        conversation.id,
        inviteEmail.trim(),
        inviteMessage.trim() || undefined
      );

      if (result.success) {
        alert("Invitation envoyée avec succès ! La personne recevra un email pour créer son compte.");
        setShowInviteModal(false);
        setInviteEmail("");
        setInviteMessage("");
      } else {
        alert(result.error || "Erreur lors de l'envoi de l'invitation");
      }
    } catch (error) {
      console.error("Error inviting participant:", error);
      alert("Erreur lors de l'invitation");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
                className="text-xl font-bold text-slate-900 border-b-2 border-sky-500 focus:outline-none px-1"
                autoFocus
              />
              <button
                onClick={handleSaveTitle}
                className="px-3 py-1 text-sm bg-sky-600 text-white rounded hover:bg-sky-700"
              >
                Valider
              </button>
              <button
                onClick={() => setIsEditingTitle(false)}
                className="px-3 py-1 text-sm bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
              >
                Annuler
              </button>
            </div>
          ) : (
            <h2 className="text-xl font-bold text-slate-900">{getConversationTitle()}</h2>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500">
              {conversation.participants.length} participant
              {conversation.participants.length > 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1.5">{getParticipantsNames()}</p>
        </div>

        <div className="relative" ref={optionsMenuRef}>
          <button
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Options de conversation"
          >
            <MoreVertical className="w-5 h-5 text-slate-600" />
          </button>

          {showOptionsMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
              <button
                onClick={() => {
                  setShowInviteModal(true);
                  setShowOptionsMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
              >
                <UserPlus className="w-4 h-4" />
                Inviter quelqu'un
              </button>

              <button
                onClick={() => {
                  setEditedTitle(conversation.title || "");
                  setIsEditingTitle(true);
                  setShowOptionsMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
              >
                <Edit className="w-4 h-4" />
                Modifier le titre
              </button>

              <button
                onClick={handleArchive}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
              >
                <Archive className="w-4 h-4" />
                Archiver la conversation
              </button>

              <div className="border-t border-slate-200 my-2"></div>

              <button
                onClick={handleLeave}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
              >
                <LogOut className="w-4 h-4" />
                Quitter la conversation
              </button>
            </div>
          )}
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

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Inviter un participant</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail("");
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email de l'utilisateur
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  disabled={inviting}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent disabled:bg-slate-100"
                />
                <p className="mt-2 text-xs text-slate-500">
                  {isAdmin
                    ? "L'utilisateur doit avoir un compte sur la plateforme"
                    : "Si l'email existe, ajout direct. Sinon, une invitation sera envoyée"}
                </p>
              </div>

              {!isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Message personnel (optionnel)
                  </label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Ajoutez un message pour cette personne..."
                    rows={3}
                    disabled={inviting}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent disabled:bg-slate-100 resize-none"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail("");
                  }}
                  disabled={inviting}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!inviteEmail.trim() || inviting}
                  className="flex-1 px-4 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Invitation...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Inviter
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
