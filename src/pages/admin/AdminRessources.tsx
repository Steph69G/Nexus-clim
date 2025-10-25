import { Users, UserCheck, Car, Clock } from 'lucide-react';
import { DomainHub } from '@/components/domain/DomainHub';

export default function AdminRessources() {
  return (
    <DomainHub
      title="Ressources"
      description="Gérez vos équipes, sous-traitants, véhicules et heures"
      icon={<Users className="w-6 h-6 text-orange-700" />}
      links={[
        {
          to: '/admin/users',
          icon: Users,
          label: 'Équipe interne',
          description: 'Techniciens, admins et employés',
          color: 'blue',
        },
        {
          to: '/admin/subcontractors',
          icon: UserCheck,
          label: 'Sous-traitants',
          description: 'Partenaires et prestataires externes',
          color: 'green',
        },
        {
          to: '/admin/vehicles',
          icon: Car,
          label: 'Véhicules',
          description: 'Flotte, affectations et maintenance',
          color: 'purple',
        },
        {
          to: '/admin/timesheet',
          icon: Clock,
          label: 'Heures & Pointage',
          description: 'Suivi du temps et présences',
          color: 'orange',
        },
      ]}
    />
  );
}
