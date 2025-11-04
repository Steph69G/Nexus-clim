import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useChatStore } from "@/components/chat/chatStore";
import type { ChatMessageWithSender } from "@/types/database";

export function useChatSubscription(currentUserId: string | null) {
  const channelRef = useRef<any>(null);
  const addMessage = useChatStore((state) => state.addMessage);
  const triggerRefresh = useChatStore((state) => state.triggerRefresh);

  useEffect(() => {
    if (!currentUserId) return;

    if (channelRef.current) {
      console.log("[useChatSubscription] Cleaning up existing subscription");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log("[useChatSubscription] Setting up global chat subscription for user:", currentUserId);

    const channel = supabase
      .channel(`global-chat-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          console.log("[useChatSubscription] New message detected:", payload);
          const newMessage = payload.new as any;

          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, role")
            .eq("user_id", newMessage.sender_id)
            .maybeSingle();

          const messageWithSender: ChatMessageWithSender = {
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

          addMessage(newMessage.conversation_id, messageWithSender);
          triggerRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
        },
        async (payload) => {
          console.log("[useChatSubscription] Conversation updated:", payload);
          triggerRefresh();
        }
      )
      .subscribe((status) => {
        console.log("[useChatSubscription] Subscription status:", status);
      });

    channelRef.current = channel;

    return () => {
      console.log("[useChatSubscription] Unsubscribing");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUserId, addMessage, triggerRefresh]);
}
