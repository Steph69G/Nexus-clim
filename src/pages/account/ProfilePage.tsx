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

  // Un wrapper commun pour forcer la même largeur visuelle à tous les blocs
  const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full max-w-3xl mx-auto">{children}</div>
  );

  // Composant utilitaire pour afficher le bloc Préférences + encart d'aide
  const PreferencesSection = () => (
    <Section>
      {/* hideAddress est facultatif : si le composant l'ignore, aucun crash */}
      {/* @ts-ignore - tolère l'absence éventuelle de la prop dans la définition */}
      <PreferencesCard hideAddress />
      <p className="text-sm text-slate-500 mt-3">
        Vos préférences influencent les types de missions et les zones proposées automatiquement. Vous pouvez les modifier à tout moment.
      </p>
    </Section>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ADMIN */}
        {isAdmin && (
          <>
            <Section>
              <AdminProfilePage />
            </Section>
            <PreferencesSection />
          </>
        )}

        {/* SOUS-TRAITANT (ST) */}
        {isSubcontractor && (
          <>
            <Section>
              <SubcontractorProfilePage />
            </Section>
            <PreferencesSection />
          </>
        )}

        {/* SALARIÉ (SAL) */}
        {isSal && !isAdmin && !isSubcontractor && (
          <>
            <Section>
              <SalProfilePage />
            </Section>
            <PreferencesSection />
          </>
        )}

        {/* CLIENT / PAR DÉFAUT */}
        {!isAdmin && !isSubcontractor && !isSal && (
          <Section>
            <ClientProfilePage />
          </Section>
        )}
      </div>
    </div>
  );
}
