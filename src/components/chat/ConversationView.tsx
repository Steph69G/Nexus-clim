import { useState, useEffect, useRef } from "react";
import { Send, Users, Loader2, MoreVertical, Archive, LogOut, Edit, UserPlus, Copy, Check, Mail, X } from "lucide-react";
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
  fetchConversationInvitations,
  cancelInvitation,
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
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [showInvitations, setShowInvitations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = profile?.role === "admin" || profile?.role === "sal";

  useEffect(() => {
    loadMessages();
    loadInvitations();
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

  const loadInvitations = async () => {
    try {
      const invitations = await fetchConversationInvitations(conversation.id);
      setPendingInvitations(invitations);
    } catch (error) {
      console.error("Error loading invitations:", error);
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
        .select("user_id")
        .eq("email", inviteEmail.trim())
        .maybeSingle();

      if (user) {
        const isAlreadyParticipant = conversation.participants.some(
          (p) => p.user_id === user.user_id
        );

        if (isAlreadyParticipant) {
          alert("Cet utilisateur est déjà participant");
          return;
        }

        await addParticipant(conversation.id, user.user_id);
        alert("Participant ajouté avec succès");
        setShowInviteModal(false);
        setInviteEmail("");
        setInviteMessage("");
        window.location.reload();
        return;
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
        if (result.invitation_link) {
          setInvitationLink(result.invitation_link);
          loadInvitations();
        } else {
          alert("Invitation créée avec succès !");
          setShowInviteModal(false);
          setInviteEmail("");
          setInviteMessage("");
          loadInvitations();
        }
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

  const handleCopyLink = async () => {
    if (!invitationLink) return;

    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      alert("Erreur lors de la copie du lien");
    }
  };

  const handleCloseInvitationSuccess = () => {
    setInvitationLink(null);
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteMessage("");
    setCopied(false);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (confirm("Voulez-vous annuler cette invitation ?")) {
      try {
        await cancelInvitation(invitationId);
        loadInvitations();
      } catch (error) {
        console.error("Error canceling invitation:", error);
        alert("Erreur lors de l'annulation de l'invitation");
      }
    }
  };

  const getInvitationLink = (token: string) => {
    return `${window.location.origin}/register?invitation=${token}`;
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

              {pendingInvitations.length > 0 && (
                <button
                  onClick={() => {
                    setShowInvitations(true);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                >
                  <Mail className="w-4 h-4" />
                  Invitations en attente
                  <span className="ml-auto bg-sky-500 text-white text-xs rounded-full px-2 py-0.5">
                    {pendingInvitations.length}
                  </span>
                </button>
              )}

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
            {invitationLink ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Invitation créée !</h3>
                  <button
                    onClick={handleCloseInvitationSuccess}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 mb-2">
                      L'invitation a été créée avec succès ! Partagez ce lien avec la personne pour qu'elle puisse créer son compte et rejoindre la conversation.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Lien d'invitation
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={invitationLink}
                        readOnly
                        className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm bg-slate-50 font-mono text-slate-600"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-4 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors flex items-center gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copié !
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copier
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs text-blue-800">
                      <strong>Note :</strong> Ce lien est valide pendant 7 jours. La personne pourra créer son compte avec cet email et sera automatiquement ajoutée à la conversation.
                    </p>
                  </div>

                  <button
                    onClick={handleCloseInvitationSuccess}
                    className="w-full px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Inviter un participant</h3>
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteEmail("");
                      setInviteMessage("");
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
                        setInviteMessage("");
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
              </>
            )}
          </div>
        </div>
      )}

      {showInvitations && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Invitations en attente</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {pendingInvitations.length} invitation{pendingInvitations.length > 1 ? "s" : ""} en attente
                </p>
              </div>
              <button
                onClick={() => setShowInvitations(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-6">
              {pendingInvitations.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600">Aucune invitation en attente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="w-4 h-4 text-sky-600" />
                            <span className="font-medium text-slate-900">
                              {invitation.invited_email}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">
                            Invité par {invitation.inviter?.full_name || "Utilisateur"}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Créé le {new Date(invitation.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                          {invitation.expires_at && (
                            <p className="text-xs text-slate-500">
                              Expire le {new Date(invitation.expires_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                              })}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>

                      {invitation.message && (
                        <div className="bg-slate-50 rounded-lg p-3 mb-3">
                          <p className="text-sm text-slate-700">
                            <span className="font-medium">Message :</span> {invitation.message}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={getInvitationLink(invitation.token)}
                          readOnly
                          className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-600"
                        />
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(getInvitationLink(invitation.token));
                              alert("Lien copié !");
                            } catch (error) {
                              console.error("Error copying:", error);
                            }
                          }}
                          className="px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors flex items-center gap-2 text-xs"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copier
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowInvitations(false)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
