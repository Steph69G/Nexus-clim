// src/auth/index.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase";

type Role = "ADMIN" | "DISPATCH" | "TECH" | "ST" | "SAL" | null;

type AuthState = {
  loading: boolean;
  session: any | null;
  user: any | null;
  role: Role;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  loading: true,
  session: null,
  user: null,
  role: null,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<Role>(null);

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from("users_profile")
      .select("role")
      .eq("id", uid)
      .maybeSingle();
    if (!error && data) setRole(data.role as Role);
    else setRole(null);
  };

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setUser(data.session?.user ?? null);
    if (data.session?.user?.id) await fetchProfile(data.session.user.id);
    else setRole(null);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user?.id) fetchProfile(sess.user.id);
      else setRole(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  const value = useMemo(
    () => ({ loading, session, user, role, refresh, signOut }),
    [loading, session, user, role]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

// --------- Garde de rôle ----------
export function RequireRole({
  allow,
  children,
  redirectTo,
}: {
  allow: Array<"ADMIN" | "DISPATCH" | "TECH" | "ST" | "SAL">;
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { loading, user, role } = useAuth();
  const loc = useLocation();

  if (loading) return <div className="p-6">Chargement…</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (!role || !allow.includes(role as any))
    return <Navigate to={redirectTo ?? "/403"} replace />;
  return <>{children}</>;
}

// --------- Redirection selon rôle ----------
export function RoleRedirect() {
  const { loading, user, role } = useAuth();
  if (loading) return <div className="p-6">Chargement…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role === "TECH") return <Navigate to="/app/feed" replace />;
  if (role === "ADMIN" || role === "DISPATCH")
    return <Navigate to="/admin/missions" replace />;
  return <Navigate to="/403" replace />;
}
