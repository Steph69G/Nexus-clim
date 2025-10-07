import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useProfile } from "@/hooks/useProfile";

function TechNavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-2 rounded-lg transition-colors ${
          isActive 
            ? "bg-blue-600 text-white font-medium" 
            : "text-gray-700 hover:bg-gray-100"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function TechDashboard() {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  
  // Déterminer si on est sur la page principale du dashboard
  const isMainDashboard = location.pathname === "/tech" || location.pathname === "/tech/";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec navigation */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo et titre */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">Espace Technicien</h1>
                <p className="text-xs text-gray-500">
                  {profile?.full_name || profile?.email || "Technicien"}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <TechNavItem to="/tech">🏠 Accueil</TechNavItem>
              <TechNavItem to="/tech/offers">📋 Offres</TechNavItem>
              <TechNavItem to="/tech/missions">🔧 Mes missions</TechNavItem>
              <TechNavItem to="/tech/map">🗺️ Carte</TechNavItem>
              <TechNavItem to="/account/profile">👤 Mon profil</TechNavItem>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={signOut}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
              >
                Déconnexion
              </button>
            </div>
          </div>

          {/* Navigation mobile */}
          <div className="md:hidden pb-3">
            <nav className="flex gap-2 overflow-x-auto">
              <TechNavItem to="/tech">🏠</TechNavItem>
              <TechNavItem to="/tech/offers">📋</TechNavItem>
              <TechNavItem to="/tech/missions">🔧</TechNavItem>
              <TechNavItem to="/tech/map">🗺️</TechNavItem>
              <TechNavItem to="/account/profile">👤</TechNavItem>
            </nav>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {isMainDashboard ? <TechHome /> : <Outlet />}
      </main>
    </div>
  );
}

// Page d'accueil du technicien
function TechHome() {
  const { profile } = useProfile();
  const [stats, setStats] = useState({
    offresDisponibles: 0,
    mesMissions: 0,
    missionsTerminees: 0,
  });

  return (
    <div className="space-y-6">
      {/* Bienvenue */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-2">
          Bonjour {profile?.full_name || "Technicien"} ! 👋
        </h2>
        <p className="text-gray-600">
          Bienvenue dans votre espace technicien. Vous pouvez consulter les offres disponibles, 
          gérer vos missions et suivre votre activité.
        </p>
      </section>

      {/* Statistiques rapides */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-lg">📋</span>
            </div>
            <div>
              <div className="text-2xl font-semibold">{stats.offresDisponibles}</div>
              <div className="text-sm text-gray-600">Offres disponibles</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 text-lg">🔧</span>
            </div>
            <div>
              <div className="text-2xl font-semibold">{stats.mesMissions}</div>
              <div className="text-sm text-gray-600">Missions en cours</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-lg">✅</span>
            </div>
            <div>
              <div className="text-2xl font-semibold">{stats.missionsTerminees}</div>
              <div className="text-sm text-gray-600">Missions terminées</div>
            </div>
          </div>
        </div>
      </section>

      {/* Actions rapides */}
      <section className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-medium mb-4">Actions rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <NavLink
            to="/tech/offers"
            className="p-4 border rounded-lg hover:bg-gray-50 text-center transition-colors"
          >
            <div className="text-2xl mb-2">📋</div>
            <div className="font-medium">Voir les offres</div>
            <div className="text-xs text-gray-500">Nouvelles opportunités</div>
          </NavLink>

          <NavLink
            to="/tech/missions"
            className="p-4 border rounded-lg hover:bg-gray-50 text-center transition-colors"
          >
            <div className="text-2xl mb-2">🔧</div>
            <div className="font-medium">Mes missions</div>
            <div className="text-xs text-gray-500">Missions assignées</div>
          </NavLink>

          <NavLink
            to="/tech/map"
            className="p-4 border rounded-lg hover:bg-gray-50 text-center transition-colors"
          >
            <div className="text-2xl mb-2">🗺️</div>
            <div className="font-medium">Carte</div>
            <div className="text-xs text-gray-500">Localisation missions</div>
          </NavLink>

          <NavLink
            to="/account/profile"
            className="p-4 border rounded-lg hover:bg-gray-50 text-center transition-colors"
          >
            <div className="text-2xl mb-2">👤</div>
            <div className="font-medium">Mon profil</div>
            <div className="text-xs text-gray-500">Paramètres compte</div>
          </NavLink>
        </div>
      </section>

      {/* Informations utiles */}
      <section className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">💡 Conseils</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Consultez régulièrement les nouvelles offres pour ne rien manquer</li>
          <li>• Mettez à jour votre localisation sur la carte pour recevoir des offres pertinentes</li>
          <li>• Complétez votre profil pour améliorer votre visibilité</li>
        </ul>
      </section>
    </div>
  );
}