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
