import { Users, MessageCircle, Briefcase, MoreVertical, Archive, LogOut } from "lucide-react";
import { useState } from "react";
import type { ConversationWithParticipants } from "@/types/database";
import { formatDistanceToNow } from "@/lib/dateUtils";

type ConversationListProps = {
  conversations: ConversationWithParticipants[];
  selectedId?: string;
  onSelect: (id: string) => void;
  currentUserId: string;
  onArchive?: (id: string) => void;
  onLeave?: (id: string) => void;
};

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  currentUserId,
  onArchive,
  onLeave,
}: ConversationListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const getConversationTitle = (conv: ConversationWithParticipants): string => {
    if (conv.title) return conv.title;

    if (conv.type === "direct") {
      const otherParticipant = conv.participants.find((p) => p.user_id !== currentUserId);
      if (otherParticipant && (otherParticipant as any).profile?.full_name) {
        return (otherParticipant as any).profile.full_name;
      }
      return otherParticipant ? `Utilisateur ${otherParticipant.user_id.slice(0, 8)}` : "Conversation";
    }

    if (conv.type === "mission" && conv.mission_id) {
      return `Mission ${conv.mission_id.slice(0, 8)}`;
    }

    return "Groupe";
  };

  const getConversationIcon = (type: string) => {
    switch (type) {
      case "direct":
        return <MessageCircle className="w-5 h-5 text-sky-600" />;
      case "mission":
        return <Briefcase className="w-5 h-5 text-blue-600" />;
      case "group":
        return <Users className="w-5 h-5 text-purple-600" />;
      default:
        return <MessageCircle className="w-5 h-5 text-slate-600" />;
    }
  };

  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return "";
    try {
      return formatDistanceToNow(timestamp);
    } catch {
      return "";
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <MessageCircle className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-600 font-medium mb-2">Aucune conversation</p>
        <p className="text-sm text-slate-500">
          Créez une nouvelle conversation pour commencer
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {conversations.map((conv) => {
        const isSelected = conv.id === selectedId;
        const hasUnread = (conv.unread_count || 0) > 0;

        return (
          <div
            key={conv.id}
            className={`relative group w-full border-b border-slate-200 hover:bg-slate-50 transition-colors ${
              isSelected ? "bg-sky-50 border-l-4 border-l-sky-600" : ""
            }`}
          >
            <button
              onClick={() => onSelect(conv.id)}
              className="w-full text-left px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getConversationIcon(conv.type)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3
                    className={`font-semibold text-slate-900 truncate ${
                      hasUnread ? "font-bold" : ""
                    }`}
                  >
                    {getConversationTitle(conv)}
                  </h3>
                  {conv.last_message_at && (
                    <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                      {formatLastMessageTime(conv.last_message_at)}
                    </span>
                  )}
                </div>

                {conv.last_message && (
                  <p
                    className={`text-sm truncate ${
                      hasUnread ? "text-slate-700 font-medium" : "text-slate-500"
                    }`}
                  >
                    {conv.last_message.message_text}
                  </p>
                )}

                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-400">
                    {conv.participants.length} participant{conv.participants.length > 1 ? "s" : ""}
                  </span>
                  {hasUnread && (
                    <span className="bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
            </button>

            <div className="absolute top-3 right-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === conv.id ? null : conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
              >
                <MoreVertical className="w-4 h-4 text-slate-600" />
              </button>

              {openMenuId === conv.id && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                  {onArchive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchive(conv.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-700"
                    >
                      <Archive className="w-4 h-4" />
                      Archiver
                    </button>
                  )}
                  {onLeave && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Voulez-vous vraiment quitter cette conversation ?")) {
                          onLeave(conv.id);
                          setOpenMenuId(null);
                        }
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm text-red-600 border-t border-slate-200"
                    >
                      <LogOut className="w-4 h-4" />
                      Quitter
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
