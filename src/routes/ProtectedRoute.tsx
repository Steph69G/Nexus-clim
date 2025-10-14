import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { AppRole } from "@/lib/roles";

interface Props {
  children: ReactNode;
  allowedRoles: AppRole[]; // ex: ["ADMIN"] ou ["ADMIN","MANAGER"]
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { profile, loading } = useProfile();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      // Pas connecté → retour login
      nav("/login", { replace: true });
      return;
    }

    if (!allowedRoles.includes(profile.role)) {
      // Connecté mais rôle non autorisé
// src/auth/ProtectedRoute.tsx
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { AppRole } from "@/lib/roles";

interface Props {
  children: ReactNode;
  allowedRoles?: AppRole[]; // ex: ["ADMIN"] ou ["ADMIN","MANAGER"]
}

function normalizeRole(r: unknown) {
  return String(r ?? "").trim().toLowerCase();
}

export default function ProtectedRoute({ children, allowedRoles = [] }: Props) {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  // 1) Tant que la session charge → splash
  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="text-sm opacity-70">Chargement de la session…</div>
      </div>
    );
  }

  // 2) Pas de session → vers /login (et on garde la cible pour redirect après)
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 3) La session existe → on attend le profil
  if (profileLoading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="text-sm opacity-70">Vérification des droits…</div>
      </div>
    );
  }

  // 4) Si pas de profil (compte tout juste créé ?), oriente vers onboarding
  if (!profile) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }

  // 5) Contrôle des rôles (insensible à la casse)
  if (allowedRoles.length > 0) {
    const wanted = allowedRoles.map(normalizeRole);
    const actual = normalizeRole(profile.role);
    if (!wanted.includes(actual)) {
      return <Navigate to="/403" replace />;
    }
  }

  // 6) OK
  return <>{children}</>;
}
      nav("/403", { replace: true });
    }
  }, [profile, loading, nav, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="text-sm opacity-70">Vérification des droits…</div>
      </div>
    );
  }

  // Si on est là, c’est que profile existe et rôle autorisé
  return <>{children}</>;
}
