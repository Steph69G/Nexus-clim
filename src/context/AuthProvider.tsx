// src/context/AuthProvider.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/supabase";

type AuthCtx = { user: any | null; loading: boolean };
const Ctx = createContext<AuthCtx>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let sub = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (sub) setUser(user ?? null);
      setLoading(false);
    })();
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => { sub = false; listener.subscription.unsubscribe(); };
  }, []);

  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
