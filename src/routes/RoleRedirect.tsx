import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useProfile } from "@/hooks/useProfile";

export default function RoleRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  // Attendre que tout soit chargé
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  // Pas connecté → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Connecté mais pas de profil → vers le profil pour le compléter
  if (!profile) {
    return <Navigate to="/account/profile" replace />;
  }

  // Redirection selon le rôle
  switch (profile.role) {
    case "admin":
      return <Navigate to="/admin" replace />;
    case "tech":
      return <Navigate to="/tech" replace />;
    case "st":
    case "sal":
      return <Navigate to="/offers" replace />;
    case "client":
      return <Navigate to="/client" replace />;
    default:
      // Rôle non reconnu ou null → vers le profil
      return <Navigate to="/account/profile" replace />;
  }
}