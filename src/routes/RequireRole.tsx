import { Navigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { type UiRole } from "@/lib/roles";

type Props = {
  allow: Array<UiRole>;
  element: JSX.Element;
  fallback?: JSX.Element; // optionnel: contenu 403
};

export default function RequireRole({ allow, element, fallback }: Props) {
  const { loading: authLoading, session } = useAuth();
  const { profile, loading: profileLoading, err } = useProfile();
  const loc = useLocation();

  // 1) Pendant que ça charge, on n’expulse personne
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Vérification des autorisations...</p>
        </div>
      </div>
    );
  }

  // 2) Pas connecté → vers /login (et on garde la page d’origine)
  if (!session) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }

  // 3) Connecté mais pas de profil ou erreur → on empêche l’accès admin, mais SANS renvoyer au login
  if (!profile || err) {
    return fallback ?? (
      <div className="p-6">
        <h1 className="text-lg font-semibold mb-2">Profil en cours de chargement</h1>
        <p className="text-sm text-gray-600 mb-4">
          {err ? `Erreur: ${err}` : "Votre profil n'est pas encore configuré."}
        </p>
        <p className="text-sm text-gray-600">
          Connecté en tant que: {session?.user?.email}
        </p>
        <div className="mt-4">
          <a href="/account/profile" className="text-blue-600 hover:underline">
            → Configurer mon profil
          </a>
        </div>
      </div>
    );
  }

  // 4) Check du rôle
  const role = profile.role; // UiRole | null
  
  if (role && allow.includes(role)) {
    return element;
  }

  // 5) Connecté mais non autorisé → 403 ou home
  return (
    fallback ?? (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md mx-auto bg-white rounded-lg border p-6 text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h1 className="text-xl font-semibold mb-4">Accès refusé</h1>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              Vous êtes connecté en tant que <strong>{profile.full_name || session?.user?.email}</strong>
            </p>
            <p>
              Rôle actuel : <strong>{role || "non défini"}</strong>
            </p>
            <p>
              Cette page nécessite un des rôles suivants : <strong>{allow.join(", ")}</strong>
            </p>
          </div>
          <div className="mt-6 space-y-3">
            <Link
              to="/account/profile"
              className="block w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Vérifier mon profil
            </Link>
            <Link
              to="/"
              className="block w-full px-4 py-2 border rounded hover:bg-gray-50"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    )
  );
}
