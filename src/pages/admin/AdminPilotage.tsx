import { BarChart3, TrendingUp, Star, Mail, MessageSquare, FileText } from 'lucide-react';
import { DomainHub } from '@/components/domain/DomainHub';

export default function AdminPilotage() {
  return (
    <DomainHub
      title="Pilotage & Analytics"
      description="Suivez vos performances, satisfaction clients et indicateurs clés"
      icon={<BarChart3 className="w-6 h-6 text-indigo-700" />}
      links={[
        {
          to: '/admin/kpis',
          icon: BarChart3,
          label: 'KPIs',
          description: 'Indicateurs clés de performance',
          color: 'blue',
        },
        {
          to: '/admin/analytics',
          icon: TrendingUp,
          label: 'Analytics',
          description: 'Analyses détaillées et tendances',
          color: 'green',
        },
        {
          to: '/admin/satisfaction',
          icon: Star,
          label: 'Satisfaction Clients',
          description: 'Notes et retours clients',
          color: 'yellow',
        },
        {
          to: '/admin/surveys',
          icon: Mail,
          label: 'Enquêtes',
          description: "Envoi d'enquêtes de satisfaction",
          color: 'purple',
        },
        {
          to: '/admin/communication',
          icon: MessageSquare,
          label: 'Communication',
          description: 'Messages et notifications',
          color: 'cyan',
        },
        {
          to: '/admin/kpis',
          icon: FileText,
          label: 'Rapports',
          description: "Rapports d'activité et exports",
          color: 'orange',
          badge: 'Prochainement',
        },
      ]}
    />
  );
}
