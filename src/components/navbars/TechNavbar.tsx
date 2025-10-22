import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { Building2, LogOut, Settings } from "lucide-react";

export default function TechNavbar() {
  const { signOut } = useAuth();
  const { profile } = useProfile();

  return (
    <header className="bg-white border-b border-orange-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center border border-orange-200 group-hover:bg-orange-200 transition-all">
              <Building2 className="w-5 h-5 text-orange-700" />
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-orange-700 transition-colors">
              Nexus <span className="text-orange-600">Clim</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavItem to="/tech">🏠 Accueil</NavItem>
            <NavItem to="/tech/missions">🔧 Missions</NavItem>
            <NavItem to="/calendar">📅 Agenda</NavItem>
            <NavItem to="/admin/timesheet">⏱️ Heures</NavItem>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <UserDropdown profile={profile} signOut={signOut} />
          </div>
        </div>
      </div>

      {/* Navigation mobile */}
      <div className="md:hidden border-t border-orange-200 bg-orange-50 px-4 py-2">
        <nav className="flex gap-2 overflow-x-auto">
          <MobileNavItem to="/tech">🏠</MobileNavItem>
          <MobileNavItem to="/tech/missions">🔧</MobileNavItem>
          <MobileNavItem to="/calendar">📅</MobileNavItem>
          <MobileNavItem to="/admin/timesheet">⏱️</MobileNavItem>
        </nav>
      </div>
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-2 rounded-lg text-slate-600 hover:text-orange-700 hover:bg-orange-50 font-medium transition-all text-sm"
    >
      {children}
    </Link>
  );
}

function MobileNavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-2 rounded-lg text-slate-600 hover:text-orange-700 hover:bg-orange-100 transition-all whitespace-nowrap text-sm"
    >
      {children}
    </Link>
  );
}

function UserDropdown({ profile, signOut }: { profile: any; signOut: () => Promise<void>; }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-orange-100 rounded-xl px-3 py-2 border border-orange-200 hover:bg-orange-200 transition-all group"
      >
        <img
          src={profile?.avatar_url || "https://placehold.co/32x32?text=👤"}
          alt="Avatar"
          className="w-8 h-8 rounded-full object-cover border border-slate-300"
        />
        <div className="hidden lg:block text-left">
          <div className="text-sm font-medium text-slate-900">
            {profile?.full_name || "Technicien"}
          </div>
        </div>
        <span className="text-slate-400 text-xs">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden">
            {/* Header du dropdown avec infos utilisateur */}
            <div className="px-4 py-3 border-b border-slate-200/50 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <img
                  src={profile?.avatar_url || "https://placehold.co/40x40?text=👤"}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/50"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {profile?.full_name || "Technicien"}
                  </div>
                  <div className="text-xs text-slate-600 truncate">
                    {profile?.email}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <Link
              to="/account/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-all text-slate-700 hover:text-orange-600 font-medium"
            >
              <Settings className="w-4 h-4" />
              <span className="font-medium">Mon profil</span>
            </Link>
            <button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50/80 transition-all text-slate-700 hover:text-red-600 font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
