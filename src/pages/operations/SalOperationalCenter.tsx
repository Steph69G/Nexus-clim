import OperationalSection from "@/components/operations/OperationalSection";
import OperationalCard from "@/components/operations/OperationalCard";
import { useProfile } from "@/hooks/useProfile";
import {
  Calendar,
  Map as MapIcon,
  Wrench,
  User,
  Clock,
  FileText,
  Users,
  BarChart3,
} from "lucide-react";

export default function SalOperationalCenter() {
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
          Bienvenue {profile?.full_name || "Salarié"}. Organisez vos missions et suivez votre activité.
        </p>
      </div>

      <OperationalSection
        title="Mes Interventions"
        subtitle="Gérez vos missions quotidiennes."
      >
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
        <OperationalCard
          icon={<MapIcon className="h-6 w-6" />}
          title="Carte des Missions"
          description="Localisez vos interventions."
          to="/tech/map"
          color="green"
        />
      </OperationalSection>

      <OperationalSection
        title="Gestion d'Équipe"
        subtitle="Coordonnez avec votre équipe."
      >
        <OperationalCard
          icon={<Users className="h-6 w-6" />}
          title="Mon Équipe"
          description="Collaborez avec vos collègues."
          to="/admin/users"
          color="purple"
        />
        <OperationalCard
          icon={<BarChart3 className="h-6 w-6" />}
          title="Statistiques"
          description="Suivez votre performance."
          to="/admin/kpi"
          color="orange"
        />
      </OperationalSection>

      <OperationalSection
        title="Administration"
        subtitle="Gérez vos documents et temps."
      >
        <OperationalCard
          icon={<Clock className="h-6 w-6" />}
          title="Feuille de Temps"
          description="Enregistrez vos heures de travail."
          to="/admin/timesheet"
          color="blue"
        />
        <OperationalCard
          icon={<FileText className="h-6 w-6" />}
          title="Mes Rapports"
          description="Consultez vos rapports d'intervention."
          to="/app/missions/my"
          color="green"
        />
        <OperationalCard
          icon={<User className="h-6 w-6" />}
          title="Mon Profil"
          description="Gérez vos informations."
          to="/account/profile"
          color="cyan"
        />
      </OperationalSection>
    </div>
  );
}
