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

export default function OperationalCenter() {
  const role = useCurrentRole("admin");

  console.log('[OperationalCenter] Rendering with role:', role);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Centre Opérationnel</h1>
        </div>
        <p className="text-muted-foreground">
          Gérez toutes vos opérations terrain : missions, planning, interventions et dépannages.
        </p>
        <p className="text-xs text-muted-foreground">
          Rôle courant : <span className="font-medium uppercase">{role}</span>
        </p>
      </div>

      <GlobalFiltersBar />

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
        />
        <OperationalCard
          icon={<Calendar className="h-6 w-6" />}
          title="Calendrier Global"
          description="Tous les événements : missions, rendez-vous, urgences."
          to={ROUTES.calendrier}
          hidden={!can(role, "feature:calendar.global")}
        />
        <OperationalCard
          icon={<Calendar className="h-6 w-6" />}
          title="Planning Journalier"
          description="Organisez les interventions du jour."
          to={ROUTES.planning.journalier}
          hidden={!can(role, "feature:planning.journalier")}
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
        />
        <OperationalCard
          icon={<Wrench className="h-6 w-6" />}
          title="Toutes les Missions"
          description="Lister, filtrer et gérer toutes les missions."
          to={ROUTES.missions.list}
          hidden={!can(role, "feature:mission.list")}
        />
        <OperationalCard
          icon={<Plus className="h-6 w-6" />}
          title="Créer une Mission"
          description="Planifiez une nouvelle intervention."
          to={ROUTES.missions.create}
          hidden={!can(role, "feature:mission.create")}
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
        />
        <OperationalCard
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Dépannages Urgents"
          description="Interventions d'urgence en attente."
          to={ROUTES.urgences}
          hidden={!can(role, "feature:urgent.repairs")}
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
