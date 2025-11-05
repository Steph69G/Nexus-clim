import { useState, useRef, useEffect } from "react";
import { Bell, Archive } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "@/lib/dateUtils";
import { archiveAllRead } from "@/api/notifications";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleNotificationClick = (notification: any) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
    setIsOpen(false);
  };

  const handleArchiveAllRead = async () => {
    try {
      setArchiving(true);
      const count = await archiveAllRead();
      console.log(`Archived ${count} notifications`);
      await refresh();
    } catch (error) {
      console.error("Failed to archive notifications:", error);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border z-50 max-h-[600px] flex flex-col">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleArchiveAllRead}
                disabled={archiving || notifications.filter(n => n.read_at).length === 0}
                className="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                title="Archiver les notifications lues"
              >
                <Archive className="w-3 h-3" />
                {archiving ? "..." : "Archiver lus"}
              </button>
              <a
                href="/communication/notifications"
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Voir tout
              </a>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      !notif.read_at ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {!notif.read_at && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{notif.title}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(notif.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
