import { BarChart3, TrendingUp, FileText, Target } from 'lucide-react';
import { DomainHub } from '@/components/domain/DomainHub';

export default function AdminPilotage() {
  return (
    <DomainHub
      title="Pilotage & Analytics"
      description="Suivez vos performances business, analyses stratégiques et indicateurs clés de performance"
      icon={<BarChart3 className="w-6 h-6 text-indigo-700" />}
      links={[
        {
          to: '/admin/kpis',
          icon: BarChart3,
          label: 'KPIs Business',
          description: 'CA, marge, rentabilité et indicateurs financiers',
          color: 'blue',
        },
        {
          to: '/admin/analytics',
          icon: TrendingUp,
          label: 'Analytics Avancées',
          description: 'Analyses détaillées, tendances et prévisions',
          color: 'green',
        },
        {
          to: '/admin/pilotage/reports',
          icon: FileText,
          label: 'Rapports & Exports',
          description: "Rapports d'activité et exports de données",
          color: 'orange',
        },
        {
          to: '/admin/operations',
          icon: Target,
          label: 'Vue Opérationnelle',
          description: 'Suivi missions, planning et ressources',
          color: 'purple',
        },
      ]}
    />
  );
}
