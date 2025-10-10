// src/auth/AuthProvider.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AuthCtx = {
  session: any;
  user: any;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(Ctx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      // Rediriger après sign out (optionnel)
      window.location.href = "/";
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Abonnement unique : reçoit aussi l'état initial via `INITIAL_SESSION`
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, sess) => {
        if (!mounted) return;

        setSession(sess);
        setUser(sess?.user ?? null);
        setLoading(false); // ne jamais bloquer l’UI

        // MAJ email de profil en arrière-plan (best-effort)
        const uid = sess?.user?.id ?? null;
        const email = sess?.user?.email ?? null;
        if (uid) {
          try {
            await supabase.from("profiles").update({ email }).eq("user_id", uid);
          } catch {
            // silencieux : on ne bloque rien si ça échoue
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider value={{ session, user, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}
