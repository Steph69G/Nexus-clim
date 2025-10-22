import { supabase } from "@/lib/supabase";
import type { Notification } from "@/types/database";

export async function fetchMyNotifications(
  limit = 50,
  unreadOnly = false
): Promise<Notification[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data, error} = await query;
  if (error) throw error;
  return (data || []) as Notification[];
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabase.rpc("mark_notification_read", {
    notification_id: id,
  });

  if (error) throw error;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw error;
}

export async function countUnreadNotifications(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .is("read_at", null)
    .is("deleted_at", null);

  if (error) throw error;
  return count || 0;
}

export async function archiveNotification(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void
) {
  const channel = supabase
    .channel("notifications-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
