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
import { supabase } from "@/lib/supabase";

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

export function useNotificationsKeyset(profileId?: string) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const loadMore = useCallback(async () => {
    const cursor =
      items.length > 0
        ? {
            p_before_created_at: items[items.length - 1].created_at,
            p_before_id: items[items.length - 1].id,
          }
        : {};

    const { data, error } = await supabase.rpc("fetch_my_notifications_keyset", {
      ...cursor,
      p_unread_only: false,
    });

    if (error) {
      console.error("Failed to load notifications:", error);
      return;
    }

    setItems((prev) => [...prev, ...(data ?? [])]);

    if (items.length === 0) {
      setUnreadCount((data ?? []).filter((n: Notification) => !n.read_at).length);
    }

    setHasMore((data ?? []).length === 50);
  }, [items]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadMore();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!profileId) return;

    const channel = supabase.channel(`notifications-ks-${profileId}`).on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${profileId}`,
      },
      (payload) => {
        const newNotification = payload.new as Notification;
        setItems((prev) => [newNotification, ...prev]);
        setUnreadCount((c) => c + (newNotification.read_at ? 0 : 1));
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return { items, unreadCount, loading, hasMore, loadMore };
}
