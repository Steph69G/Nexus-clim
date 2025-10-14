// src/auth/AuthProvider.tsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type SessionUser = { id: string; email?: string | null } | null;

type AuthContextValue = {
  user: SessionUser;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>; // 👈 ajouté
};

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {}, // 👈 ajouté
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user ?? null;
      if (mountedRef.current) setUser(u ? { id: u.id, email: u.email } : null);
      if (mountedRef.current) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;
      const u = session?.user ?? null;
      setUser(u ? { id: u.id, email: u.email } : null);
    });

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const u = data?.session?.user ?? null;
    if (mountedRef.current) setUser(u ? { id: u.id, email: u.email } : null);
    if (mountedRef.current) setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();     // 👈 déconnexion Supabase
    if (mountedRef.current) {
      setUser(null);                   // 👈 reset immédiat du contexte
    }
  };

  const value = useMemo(() => ({ user, loading, refresh, signOut }), [user, loading]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
