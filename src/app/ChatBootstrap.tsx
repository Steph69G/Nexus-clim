import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useChatSubscription } from "@/hooks/useChatSubscription";
import { useChatStore } from "@/components/chat/chatStore";

export default function ChatBootstrap() {
  useChatSubscription();
  const setStoreUserId = useChatStore((s) => s.setCurrentUserId);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setStoreUserId(user.id);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) setStoreUserId(s.user.id);
    });
    return () => sub?.subscription?.unsubscribe();
  }, [setStoreUserId]);

  return null;
}
