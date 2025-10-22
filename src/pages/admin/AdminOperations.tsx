import { Calendar, Map, Plus, Wrench, Mail, AlertTriangle, CalendarRange } from 'lucide-react';
import { DomainHub } from '@/components/domain/DomainHub';

export default function AdminOperations() {
  return (
    <DomainHub
      title="Centre Opérationnel"
      description="Gérez toutes vos opérations terrain : missions, planning, interventions et dépannages"
      icon={<Wrench className="w-6 h-6 text-blue-700" />}
      links={[
        {
          to: '/admin/planning',
          icon: Calendar,
          label: 'Planning Journalier',
          description: 'Organisez les interventions du jour et de la semaine',
          color: 'blue',
        },
        {
          to: '/admin/planning-tech',
          icon: CalendarRange,
          label: 'Planning Multi-Tech',
          description: "Vue d'ensemble de tous les techniciens",
          color: 'indigo',
        },
        {
          to: '/calendar',
          icon: Calendar,
          label: 'Calendrier',
          description: 'Vue calendrier complète des missions',
          color: 'purple',
        },
        {
          to: '/admin/map',
          icon: Map,
          label: 'Carte Interventions',
          description: 'Visualisez toutes les missions sur carte',
          color: 'green',
        },
        {
          to: '/admin/create',
          icon: Plus,
          label: 'Créer Mission',
          description: 'Planifiez une nouvelle intervention',
          color: 'emerald',
        },
        {
          to: '/admin/missions',
          icon: Wrench,
          label: 'Toutes les Missions',
          description: 'Consultez et gérez toutes les missions',
          color: 'orange',
        },
        {
          to: '/admin/offers',
          icon: Mail,
          label: 'Offres Publiées',
          description: 'Gérez les offres aux sous-traitants',
          color: 'cyan',
        },
        {
          to: '/admin/emergency',
          icon: AlertTriangle,
          label: 'Dépannages Urgents',
          description: "Interventions d'urgence en attente",
          color: 'red',
        },
      ]}
    />
  );
}
