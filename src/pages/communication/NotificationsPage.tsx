import { useState, useMemo } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { BackButton } from '@/components/navigation/BackButton';
import { NotificationFilters } from '@/components/notifications/NotificationFilters';
import { NotificationsList } from '@/components/notifications/NotificationsList';
import { NotificationDetail } from '@/components/notifications/NotificationDetail';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification } from '@/types/database';

export default function NotificationsPage() {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (statusFilter === 'unread' && notif.read_at) return false;

      if (typeFilter !== 'all' && !notif.notification_type.includes(typeFilter)) return false;

      if (priorityFilter !== 'all' && notif.priority !== priorityFilter) return false;

      return true;
    });
  }, [notifications, statusFilter, typeFilter, priorityFilter]);

  const handleSelectNotification = (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    if (notif) {
      setSelectedNotification(notif);
      if (!notif.read_at) {
        markAsRead(id);
      }
    }
  };

  const handleMarkAsUnread = async (id: string) => {
    setSelectedNotification(null);
  };

  const handleArchive = async (id: string) => {
    setSelectedNotification(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        <BackButton to="/admin/communication" label="Retour à la Communication" />

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
                <p className="text-slate-600">
                  Historique complet de vos notifications
                </p>
              </div>
            </div>

            <button
              onClick={() => markAllAsRead()}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <CheckCheck className="w-5 h-5" />
              Tout marquer comme lu
            </button>
          </div>
        </div>

        <NotificationFilters
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          priorityFilter={priorityFilter}
          onStatusChange={setStatusFilter}
          onTypeChange={setTypeFilter}
          onPriorityChange={setPriorityFilter}
        />

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" style={{ height: 'calc(100vh - 380px)' }}>
          <div className="grid grid-cols-12 h-full">
            <div className="col-span-4 border-r border-slate-200 flex flex-col">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h3 className="font-semibold text-slate-900">
                  Toutes les notifications ({filteredNotifications.length})
                </h3>
              </div>
              <NotificationsList
                notifications={filteredNotifications}
                selectedId={selectedNotification?.id}
                onSelect={handleSelectNotification}
              />
            </div>

            <div className="col-span-8">
              {selectedNotification ? (
                <NotificationDetail
                  notification={selectedNotification}
                  onMarkAsRead={markAsRead}
                  onMarkAsUnread={handleMarkAsUnread}
                  onArchive={handleArchive}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="w-10 h-10 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium mb-2">
                      Sélectionnez une notification
                    </p>
                    <p className="text-sm text-slate-500">
                      Choisissez une notification pour voir les détails
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
