import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useChatStore } from "@/components/chat/chatStore";

let __chatRealtimeSubscribed = false;
let __globalChannel: any = null;

export function useChatSubscription() {
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const softDeleteMessage = useChatStore((s) => s.softDeleteMessage);
  const upsertConversation = useChatStore((s) => s.upsertConversation);

  useEffect(() => {
    if (__chatRealtimeSubscribed) {
      console.log("[useChatSubscription] Already subscribed, skipping");
      return;
    }

    console.log("[useChatSubscription] Setting up singleton subscription");
    __chatRealtimeSubscribed = true;

    const channel = supabase.channel("chat-realtime");

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages" },
      async (payload) => {
        console.log("[useChatSubscription] New message detected:", payload);
        if (payload?.new) {
          const newMessage = payload.new as any;

          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, role")
            .eq("user_id", newMessage.sender_id)
            .maybeSingle();

          const messageWithSender = {
            ...newMessage,
            sender: profile
              ? {
                  id: profile.user_id,
                  full_name: profile.full_name,
                  avatar_url: profile.avatar_url,
                  role: profile.role,
                }
              : undefined,
          };

          addMessage(messageWithSender);
        }
      }
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "chat_messages" },
      async (payload) => {
        console.log("[useChatSubscription] Message updated:", payload);
        if (payload?.new) {
          const updatedMessage = payload.new as any;

          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, role")
            .eq("user_id", updatedMessage.sender_id)
            .maybeSingle();

          const messageWithSender = {
            ...updatedMessage,
            sender: profile
              ? {
                  id: profile.user_id,
                  full_name: profile.full_name,
                  avatar_url: profile.avatar_url,
                  role: profile.role,
                }
              : undefined,
          };

          if (updatedMessage.deleted_at) {
            softDeleteMessage(messageWithSender);
          } else {
            updateMessage(messageWithSender);
          }
        }
      }
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "conversations" },
      (payload) => {
        console.log("[useChatSubscription] Conversation updated:", payload);
        if (payload?.new) {
          upsertConversation(payload.new);
        }
      }
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") console.debug("[chat] realtime subscribed ✅");
      if (status === "CHANNEL_ERROR") console.warn("[chat] realtime error ⚠️");
      if (status === "TIMED_OUT") console.warn("[chat] realtime timeout ⏱️");
      if (status === "CLOSED") console.warn("[chat] realtime closed 🔒");
    });

    __globalChannel = channel;

    return () => {
      console.log("[useChatSubscription] Singleton cleanup (no-op)");
    };
  }, [addMessage, updateMessage, softDeleteMessage, upsertConversation]);
}
