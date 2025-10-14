// src/auth/AuthProvider.tsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type SessionUser = { id: string; email?: string | null } | null;

type AuthContextValue = {
  user: SessionUser;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const bootedRef = useRef(false); // évite de re-booter en StrictMode dev

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      if (bootedRef.current) {
        // StrictMode double-mount en dev : ne refais pas le bootstrap
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn("[Auth] getSession error:", error.message);
        const u = data?.session?.user ?? null;
        if (mountedRef.current) {
          setUser(u ? { id: u.id, email: u.email } : null);
        }
      } catch (e) {
        console.error("[Auth] bootstrap exception:", e);
        if (mountedRef.current) setUser(null);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          bootedRef.current = true;
        }
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // ⚠️ ne touche pas à loading ici — seulement bootstrap/refresh gèrent loading
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
    try {
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user ?? null;
      if (mountedRef.current) setUser(u ? { id: u.id, email: u.email } : null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const value = useMemo<AuthContextValue>(() => ({ user, loading, refresh }), [user, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
