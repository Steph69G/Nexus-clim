import { Link } from "react-router-dom";
import OperationalSection from "@/components/operations/OperationalSection";
import OperationalCard from "@/components/operations/OperationalCard";
import GlobalFiltersBar from "@/components/operations/GlobalFiltersBar";
import { useCurrentRole, can } from "@/lib/rbac";
import { ROUTES } from "@/lib/routes";
import {
  Calendar,
  CalendarClock,
  Map as MapIcon,
  Wrench,
  Plus,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import SubcontractorOperationalCenter from "./SubcontractorOperationalCenter";
import TechnicianOperationalCenter from "./TechnicianOperationalCenter";
import SalOperationalCenter from "./SalOperationalCenter";
import { useProfile } from "@/hooks/useProfile";

export default function OperationalCenter() {
  const { profile } = useProfile();
  const role = useCurrentRole("admin");

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (profile.role === "st") {
    return <SubcontractorOperationalCenter />;
  }

  if (profile.role === "tech") {
    return <TechnicianOperationalCenter />;
  }

  if (profile.role === "sal") {
    return <SalOperationalCenter />;
  }

  if (profile.role === "manager") {
    return <SalOperationalCenter />;
  }

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
          Gérez toutes vos opérations terrain : missions, planning, interventions et dépannages.
        </p>
      </div>

      {/* TODO: Activer quand les filtres seront branchés sur les pages */}
      {/* <GlobalFiltersBar /> */}

      <OperationalSection
        title="Planification"
        subtitle="Organisez les ressources et les créneaux de vos équipes."
      >
        <OperationalCard
          icon={<CalendarClock className="h-6 w-6" />}
          title="Planning Techniciens"
          description="Vue d'ensemble multi-techniciens (jour/semaine/mois)."
          to={ROUTES.planning.techniciens}
          hidden={!can(role, "feature:planning.multitech")}
          color="blue"
        />
        <OperationalCard
          icon={<Calendar className="h-6 w-6" />}
          title="Calendrier Global"
          description="Tous les événements : missions, rendez-vous, urgences."
          to={ROUTES.calendrier}
          hidden={!can(role, "feature:calendar.global")}
          color="cyan"
        />
        <OperationalCard
          icon={<Calendar className="h-6 w-6" />}
          title="Planning Journalier"
          description="Organisez les interventions du jour."
          to={ROUTES.planning.journalier}
          hidden={!can(role, "feature:planning.journalier")}
          color="purple"
        />
      </OperationalSection>

      <OperationalSection
        title="Interventions"
        subtitle="Visualisez, créez et gérez vos missions."
      >
        <OperationalCard
          icon={<MapIcon className="h-6 w-6" />}
          title="Carte des Interventions"
          description="Visualisez les missions sur la carte."
          to={ROUTES.carte}
          hidden={!can(role, "feature:map.interventions")}
          color="green"
        />
        <OperationalCard
          icon={<Wrench className="h-6 w-6" />}
          title="Toutes les Missions"
          description="Lister, filtrer et gérer toutes les missions."
          to={ROUTES.missions.list}
          hidden={!can(role, "feature:mission.list")}
          color="blue"
        />
        <OperationalCard
          icon={<Plus className="h-6 w-6" />}
          title="Créer une Mission"
          description="Planifiez une nouvelle intervention."
          to={ROUTES.missions.create}
          hidden={!can(role, "feature:mission.create")}
          color="orange"
        />
      </OperationalSection>

      <OperationalSection
        title="Offres & Urgences"
        subtitle="Gérez les offres aux sous-traitants et les dépannages."
      >
        <OperationalCard
          icon={<Inbox className="h-6 w-6" />}
          title="Offres Publiées"
          description="Gérez les offres envoyées aux sous-traitants."
          to={ROUTES.offres}
          hidden={!can(role, "feature:offers.published")}
          color="purple"
        />
        <OperationalCard
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Dépannages Urgents"
          description="Interventions d'urgence en attente."
          to={ROUTES.urgences}
          hidden={!can(role, "feature:urgent.repairs")}
          color="red"
        />
      </OperationalSection>

      <div className="pt-4 text-sm text-muted-foreground">
        Besoin d'un autre module ?{" "}
        <Link className="underline" to={ROUTES.missions.list}>
          Ouvrir la liste des missions
        </Link>
      </div>
    </div>
  );
}
