import { MessageCircle, Mail, Bell } from 'lucide-react';
import { DomainHub } from '@/components/domain/DomainHub';

export default function CommunicationPage() {
  return (
    <DomainHub
      title="Communication & Notifications"
      description="Centralisez vos échanges internes, chats et alertes clients"
      icon={<MessageCircle className="w-6 h-6 text-cyan-700" />}
      links={[
        {
          to: '/admin/communication/tchat',
          icon: MessageCircle,
          label: 'Tchat',
          description: 'Conversations en temps réel entre utilisateurs',
          color: 'blue',
        },
        {
          to: '/admin/communication/messages',
          icon: Mail,
          label: 'Messages internes',
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
      ]}
    />
  );
}
