import { supabase } from "@/lib/supabase";
import { ensureAuthenticated } from "@/lib/authCheck";
import type {
  Conversation,
  ConversationParticipant,
  ChatMessage,
  ConversationWithParticipants,
  ChatMessageWithSender,
} from "@/types/database";

export async function fetchMyConversations(): Promise<ConversationWithParticipants[]> {
  const { data: myParticipations, error: participationsError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id || "");

  if (participationsError) throw participationsError;

  const conversationIds = myParticipations.map((p) => p.conversation_id);

  if (conversationIds.length === 0) return [];

  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select(`
      *,
      participants:conversation_participants(
        *,
        profile:profiles(user_id, full_name, avatar_url, role)
      )
    `)
    .in("id", conversationIds)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (conversationsError) throw conversationsError;

  const conversationsWithUnread = await Promise.all(
    (conversations || []).map(async (conv) => {
      const unreadCount = await getUnreadCount(conv.id);
      const lastMessage = await getLastMessage(conv.id);

      return {
        ...conv,
        unread_count: unreadCount,
        last_message: lastMessage,
      };
    })
  );

  return conversationsWithUnread as ConversationWithParticipants[];
}

export async function fetchConversation(
  conversationId: string
): Promise<ConversationWithParticipants | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      *,
      participants:conversation_participants(
        *,
        profile:profiles(user_id, full_name, avatar_url, role)
      )
    `)
    .eq("id", conversationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const unreadCount = await getUnreadCount(conversationId);
  const lastMessage = await getLastMessage(conversationId);

  return {
    ...data,
    unread_count: unreadCount,
    last_message: lastMessage,
  } as ConversationWithParticipants;
}

export async function fetchConversationMessages(
  conversationId: string,
  limit = 50
): Promise<ChatMessageWithSender[]> {
  const { data: messages, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const senderIds = [...new Set(messages?.map((m) => m.sender_id) || [])];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url, role")
    .in("user_id", senderIds);

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

  const messagesWithSenders = (messages || []).map((msg) => ({
    ...msg,
    sender: profileMap.get(msg.sender_id)
      ? {
          id: msg.sender_id,
          full_name: profileMap.get(msg.sender_id)!.full_name,
          avatar_url: profileMap.get(msg.sender_id)?.avatar_url,
          role: profileMap.get(msg.sender_id)!.role,
        }
      : undefined,
  }));

  return messagesWithSenders.reverse() as ChatMessageWithSender[];
}

export async function sendMessage(
  conversationId: string,
  messageText: string,
  messageType: "text" | "image" | "file" | "system" = "text",
  metadata: Record<string, any> = {}
): Promise<ChatMessage> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message_text: messageText,
      message_type: messageType,
      metadata,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ChatMessage;
}

export async function createConversation(
  type: "direct" | "group" | "mission",
  participantIds: string[],
  title?: string,
  missionId?: string
): Promise<Conversation> {
  const user = await ensureAuthenticated();

  console.log("[createConversation] Creating conversation as user:", user.id);

  if (!user || !user.id) {
    throw new Error("Cannot create conversation: user is not authenticated or user.id is missing");
  }

  if (type === "direct" && participantIds.length !== 1) {
    throw new Error("Direct conversations must have exactly 1 other participant");
  }

  console.log("[createConversation] Calling RPC with params:", {
    title: title || null,
    participantIds,
    type,
  });

  const { data, error } = await supabase.rpc("create_conversation", {
    p_title: title || null,
    p_participant_ids: participantIds,
    p_initial_message: null,
  });

  if (error) {
    console.error("[createConversation] RPC error:", error);
    throw error;
  }

  console.log("[createConversation] Conversation created:", data);
  return data as Conversation;
}

async function findDirectConversation(
  userId1: string,
  userId2: string
): Promise<Conversation | null> {
  const { data: conversations } = await supabase
    .from("conversations")
    .select(`
      *,
      participants:conversation_participants(user_id)
    `)
    .eq("type", "direct");

  if (!conversations) return null;

  const directConv = conversations.find((conv: any) => {
    const participantIds = conv.participants.map((p: any) => p.user_id);
    return (
      participantIds.length === 2 &&
      participantIds.includes(userId1) &&
      participantIds.includes(userId2)
    );
  });

  if (directConv) {
    const { participants, ...rest } = directConv as any;
    return rest as Conversation;
  }

  return null;
}

export async function markConversationAsRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });

  if (error) throw error;
}

export async function getUnreadCount(conversationId: string): Promise<number> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return 0;

  const { data, error } = await supabase.rpc("get_unread_count", {
    p_conversation_id: conversationId,
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }

  return data || 0;
}

export async function getTotalUnreadCount(): Promise<number> {
  const conversations = await fetchMyConversations();
  return conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
}

async function getLastMessage(conversationId: string): Promise<ChatMessage | undefined> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching last message:", error);
    return undefined;
  }

  return data as ChatMessage | undefined;
}

export async function editMessage(messageId: string, newText: string): Promise<void> {
  const { error } = await supabase
    .from("chat_messages")
    .update({
      message_text: newText,
      edited_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  if (error) throw error;
}

export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from("chat_messages")
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  if (error) throw error;
}

export function subscribeToConversationMessages(
  conversationId: string,
  onMessage: (message: ChatMessage) => void
) {
  const channel = supabase
    .channel(`conversation-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new as ChatMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToUserConversations(
  onConversationUpdate: (conversation: Conversation) => void
) {
  const channel = supabase
    .channel("user-conversations")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
      },
      (payload) => {
        onConversationUpdate(payload.new as Conversation);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function addParticipant(
  conversationId: string,
  userId: string,
  role: "member" | "admin" = "member"
): Promise<void> {
  const { error } = await supabase.from("conversation_participants").insert({
    conversation_id: conversationId,
    user_id: userId,
    role,
  });

  if (error) throw error;
}

export async function removeParticipant(
  conversationId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("conversation_participants")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function updateConversation(
  conversationId: string,
  updates: { title?: string }
): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update(updates)
    .eq("id", conversationId);

  if (error) throw error;
}
