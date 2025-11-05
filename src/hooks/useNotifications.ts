import { useEffect, useState, useCallback, useRef } from "react";
import type { Notification } from "@/types/database";
import {
  fetchMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  countUnreadNotifications,
  subscribeToNotifications,
} from "@/api/notifications";
import { useProfile } from "./useProfile";

export function useNotifications() {
  const { profile } = useProfile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<number | null>(null);
  const queueRef = useRef<Notification[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMyNotifications(50, false);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read_at).length);
    } catch (e: any) {
      setError(e?.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(
    async (id: string) => {
      const notification = notifications.find((n) => n.id === id);
      const wasUnread = notification && !notification.read_at;

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      try {
        await markNotificationAsRead(id);
      } catch (e: any) {
        console.error("Failed to mark as read:", e);
        await load();
      }
    },
    [notifications, load]
  );

  const markAllAsRead = useCallback(async () => {
    const previousState = notifications;
    const previousCount = unreadCount;

    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead();
    } catch (e: any) {
      console.error("Failed to mark all as read:", e);
      setNotifications(previousState);
      setUnreadCount(previousCount);
    }
  }, [notifications, unreadCount]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!profile?.id) return;

    const unsubscribe = subscribeToNotifications(profile.id, (newNotification) => {
      queueRef.current.unshift(newNotification);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = window.setTimeout(() => {
        const batch = [...queueRef.current];
        queueRef.current = [];

        setNotifications((prev) => [...batch, ...prev]);
        setUnreadCount((c) => c + batch.filter((n) => !n.read_at).length);
      }, 50);
    });

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      unsubscribe();
    };
  }, [profile?.id]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: load,
    markAsRead,
    markAllAsRead,
  };
}
