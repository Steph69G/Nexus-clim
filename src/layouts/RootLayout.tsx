import { Outlet, Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { Building2 } from "lucide-react";

// Import des navbars spécifiques
import PublicNavbar from "@/components/navbars/PublicNavbar";
import AdminNavbar from "@/components/navbars/AdminNavbar";
import SubcontractorNavbar from "@/components/navbars/SubcontractorNavbar";
import SalNavbar from "@/components/navbars/SalNavbar";
import TechNavbar from "@/components/navbars/TechNavbar";
import ClientNavbar from "@/components/navbars/ClientNavbar";

export default function RootLayout() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  // États de chargement
  const isLoadingAuth = authLoading;
  const isLoadingProfile = !!user && profileLoading;
  const isFullyLoaded = !isLoadingAuth && (!user || !profileLoading);

  // Rôle final (seulement si tout est chargé)
  const role = isFullyLoaded && profile ? profile.role : null;

  // Pendant le chargement initial de l'auth, on affiche une navbar minimale
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="border-b bg-white">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-600">Chargement...</span>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    );
  }

  // Pas connecté → navbar publique
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <PublicNavbar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    );
  }

  // Connecté mais profil en cours de chargement → navbar avec indicateur
  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="border-b bg-white">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-slate-900">
              <Building2 className="w-6 h-6 text-blue-600" />
              Nexus Clim
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-slate-600">Chargement du profil...</span>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    );
  }

  // Connecté avec profil chargé → navbar selon le rôle
  const NavbarComponent = () => {
    switch (role) {
      case "admin":
        return <AdminNavbar />;
      case "tech":
        return <TechNavbar />;
      case "st":
        return <SubcontractorNavbar />;
      case "sal":
        return <SalNavbar />;
      case "client":
        return <ClientNavbar />;
      default:
        // Rôle non reconnu → navbar basique avec lien vers profil
        return (
          <header className="border-b bg-white">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-slate-900">
                <Building2 className="w-6 h-6 text-blue-600" />
                Nexus Clim
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-sm text-amber-600">Rôle non défini</span>
                <Link
                  to="/account/profile"
                  className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg font-medium hover:bg-amber-200 transition-all"
                >
                  Configurer mon profil
                </Link>
              </div>
            </div>
          </header>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavbarComponent />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}