import { Calendar, Wrench, Map, Plus, Inbox, AlertTriangle, Users, CalendarDays } from 'lucide-react';
import { OperationalCard } from '@/components/operations/OperationalCard';
import { OperationalSection } from '@/components/operations/OperationalSection';
import { GlobalFiltersBar } from '@/components/operations/GlobalFiltersBar';
import { useProfile } from '@/hooks/useProfile';
import { can, AppRole } from '@/lib/rbac';
import { Navigate } from 'react-router-dom';

interface CardConfig {
  icon: typeof Calendar;
  title: string;
  description: string;
  route: string;
  permission: string;
  iconColor?: string;
  iconBgColor?: string;
  disabled?: boolean;
}

const PLANNING_CARDS: CardConfig[] = [
  {
    icon: Users,
    title: 'Planning Techniciens',
    description: 'Vue d\'ensemble multi-techniciens (jour/semaine/mois).',
    route: '/operations/planning/techniciens',
    permission: 'feature:planning.multitech',
    iconColor: 'text-blue-600',
    iconBgColor: 'bg-blue-50',
  },
  {
    icon: Calendar,
    title: 'Calendrier Global',
    description: 'Tous les événements : missions, rendez-vous, urgences.',
    route: '/operations/calendrier',
    permission: 'feature:calendar.global',
    iconColor: 'text-purple-600',
    iconBgColor: 'bg-purple-50',
  },
  {
    icon: CalendarDays,
    title: 'Planning Journalier',
    description: 'Organisez les interventions du jour.',
    route: '/operations/planning/journalier',
    permission: 'feature:planning.journalier',
    iconColor: 'text-green-600',
    iconBgColor: 'bg-green-50',
  },
];

const INTERVENTION_CARDS: CardConfig[] = [
  {
    icon: Map,
    title: 'Carte des Interventions',
    description: 'Visualisez les missions sur la carte.',
    route: '/operations/carte',
    permission: 'feature:map.interventions',
    iconColor: 'text-emerald-600',
    iconBgColor: 'bg-emerald-50',
  },
  {
    icon: Wrench,
    title: 'Toutes les Missions',
    description: 'Lister, filtrer et gérer toutes les missions.',
    route: '/operations/missions',
    permission: 'feature:mission.list',
    iconColor: 'text-orange-600',
    iconBgColor: 'bg-orange-50',
  },
  {
    icon: Plus,
    title: 'Créer une Mission',
    description: 'Planifiez une nouvelle intervention.',
    route: '/operations/missions/new',
    permission: 'feature:mission.create',
    iconColor: 'text-blue-600',
    iconBgColor: 'bg-blue-50',
  },
];

const OFFERS_URGENT_CARDS: CardConfig[] = [
  {
    icon: Inbox,
    title: 'Offres Publiées',
    description: 'Gérez les offres envoyées aux sous-traitants.',
    route: '/operations/offres',
    permission: 'feature:offers.published',
    iconColor: 'text-indigo-600',
    iconBgColor: 'bg-indigo-50',
  },
  {
    icon: AlertTriangle,
    title: 'Dépannages Urgents',
    description: 'Interventions d\'urgence en attente.',
    route: '/operations/urgences',
    permission: 'feature:urgent.repairs',
    iconColor: 'text-red-600',
    iconBgColor: 'bg-red-50',
  },
];

export default function OperationalCenter() {
  const { profile } = useProfile();
  const userRole = (profile?.role as AppRole) || null;

  if (userRole === 'client') {
    return <Navigate to="/client" replace />;
  }

  const visiblePlanningCards = PLANNING_CARDS.filter((card) => can(userRole, card.permission as any));
  const visibleInterventionCards = INTERVENTION_CARDS.filter((card) => can(userRole, card.permission as any));
  const visibleOffersUrgentCards = OFFERS_URGENT_CARDS.filter((card) => can(userRole, card.permission as any));

  const hasAnyVisibleCards =
    visiblePlanningCards.length > 0 || visibleInterventionCards.length > 0 || visibleOffersUrgentCards.length > 0;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="space-y-2">
          <nav className="text-sm text-slate-600">
            <span>Opérations</span> / <span className="text-slate-900 font-medium">Centre opérationnel</span>
          </nav>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900">Centre Opérationnel</h1>
            <p className="text-slate-600">
              Gérez toutes vos opérations terrain : missions, planning, interventions et dépannages.
            </p>
          </div>
        </div>

        <GlobalFiltersBar />

        {!hasAnyVisibleCards && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <Inbox className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Aucune carte disponible</h3>
              <p className="text-sm text-slate-600">
                Votre rôle ne vous permet pas d'accéder aux fonctionnalités du Centre Opérationnel. Contactez votre
                administrateur pour plus d'informations.
              </p>
            </div>
          </div>
        )}

        {hasAnyVisibleCards && (
          <div className="space-y-8">
            {visiblePlanningCards.length > 0 && (
              <OperationalSection
                title="Planification"
                description="Organisez et visualisez les interventions de vos équipes."
              >
                {visiblePlanningCards.map((card) => (
                  <OperationalCard
                    key={card.route}
                    icon={card.icon}
                    title={card.title}
                    description={card.description}
                    route={card.route}
                    disabled={card.disabled}
                    iconColor={card.iconColor}
                    iconBgColor={card.iconBgColor}
                  />
                ))}
              </OperationalSection>
            )}

            {visibleInterventionCards.length > 0 && (
              <OperationalSection
                title="Interventions"
                description="Gérez les missions terrain et leur exécution."
              >
                {visibleInterventionCards.map((card) => (
                  <OperationalCard
                    key={card.route}
                    icon={card.icon}
                    title={card.title}
                    description={card.description}
                    route={card.route}
                    disabled={card.disabled}
                    iconColor={card.iconColor}
                    iconBgColor={card.iconBgColor}
                  />
                ))}
              </OperationalSection>
            )}

            {visibleOffersUrgentCards.length > 0 && (
              <OperationalSection
                title="Offres & Urgences"
                description="Suivez les offres publiées et les interventions urgentes."
              >
                {visibleOffersUrgentCards.map((card) => (
                  <OperationalCard
                    key={card.route}
                    icon={card.icon}
                    title={card.title}
                    description={card.description}
                    route={card.route}
                    disabled={card.disabled}
                    iconColor={card.iconColor}
                    iconBgColor={card.iconBgColor}
                  />
                ))}
              </OperationalSection>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
