import { useState } from "react";
import {
  Bell,
  Briefcase,
  FileText,
  DollarSign,
  FileCheck,
  AlertTriangle,
  ClipboardList,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
  Archive,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import type { Notification } from "@/types/database";
import { formatDateTime } from "@/lib/dateUtils";

type NotificationDetailProps = {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread: (id: string) => void;
  onArchive: (id: string) => void;
};

export function NotificationDetail({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onArchive,
}: NotificationDetailProps) {
  const [actionLoading, setActionLoading] = useState(false);

  const getNotificationIcon = (type: string) => {
    if (type.includes("mission"))
      return { icon: <Briefcase className="w-6 h-6" />, color: "text-blue-600 bg-blue-100" };
    if (type.includes("quote"))
      return { icon: <FileText className="w-6 h-6" />, color: "text-green-600 bg-green-100" };
    if (type.includes("invoice"))
      return { icon: <DollarSign className="w-6 h-6" />, color: "text-emerald-600 bg-emerald-100" };
    if (type.includes("contract"))
      return { icon: <FileCheck className="w-6 h-6" />, color: "text-purple-600 bg-purple-100" };
    if (type.includes("emergency"))
      return { icon: <AlertTriangle className="w-6 h-6" />, color: "text-red-600 bg-red-100" };
    if (type.includes("survey"))
      return { icon: <ClipboardList className="w-6 h-6" />, color: "text-orange-600 bg-orange-100" };
    return { icon: <Bell className="w-6 h-6" />, color: "text-slate-600 bg-slate-100" };
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-600 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "normal":
        return "bg-blue-500 text-white";
      case "low":
        return "bg-slate-400 text-white";
      default:
        return "bg-slate-400 text-white";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "sent":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "failed":
      case "bounced":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const handleAction = async (action: () => void) => {
    setActionLoading(true);
    try {
      await action();
    } finally {
      setActionLoading(false);
    }
  };

  const { icon, color } = getNotificationIcon(notification.notification_type);
  const isUnread = !notification.read_at;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              {icon}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">{notification.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${getPriorityBadge(
                    notification.priority
                  )}`}
                >
                  {notification.priority.toUpperCase()}
                </span>
                {isUnread && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                    Non lu
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  {formatDateTime(notification.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isUnread ? (
            <button
              onClick={() => handleAction(() => onMarkAsRead(notification.id))}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              Marquer comme lu
            </button>
          ) : (
            <button
              onClick={() => handleAction(() => onMarkAsUnread(notification.id))}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <EyeOff className="w-4 h-4" />
              Marquer comme non lu
            </button>
          )}

          <button
            onClick={() => handleAction(() => onArchive(notification.id))}
            disabled={actionLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Archive className="w-4 h-4" />
            Archiver
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h3 className="font-semibold text-slate-900 mb-3">Message</h3>
          <p className="text-slate-700 whitespace-pre-wrap">{notification.message}</p>
        </div>

        {notification.channels.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
            <h3 className="font-semibold text-slate-900 mb-3">Canaux de diffusion</h3>
            <div className="space-y-3">
              {notification.channels.includes("email") && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">Email</span>
                      {getStatusIcon(notification.email_status)}
                      <span className="text-sm text-slate-600 capitalize">
                        {notification.email_status || "N/A"}
                      </span>
                    </div>
                    {notification.email_sent_at && (
                      <p className="text-xs text-slate-500">
                        Envoyé : {formatDateTime(notification.email_sent_at)}
                      </p>
                    )}
                    {notification.email_delivered_at && (
                      <p className="text-xs text-slate-500">
                        Délivré : {formatDateTime(notification.email_delivered_at)}
                      </p>
                    )}
                    {notification.email_error && (
                      <p className="text-xs text-red-600 mt-1">Erreur : {notification.email_error}</p>
                    )}
                  </div>
                </div>
              )}

              {notification.channels.includes("sms") && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">SMS</span>
                      {getStatusIcon(notification.sms_status)}
                      <span className="text-sm text-slate-600 capitalize">
                        {notification.sms_status || "N/A"}
                      </span>
                    </div>
                    {notification.sms_sent_at && (
                      <p className="text-xs text-slate-500">
                        Envoyé : {formatDateTime(notification.sms_sent_at)}
                      </p>
                    )}
                    {notification.sms_error && (
                      <p className="text-xs text-red-600 mt-1">Erreur : {notification.sms_error}</p>
                    )}
                  </div>
                </div>
              )}

              {notification.channels.includes("push") && (
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                  <Smartphone className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">Push Notification</span>
                      {getStatusIcon(notification.push_status)}
                      <span className="text-sm text-slate-600 capitalize">
                        {notification.push_status || "N/A"}
                      </span>
                    </div>
                    {notification.push_sent_at && (
                      <p className="text-xs text-slate-500">
                        Envoyé : {formatDateTime(notification.push_sent_at)}
                      </p>
                    )}
                    {notification.push_error && (
                      <p className="text-xs text-red-600 mt-1">Erreur : {notification.push_error}</p>
                    )}
                  </div>
                </div>
              )}

              {notification.channels.includes("in_app") && (
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <Bell className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-medium text-slate-900">In-App</span>
                    <p className="text-xs text-slate-500 mt-1">Notification affichée dans l'application</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {(notification.related_mission_id ||
          notification.related_quote_id ||
          notification.related_invoice_id ||
          notification.related_contract_id) && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Ressources liées</h3>
            <div className="space-y-2">
              {notification.related_mission_id && (
                <a
                  href={`/admin/missions/${notification.related_mission_id}`}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir la mission
                </a>
              )}
              {notification.related_quote_id && (
                <a
                  href={`/admin/quotes/${notification.related_quote_id}`}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir le devis
                </a>
              )}
              {notification.related_invoice_id && (
                <a
                  href={`/admin/invoices/${notification.related_invoice_id}`}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir la facture
                </a>
              )}
              {notification.related_contract_id && (
                <a
                  href={`/admin/contracts/${notification.related_contract_id}`}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir le contrat
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
