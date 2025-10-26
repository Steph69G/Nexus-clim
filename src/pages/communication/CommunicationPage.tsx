import { MessageCircle, Mail, Bell, Star, Send } from 'lucide-react';
import { DomainHub } from '@/components/domain/DomainHub';

export default function CommunicationPage() {
  return (
    <DomainHub
      title="Communication & Relations Clients"
      description="Centralisez vos échanges internes, communications clients et enquêtes de satisfaction"
      icon={<MessageCircle className="w-6 h-6 text-cyan-700" />}
      links={[
        {
          to: '/admin/communication/tchat',
          icon: MessageCircle,
          label: 'Tchat Interne',
          description: 'Conversations en temps réel entre utilisateurs',
          color: 'blue',
        },
        {
          to: '/admin/communication/messages',
          icon: Mail,
          label: 'Messages Internes',
          description: 'Messagerie interne et suivi des échanges',
          color: 'green',
        },
        {
          to: '/admin/communication/notifications',
          icon: Bell,
          label: 'Notifications',
          description: 'Historique des notifications envoyées (emails, SMS, push)',
          color: 'orange',
        },
        {
          to: '/admin/satisfaction',
          icon: Star,
          label: 'Satisfaction Clients',
          description: 'NPS, notes et retours clients',
          color: 'yellow',
        },
        {
          to: '/admin/surveys',
          icon: Send,
          label: 'Enquêtes Satisfaction',
          description: "Envoi et gestion des enquêtes clients",
          color: 'purple',
        },
      ]}
    />
  );
}
