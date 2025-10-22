import { Package, TrendingUp, Truck } from 'lucide-react';
import { DomainHub } from '@/components/domain/DomainHub';

export default function AdminLogistique() {
  return (
    <DomainHub
      title="Logistique"
      description="Gérez votre stock, mouvements et fournisseurs"
      icon={<Package className="w-6 h-6 text-cyan-700" />}
      links={[
        {
          to: '/admin/stock',
          icon: Package,
          label: 'Stock & Pièces',
          description: 'Inventaire des pièces et consommables',
          color: 'blue',
        },
        {
          to: '/admin/stock',
          icon: TrendingUp,
          label: 'Mouvements',
          description: 'Entrées, sorties et affectations',
          color: 'green',
          badge: 'Prochainement',
        },
        {
          to: '/admin/stock',
          icon: Truck,
          label: 'Fournisseurs',
          description: 'Gestion des fournisseurs et commandes',
          color: 'purple',
          badge: 'Prochainement',
        },
      ]}
    />
  );
}
