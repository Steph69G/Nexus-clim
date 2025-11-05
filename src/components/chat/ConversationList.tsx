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
            className={[
              "w-full text-left py-3 rounded-xl transition-all duration-150",
              "flex items-center gap-3 relative mb-1",
              "focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2",
              isSelected
                ? "bg-sky-50 border border-sky-200 shadow-[0_0_0_3px_rgba(2,132,199,0.12)] pl-5 pr-3"
                : "hover:bg-slate-50 border border-transparent pl-3 pr-3"
            ].join(" ")}
          >
            <span
              className={[
                "absolute left-0 top-2 bottom-2 rounded-full transition-all",
                isSelected ? "w-1.5 bg-sky-500" : "w-0 bg-transparent"
              ].join(" ")}
            />

            <div className="shrink-0 w-9 h-9 rounded-full bg-slate-100 grid place-items-center">
              {getConversationIcon(conv.type)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3
                  className={[
                    "truncate",
                    isSelected ? "font-semibold text-sky-900" : "font-medium text-slate-900",
                    hasUnread && !isSelected ? "font-bold" : ""
                  ].join(" ")}
                >
                  {title}
                </h3>
                {date && (
                  <span className="text-xs text-slate-500 shrink-0">
                    {date}
                  </span>
                )}
              </div>

              {preview && (
                <p
                  className={`text-sm truncate ${
                    hasUnread && !isSelected ? "text-slate-700 font-medium" : "text-slate-600"
                  }`}
                >
                  {preview}
                </p>
              )}
            </div>

            {showBadge && (
              <span className="ml-2 shrink-0 rounded-full bg-sky-600 text-white text-xs px-2 py-1">
                {conv.unread_count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
