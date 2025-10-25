import { Mail, Send, Inbox, Archive } from 'lucide-react';
import { BackButton } from '@/components/navigation/BackButton';

export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-8">
      <div className="max-w-6xl mx-auto">
        <BackButton to="/admin/communication" label="Retour à la Communication" />

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6 mt-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Messages Internes</h1>
          </div>
          <p className="text-slate-600 ml-15">
            Messagerie interne et suivi des échanges entre équipes
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Module Messagerie à venir
            </h2>
            <p className="text-slate-600 mb-6">
              La messagerie interne permettra de centraliser tous vos échanges professionnels.
            </p>
            <div className="grid gap-4 text-left">
              <FeatureItem
                icon={<Inbox className="w-5 h-5 text-blue-600" />}
                title="Boîte de réception"
                description="Recevez et organisez vos messages"
              />
              <FeatureItem
                icon={<Send className="w-5 h-5 text-green-600" />}
                title="Envoi groupé"
                description="Communiquez avec plusieurs destinataires"
              />
              <FeatureItem
                icon={<Archive className="w-5 h-5 text-purple-600" />}
                title="Archivage"
                description="Gardez une trace de tous vos échanges"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="font-semibold text-slate-900 mb-1">{title}</div>
        <div className="text-sm text-slate-600">{description}</div>
      </div>
    </div>
  );
}
