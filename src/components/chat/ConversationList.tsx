import { Users, MessageCircle, Briefcase } from "lucide-react";
import type { ConversationWithParticipants } from "@/types/database";
import { formatDistanceToNow } from "@/lib/dateUtils";

type ConversationListProps = {
  conversations: ConversationWithParticipants[] | Record<string, any> | undefined | null;
  selectedId?: string;
  onSelect: (id: string) => void;
  currentUserId: string;
};

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  currentUserId,
}: ConversationListProps) {
  const conversationList = Array.isArray(conversations)
    ? conversations
    : conversations
    ? Object.values(conversations)
    : [];
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

  if (conversationList.length === 0) {
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
      {conversationList.map((conv) => {
        const isSelected = conv.id === selectedId;
        const hasUnread = (conv.unread_count || 0) > 0;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left px-4 py-3 border-b border-slate-200 hover:bg-slate-50 transition-colors ${
              isSelected ? "bg-sky-50 border-l-4 border-l-sky-600" : ""
            }`}
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
        );
      })}
    </div>
  );
}
