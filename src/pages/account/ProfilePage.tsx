import { useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import AdminProfilePage from "./AdminProfilePage";
import SubcontractorProfilePage from "./SubcontractorProfilePage";
import SalProfilePage from "./SalProfilePage";
import ClientProfilePage from "./ClientProfilePage";
import PreferencesCard from "./PreferencesCard";

// ————————————————————————————————————————————————
// ProfilePage
// Affiche la page de profil selon le rôle.
// Nouveauté : l'ADMIN et le SAL voient aussi le bloc "Préférences" (comme les ST).
// ————————————————————————————————————————————————
export default function ProfilePage() {
  const { profile, loading } = useProfile();

  // Normalise le rôle pour éviter les surprises (ex: "admin" vs "ADMIN")
  const role = useMemo(() => {
    const r = (profile?.role ?? "").toString();
    return r.toUpperCase();
  }, [profile?.role]);

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
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ADMIN */}
        {isAdmin && (
          <>
            <AdminProfilePage />
            <PreferencesCard />
          </>
        )}

        {/* SOUS-TRAITANT (ST) */}
        {isSubcontractor && (
          <>
            <SubcontractorProfilePage />
            <PreferencesCard />
          </>
        )}

        {/* SALARIÉ (SAL) */}
        {isSal && !isAdmin && !isSubcontractor && (
          <>
            <SalProfilePage />
            <PreferencesCard />
          </>
        )}

        {/* CLIENT / PAR DÉFAUT */}
        {!isAdmin && !isSubcontractor && !isSal && <ClientProfilePage />}
      </div>
    </div>
  );
}
