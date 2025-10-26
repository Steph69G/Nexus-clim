import {
  Bell,
  Briefcase,
  FileText,
  DollarSign,
  FileCheck,
  AlertTriangle,
  ClipboardList,
  Zap,
} from "lucide-react";
import type { Notification } from "@/types/database";
import { formatDistanceToNow } from "@/lib/dateUtils";

type NotificationsListProps = {
  notifications: Notification[];
  selectedId?: string;
  onSelect: (id: string) => void;
};

export function NotificationsList({
  notifications,
  selectedId,
  onSelect,
}: NotificationsListProps) {
  const getNotificationIcon = (type: string) => {
    if (type.includes("mission")) return <Briefcase className="w-5 h-5 text-blue-600" />;
    if (type.includes("quote")) return <FileText className="w-5 h-5 text-green-600" />;
    if (type.includes("invoice")) return <DollarSign className="w-5 h-5 text-emerald-600" />;
    if (type.includes("contract")) return <FileCheck className="w-5 h-5 text-purple-600" />;
    if (type.includes("emergency")) return <AlertTriangle className="w-5 h-5 text-red-600" />;
    if (type.includes("survey")) return <ClipboardList className="w-5 h-5 text-orange-600" />;
    return <Bell className="w-5 h-5 text-slate-600" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-700 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "normal":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "low":
        return "bg-slate-100 text-slate-600 border-slate-300";
      default:
        return "bg-slate-100 text-slate-600 border-slate-300";
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Bell className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-600 font-medium mb-2">Aucune notification</p>
        <p className="text-sm text-slate-500">
          Vous n'avez pas de notifications pour le moment
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {notifications.map((notif) => {
        const isSelected = notif.id === selectedId;
        const isUnread = !notif.read_at;

        return (
          <button
            key={notif.id}
            onClick={() => onSelect(notif.id)}
            className={`w-full text-left px-4 py-3 border-b border-slate-200 hover:bg-slate-50 transition-colors ${
              isSelected ? "bg-orange-50 border-l-4 border-l-orange-600" : ""
            } ${isUnread ? "bg-blue-50/30" : ""}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">{getNotificationIcon(notif.notification_type)}</div>

              {isUnread && (
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3
                    className={`font-semibold text-slate-900 truncate ${
                      isUnread ? "font-bold" : ""
                    }`}
                  >
                    {notif.title}
                  </h3>
                  {notif.priority !== "normal" && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ml-2 flex-shrink-0 ${getPriorityColor(
                        notif.priority
                      )}`}
                    >
                      {notif.priority === "urgent" && <Zap className="w-3 h-3 inline mr-1" />}
                      {notif.priority.toUpperCase()}
                    </span>
                  )}
                </div>

                <p
                  className={`text-sm truncate ${
                    isUnread ? "text-slate-700 font-medium" : "text-slate-500"
                  }`}
                >
                  {notif.message}
                </p>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-400">
                    {formatDistanceToNow(notif.created_at)}
                  </span>
                  <div className="flex items-center gap-1">
                    {notif.channels.map((channel) => (
                      <span
                        key={channel}
                        className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                      >
                        {channel === "in_app" && "📱"}
                        {channel === "email" && "📧"}
                        {channel === "sms" && "💬"}
                        {channel === "push" && "🔔"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
