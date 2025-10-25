import { Users, FileText, Settings, FolderOpen, Building } from 'lucide-react';
import { DomainHub } from '@/components/domain/DomainHub';

export default function AdminClients() {
  return (
    <DomainHub
      title="Clients & Contrats"
      description="Gérez vos clients, contrats, équipements et documents"
      icon={<Users className="w-6 h-6 text-purple-700" />}
      links={[
        {
          to: '/admin/client-list',
          icon: Users,
          label: 'Clients',
          description: 'Base de données clients et prospects',
          color: 'purple',
        },
        {
          to: '/admin/contracts',
          icon: FileText,
          label: 'Contrats',
          description: 'Contrats de maintenance et forfaits',
          color: 'blue',
        },
        {
          to: '/admin/equipments',
          icon: Settings,
          label: 'Équipements',
          description: 'Climatiseurs et installations clients',
          color: 'green',
        },
        {
          to: '/admin/documents',
          icon: FolderOpen,
          label: 'Documents',
          description: 'Fichiers et historique clients',
          color: 'orange',
        },
        {
          to: '/admin/emergency',
          icon: Building,
          label: 'Demandes Clients',
          description: "Demandes d'intervention clients",
          color: 'cyan',
        },
      ]}
    />
  );
}
