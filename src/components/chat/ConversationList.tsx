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
      return <MessageCircle className="w-5 h-5" />;
    case "mission":
      return <Briefcase className="w-5 h-5" />;
    case "group":
      return <Users className="w-5 h-5" />;
    default:
      return <MessageCircle className="w-5 h-5" />;
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
    <ul className="p-2 space-y-2 h-full overflow-y-auto">
      {list.map((conv) => {
        const isActive = conv.id === selectedId;
        const unread = conv.unread_count ?? 0;
        const title = getConversationTitle(conv);
        const preview = conv.last_message_preview ?? "—";
        const date = formatDate(conv.last_message_at);

        return (
          <li
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={[
              "relative cursor-pointer rounded-2xl px-4 py-3",
              "flex items-center gap-3 transition-all duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2",
              isActive
                ? [
                    "bg-sky-50/80 ring-1 ring-sky-200",
                    "shadow-[0_0_0_3px_rgba(2,132,199,0.10),0_10px_24px_-12px_rgba(2,132,199,0.35)]",
                  ].join(" ")
                : "hover:bg-slate-50",
            ].join(" ")}
            tabIndex={0}
            role="button"
            aria-current={isActive ? "true" : undefined}
          >
            <span
              className={[
                "absolute left-0 top-1.5 bottom-1.5 rounded-r-full transition-all",
                isActive ? "w-2 bg-sky-500" : "w-0 bg-transparent",
              ].join(" ")}
            />

            {isActive && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
            )}

            <div className="shrink-0 w-9 h-9 rounded-full bg-sky-100 grid place-items-center text-sky-600">
              {getConversationIcon(conv.type)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p
                  className={[
                    "truncate",
                    isActive ? "font-semibold text-sky-900" : "font-medium text-slate-900",
                  ].join(" ")}
                  title={title}
                >
                  {title}
                </p>
                {date && (
                  <span className="ml-auto shrink-0 text-xs text-slate-500">
                    {date}
                  </span>
                )}
              </div>

              <p
                className={[
                  "truncate text-sm",
                  isActive ? "text-sky-700/80" : "text-slate-600",
                ].join(" ")}
                title={preview}
              >
                {preview}
              </p>
            </div>

            {!isActive && unread > 0 && (
              <span
                className="ml-2 shrink-0 rounded-full bg-sky-600 text-white text-xs px-2 py-1"
                aria-label={`${unread} non lus`}
              >
                {unread}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
