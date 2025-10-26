import { formatTime } from "@/lib/dateUtils";
import type { ChatMessageWithSender } from "@/types/database";

type MessageBubbleProps = {
  message: ChatMessageWithSender;
  isOwnMessage: boolean;
};

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  if (message.deleted_at) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-slate-400 italic">Message supprimé</span>
      </div>
    );
  }

  if (message.message_type === "system") {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full">
          {message.message_text}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
          isOwnMessage
            ? "bg-gradient-to-br from-sky-600 to-blue-600 text-white"
            : "bg-white border border-slate-200 text-slate-800"
        }`}
      >
        {!isOwnMessage && message.sender && (
          <div className="text-xs font-semibold mb-1 text-sky-700">
            {message.sender.full_name}
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap break-words">
          {message.message_text}
        </p>

        <div className="flex items-center justify-between mt-1 gap-2">
          <span
            className={`text-xs ${
              isOwnMessage ? "text-sky-100" : "text-slate-500"
            }`}
          >
            {formatTime(new Date(message.created_at))}
          </span>

          {message.edited_at && (
            <span
              className={`text-xs italic ${
                isOwnMessage ? "text-sky-200" : "text-slate-400"
              }`}
            >
              modifié
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
