import React, { useMemo } from "react";
import { Users, MessageCircle, Briefcase } from "lucide-react";

type ConversationItem = {
  id: string;
  title: string | null;
  type?: string;
  last_message_at: string | null;
  last_message_preview?: string | null;
  last_message_sender_id?: string | null;
  unread_count?: number;
};

type Props = {
  conversations: ConversationItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  currentUserId: string;
};

function getConversationTitle(conv: ConversationItem): string {
  if (conv.title && conv.title.trim().length > 0) return conv.title;
  if (conv.type === "mission") return `Mission ${conv.id.slice(0, 8)}`;
  return "Conversation";
}

function getConversationIcon(type?: string) {
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
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  currentUserId,
}: Props) {
  const list: ConversationItem[] = useMemo(() => {
    if (Array.isArray(conversations)) return conversations;
    if (conversations && typeof conversations === "object") {
      return Object.values(conversations as any);
    }
    return [];
  }, [conversations]);

  if (list.length === 0) {
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
      {list.map((conv) => {
        const isSelected = conv.id === selectedId;
        const hasUnread = (conv.unread_count ?? 0) > 0;
        const showBadge = hasUnread && conv.id !== selectedId;
        const title = getConversationTitle(conv);
        const preview = conv.last_message_preview ?? "";
        const date = formatDate(conv.last_message_at);

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
                    {title}
                  </h3>
                  {date && (
                    <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                      {date}
                    </span>
                  )}
                </div>

                {preview && (
                  <p
                    className={`text-sm truncate ${
                      hasUnread ? "text-slate-700 font-medium" : "text-slate-500"
                    }`}
                  >
                    {preview}
                  </p>
                )}

                {showBadge && (
                  <div className="flex items-center justify-end mt-1">
                    <span className="bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      {conv.unread_count}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
