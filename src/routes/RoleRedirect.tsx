// src/routes/RoleRedirect.tsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useProfile } from "@/hooks/useProfile";

export default function RoleRedirect() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  useEffect(() => {
    if (authLoading || profileLoading) return;

    // non connecté → login
    if (!user) {
      nav("/login", { replace: true, state: { from: loc } });
      return;
    }

    // connecté : route par rôle
    const r = String(profile?.role || "").toLowerCase();
    if (r === "admin")      nav("/admin", { replace: true });
    else if (r === "manager") nav("/manager", { replace: true });
    else if (r === "client")  nav("/client", { replace: true });
    else if (r === "st" || r === "sal" || r === "tech") nav("/offers", { replace: true });
    else nav("/", { replace: true }); // défaut
  }, [authLoading, profileLoading, user, profile, nav, loc]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Redirection en cours…</p>
      </div>
    </div>
  );
}
