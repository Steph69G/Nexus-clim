// src/routes/RequireRole.tsx
import { Navigate, useLocation } from "react-router-dom";
import { ReactElement } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { useProfile } from "@/hooks/useProfile";

type Props = {
  allow: string[];              // rôles autorisés: ["admin"], ["st","sal"], etc.
  element: ReactElement;        // composant cible
  fallback?: ReactElement;      // optionnel
};

function norm(x: unknown) {
  return String(x ?? "").trim().toLowerCase();
}

export default function RequireRole({ allow, element, fallback }: Props) {
  const loc = useLocation();
  const { user, loading: authLoading } = useAuth();          // 👈 on lit user (PAS session)
  const { profile, loading: profileLoading } = useProfile();

  // 1) Tant que l’auth charge → attendre
  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="text-sm opacity-70">Chargement de la session…</div>
      </div>
    );
  }

  // 2) Pas connecté → vers /login (avec retour prévu)
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  // 3) Session ok → attendre le profil
  if (profileLoading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="text-sm opacity-70">Vérification des autorisations…</div>
      </div>
    );
  }

  // 4) Profil introuvable → vers onboarding (ou change la route si besoin)
  if (!profile) {
    return <Navigate to="/onboarding" replace state={{ from: loc }} />;
  }

  // 5) Contrôle du rôle
  const allowed = allow.map(norm);
  const actual = norm(profile.role);
  if (!allowed.includes(actual)) {
    return fallback ?? <Navigate to="/403" replace />;
  }

  // 6) OK
  return element;
}
