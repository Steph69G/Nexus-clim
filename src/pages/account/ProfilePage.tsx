import { useProfile } from "@/hooks/useProfile";
import AdminProfilePage from "./AdminProfilePage";
import SubcontractorProfilePage from "./SubcontractorProfilePage";
import SalProfilePage from "./SalProfilePage";
import ClientProfilePage from "./ClientProfilePage";
import PreferencesCard from "./PreferencesCard";

export default function ProfilePage() {
  const { profile, loading } = useProfile();

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du profil…</p>
        </div>
      </div>
    );
  }

  // Sélectionne la sous-page en fonction du rôle
  let RolePage: React.FC = AdminProfilePage;
  switch (profile.role) {
    case "admin":
      RolePage = AdminProfilePage;
      break;
    case "st":
      RolePage = SubcontractorProfilePage;
      break;
    case "sal":
      RolePage = SalProfilePage;
      break;
    case "tech":
      RolePage = AdminProfilePage; // même présentation que l’admin chez toi
      break;
    case "client":
      RolePage = ClientProfilePage;
      break;
    default:
      RolePage = AdminProfilePage;
  }

  // On affiche le bloc "Préférences" pour ST / SAL / TECH (tu peux ajouter "admin" si tu veux)
  const showPreferences = ["st", "sal", "tech"].includes(String(profile.role).toLowerCase());

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Sous-page propre au rôle */}
      <RolePage />

      {/* Bloc Préférences (distance + types) */}
      {showPreferences && <PreferencesCard />}
    </div>
  );
}
