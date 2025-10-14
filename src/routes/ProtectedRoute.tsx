// src/auth/ProtectedRoute.tsx
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useProfile } from "@/hooks/useProfile";

interface Props {
  children: ReactNode;
  allowedRoles?: string[]; // ex: ["admin"] ou ["admin","manager"]
}

function norm(x: unknown) {
  return String(x ?? "").trim().toLowerCase();
}

export default function ProtectedRoute({ children, allowedRoles = [] }: Props) {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (authLoading) {
    return <div className="min-h-screen grid place-items-center p-6 opacity-70">Chargement de la session…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (profileLoading) {
    return <div className="min-h-screen grid place-items-center p-6 opacity-70">Vérification des droits…</div>;
  }

  if (!profile) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0) {
    const wanted = allowedRoles.map(norm);
    const actual = norm(profile.role);
    if (!wanted.includes(actual)) return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
