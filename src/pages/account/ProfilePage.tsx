import { useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import AdminProfilePage from "./AdminProfilePage";
import SubcontractorProfilePage from "./SubcontractorProfilePage";
import SalProfilePage from "./SalProfilePage";
import ClientProfilePage from "./ClientProfilePage";

// ————————————————————————————————————————————————
// ProfilePage
// Affiche la page de profil selon le rôle.
// Admin, ST et SAL voient aussi le bloc "Préférences".
// Mise à niveau ergonomique : largeur unifiée et encart d'aide.
// ————————————————————————————————————————————————
export default function ProfilePage() {
  const { profile, loading } = useProfile();

  // Normalise le rôle pour éviter les surprises (ex: "admin" vs "ADMIN")
  const role = useMemo(() => (profile?.role ?? "").toString().toUpperCase(), [profile?.role]);

  const isAdmin = role === "ADMIN";
  const isSubcontractor = role === "ST" || role === "SUBCONTRACTOR"; // tolérance si autre libellé
  const isSal = role === "SAL";

  // Pendant le chargement, afficher un spinner propre
  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement du profil…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {isAdmin && <AdminProfilePage />}
      {isSubcontractor && <SubcontractorProfilePage />}
      {isSal && !isAdmin && !isSubcontractor && <SalProfilePage />}
      {!isAdmin && !isSubcontractor && !isSal && <ClientProfilePage />}
    </div>
  );
}
