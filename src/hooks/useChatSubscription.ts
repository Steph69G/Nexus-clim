import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useChatStore } from "@/components/chat/chatStore";

let __chatRealtimeSubscribed = false;

export function useChatSubscription() {
  useEffect(() => {
    if (__chatRealtimeSubscribed) {
      console.log("[useChatSubscription] Already subscribed, skipping");
      return;
    }
    __chatRealtimeSubscribed = true;
    console.log("[useChatSubscription] Setting up singleton subscription");

    const channel = supabase.channel("chat-realtime");
    console.log("[chat] channel created:", channel);

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages" },
      async (payload) => {
        console.log("[chat] 🔔 INSERT received from realtime:", payload);
        if (!payload?.new) return;
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

        console.log("[chat] 📥 Adding message to store:", messageWithSender);
        useChatStore.getState().addMessage(messageWithSender);
      }
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "chat_messages" },
      async (payload) => {
        if (!payload?.new) return;
        const updatedMessage = payload.new as any;

        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, role")
          .eq("user_id", updatedMessage.sender_id)
          .maybeSingle();

        const withSender = {
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
          useChatStore.getState().softDeleteMessage(withSender);
        } else {
          useChatStore.getState().updateMessage(withSender);
        }
      }
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "conversations" },
      (payload) => {
        if (!payload?.new) return;
        useChatStore.getState().upsertConversation(payload.new as any);
      }
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") console.log("[chat] realtime subscribed ✅");
      if (status === "CHANNEL_ERROR") console.warn("[chat] realtime error ⚠️");
      if (status === "TIMED_OUT") console.warn("[chat] realtime timeout ⏱️");
      if (status === "CLOSED") console.warn("[chat] realtime closed 🔒");
    });
  }, []);
}
