import OperationalSection from "@/components/operations/OperationalSection";
import OperationalCard from "@/components/operations/OperationalCard";
import { useProfile } from "@/hooks/useProfile";
import {
  Calendar,
  Map as MapIcon,
  Wrench,
  Inbox,
  User,
} from "lucide-react";

export default function SubcontractorOperationalCenter() {
  const { profile } = useProfile();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2">
            <Wrench className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Centre Opérationnel</h1>
        </div>
        <p className="text-base text-gray-600 ml-14">
          Bienvenue {profile?.full_name || "Sous-traitant"}. Gérez vos offres, missions et interventions.
        </p>
      </div>

      <OperationalSection
        title="Mes Missions"
        subtitle="Consultez et gérez vos interventions."
      >
        <OperationalCard
          icon={<Inbox className="h-6 w-6" />}
          title="Offres Reçues"
          description="Découvrez les nouvelles opportunités de missions."
          to="/offers"
          color="purple"
        />
        <OperationalCard
          icon={<Wrench className="h-6 w-6" />}
          title="Mes Missions"
          description="Missions assignées et en cours."
          to="/app/missions/my"
          color="blue"
        />
        <OperationalCard
          icon={<Calendar className="h-6 w-6" />}
          title="Mon Planning"
          description="Visualisez votre planning personnel."
          to="/calendar"
          color="cyan"
        />
      </OperationalSection>

      <OperationalSection
        title="Outils"
        subtitle="Accédez à vos outils de travail."
      >
        <OperationalCard
          icon={<MapIcon className="h-6 w-6" />}
          title="Carte"
          description="Localisez vos missions sur la carte."
          to="/tech/map"
          color="green"
        />
        <OperationalCard
          icon={<User className="h-6 w-6" />}
          title="Mon Profil"
          description="Gérez vos informations et préférences."
          to="/account/profile"
          color="orange"
        />
      </OperationalSection>
    </div>
  );
}
