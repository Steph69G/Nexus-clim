import { useProfile } from "@/hooks/useProfile";
import AdminProfilePage from "./AdminProfilePage";
import SubcontractorProfilePage from "./SubcontractorProfilePage";
import SalProfilePage from "./SalProfilePage";
import ClientProfilePage from "./ClientProfilePage";

export default function ProfilePage() {
  const { profile, loading } = useProfile();

  // 🔍 DEBUG : Afficher les valeurs exactes
  console.log("ProfilePage DEBUG:", {
    profile_role: profile?.role,
    profile_raw: profile,
    loading
  });

  // Pendant le chargement, afficher un spinner
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

  // Router vers le bon composant selon le rôle
  switch (profile.role) {
    case "admin":
      return <AdminProfilePage />;
    case "st":
      return <SubcontractorProfilePage />;
    case "sal":
      return <SalProfilePage />;
    case "tech":
      return <AdminProfilePage />; // Les techs utilisent le même style que les admins
    case "client":
      return <ClientProfilePage />;
    default:
      return <AdminProfilePage />; // Fallback vers admin
  }
}