import { FileText, Receipt, CreditCard, AlertCircle, FileCheck } from 'lucide-react';
import { DomainHub } from '@/components/domain/DomainHub';

export default function AdminComptabilite() {
  return (
    <DomainHub
      title="Comptabilité"
      description="Gérez vos factures, devis, paiements et relances depuis votre espace centralisé"
      icon={<span className="text-2xl">💰</span>}
      links={[
        {
          to: '/admin/comptabilite/invoices',
          icon: FileText,
          label: 'Factures',
          description: 'Créez et suivez vos factures clients',
          color: 'blue',
        },
        {
          to: '/admin/comptabilite/quotes',
          icon: Receipt,
          label: 'Devis',
          description: 'Générez des devis pour vos clients',
          color: 'green',
        },
        {
          to: '/admin/comptabilite/payments',
          icon: CreditCard,
          label: 'Paiements',
          description: 'Gérez les encaissements et historiques',
          color: 'emerald',
        },
        {
          to: '/admin/comptabilite/reminders',
          icon: AlertCircle,
          label: 'Relances',
          description: 'Automatisez les relances de paiement',
          color: 'orange',
        },
        {
          to: '/admin/comptabilite/reports',
          icon: FileCheck,
          label: 'Rapports',
          description: 'Exportez vos données comptables',
          color: 'purple',
        },
      ]}
    />
  );
}
