import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import {
  Building2,
  LogOut,
  Settings,
  Home,
  Wrench,
  DollarSign,
  UserCog,
  Bell
} from "lucide-react";

export default function SalNavbar() {
  const { signOut } = useAuth();
  const { profile } = useProfile();

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              Nexus <span className="text-orange-600">Clim</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavItem to="/operations" icon={<Home className="w-4 h-4" />}>Accueil</NavItem>
            <NavItem to="/admin/operations" icon={<Wrench className="w-4 h-4" />}>Opérations</NavItem>
            <NavItem to="/admin/comptabilite" icon={<DollarSign className="w-4 h-4" />}>Comptabilité</NavItem>
            <NavItem to="/admin/ressources" icon={<UserCog className="w-4 h-4" />}>Ressources</NavItem>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <UserDropdown profile={profile} signOut={signOut} />
          </div>
        </div>
      </div>

      <div className="md:hidden border-t border-slate-200 bg-slate-50 px-4 py-2">
        <nav className="flex gap-2 overflow-x-auto">
          <MobileNavItem to="/operations" icon={<Home className="w-4 h-4" />} />
          <MobileNavItem to="/admin/operations" icon={<Wrench className="w-4 h-4" />} />
          <MobileNavItem to="/admin/comptabilite" icon={<DollarSign className="w-4 h-4" />} />
          <MobileNavItem to="/admin/ressources" icon={<UserCog className="w-4 h-4" />} />
        </nav>
      </div>
    </header>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:text-orange-700 hover:bg-orange-50 font-medium transition-all text-sm"
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

function MobileNavItem({ to, icon }: { to: string; icon: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:text-orange-700 hover:bg-orange-50 transition-all"
    >
      {icon}
    </Link>
  );
}

function UserDropdown({ profile, signOut }: { profile: any; signOut: () => Promise<void>; }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 hover:bg-slate-200 transition-all"
      >
        <img
          src={profile?.avatar_url || "https://placehold.co/32x32?text=👤"}
          alt="Avatar"
          className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
        />
        <div className="hidden lg:block text-left">
          <div className="text-sm font-medium text-slate-900">
            {profile?.full_name || "Salarié"}
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
          <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <img
                  src={profile?.avatar_url || "https://placehold.co/40x40?text=👤"}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {profile?.full_name || "Salarié"}
                  </div>
                  <div className="text-xs text-slate-600 truncate">
                    {profile?.email}
                  </div>
                </div>
              </div>
            </div>

            <Link
              to="/account/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-all text-slate-700 hover:text-orange-700 font-medium"
            >
              <Settings className="w-4 h-4" />
              <span className="font-medium">Mon profil</span>
            </Link>
            <Link
              to="/account/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-all text-slate-700 hover:text-orange-700 font-medium"
            >
              <Bell className="w-4 h-4" />
              <span className="font-medium">Notifications</span>
            </Link>
            <button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-all text-slate-700 hover:text-red-600 font-medium"
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
