// src/layouts/RootLayout.tsx
import { Outlet, Link, useLocation } from "react-router-dom";
import { useMemo, useEffect, useRef, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useChatSubscription } from "@/hooks/useChatSubscription";
import { Building2 } from "lucide-react";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatWindow from "@/components/chat/ChatWindow";

// Navbars
import PublicNavbar from "@/components/navbars/PublicNavbar";
import AdminNavbar from "@/components/navbars/AdminNavbar";
import SubcontractorNavbar from "@/components/navbars/SubcontractorNavbar";
import SalNavbar from "@/components/navbars/SalNavbar";
import TechNavbar from "@/components/navbars/TechNavbar";
import ClientNavbar from "@/components/navbars/ClientNavbar";

export default function RootLayout() {
  // 🔒 TOUS les hooks en haut, ordre stable
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const location = useLocation();

  useChatSubscription();

  // (facultatif) si tu veux remonter en haut à chaque navigation
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [navClosedTick, setNavClosedTick] = useState(0);

  useEffect(() => {
    // ferme éventuels menus et remonte
    setNavClosedTick((n) => n + 1);
    if (scrollerRef.current) {
      queueMicrotask(() =>
        scrollerRef.current?.scrollTo?.({ top: 0, behavior: "instant" as ScrollBehavior })
      );
    }
  }, [location.pathname]);

  // États dérivés — PAS de return conditionnel, on pilote l’UI avec des flags
  const isLoadingAuth = authLoading;
  const isLoadingProfile = !!user && profileLoading;
  const isFullyLoaded = !isLoadingAuth && (!user || !profileLoading);
  const role = (isFullyLoaded && profile?.role) || null;

  // Choix de la navbar via useMemo (pas de hooks dedans)
  const Navbar = useMemo(() => {
    if (isLoadingAuth) {
      return function LoadingNavbar() {
        return (
          <header className="border-b bg-white">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-600">Chargement…</span>
              </div>
            </div>
          </header>
        );
      };
    }
    if (!user) return PublicNavbar;
    if (isLoadingProfile) {
      return function LoadingProfileNavbar() {
        return (
          <header className="border-b bg-white">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-slate-900">
                <Building2 className="w-6 h-6 text-blue-600" />
                Nexus Clim
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-600">Chargement du profil…</span>
              </div>
            </div>
          </header>
        );
      };
    }
    switch ((role || "").toLowerCase()) {
      case "admin":
        return AdminNavbar;
      case "tech":
        return TechNavbar;
      case "st":
      case "subcontractor":
        return SubcontractorNavbar;
      case "sal":
      case "employee":
        return SalNavbar;
      case "client":
        return ClientNavbar;
      default:
        return function FallbackNavbar() {
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
        };
    }
  }, [isLoadingAuth, user, isLoadingProfile, role]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar key={navClosedTick} />

      {/* Bandeaux d'info en haut si besoin, sans affecter l'ordre des hooks */}
      {isLoadingAuth && (
        <div className="w-full bg-amber-50 border-b border-amber-200 text-amber-800 text-sm py-2 text-center">
          Connexion en cours…
        </div>
      )}
      {!!user && isLoadingProfile && !isLoadingAuth && (
        <div className="w-full bg-blue-50 border-b border-blue-200 text-blue-800 text-sm py-2 text-center">
          Chargement du profil…
        </div>
      )}

      <main ref={scrollerRef} className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Chat system - visible on all pages when authenticated */}
      {user && (
        <>
          <ChatBubble />
          <ChatWindow />
        </>
      )}
    </div>
  );
}
