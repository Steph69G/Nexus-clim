import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AuthCtx = {
  session: any;
  user: any;
  loading: boolean;
  signOut: () => Promise<void>;
};
const Ctx = createContext<AuthCtx>({ session: null, user: null, loading: true, signOut: async () => {} });
export function useAuth() { return useContext(Ctx); }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false); // ne jamais bloquer l’UI

      const uid = data.session?.user?.id;
      const email = data.session?.user?.email ?? null;
      if (uid) {
        // update en arrière-plan, sans .catch
        (async () => {
          try {
            await supabase.from("profiles").update({ email }).eq("user_id", uid);
          } catch { /* ignore */ }
        })();
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);

      const uid = sess?.user?.id;
      const email = sess?.user?.email ?? null;
      if (uid) {
        (async () => {
          try {
            await supabase.from("profiles").update({ email }).eq("user_id", uid);
          } catch { /* ignore */ }
        })();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <Ctx.Provider value={{ session, user, loading, signOut }}>{children}</Ctx.Provider>;
}
