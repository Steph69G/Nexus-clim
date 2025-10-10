// src/auth/AuthProvider.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type SessionUser = { id: string; email?: string | null } | null;

const AuthCtx = createContext<{ user: SessionUser; loading: boolean }>({
  user: null,
  loading: true,
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1) Récupération initiale avec timeout pour éviter moulinage
    (async () => {
      try {
        const timeout = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 8000)
        );
        const get = supabase.auth.getUser().then((res) => res.data.user ?? null);
        const u = (await Promise.race([get, timeout])) as any;
        if (!mounted) return;
        setUser(u ? { id: u.id, email: u.email } : null);
      } catch (e) {
        console.error("[AuthProvider] getUser error:", e);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // 2) Écoute des changements d’auth
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
