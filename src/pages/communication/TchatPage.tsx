import { MessageCircle, Users, Clock } from 'lucide-react';
import { BackButton } from '@/components/navigation/BackButton';

export default function TchatPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <BackButton to="/admin/communication" label="Retour à la Communication" />

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6 mt-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Tchat en Temps Réel</h1>
          </div>
          <p className="text-slate-600 ml-15">
            Conversations instantanées entre clients, techniciens et admins
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Module Tchat à venir
            </h2>
            <p className="text-slate-600 mb-6">
              La messagerie instantanée sera bientôt disponible pour faciliter vos échanges en temps réel.
            </p>
            <div className="grid gap-4 text-left">
              <FeatureItem
                icon={<Users className="w-5 h-5 text-blue-600" />}
                title="Conversations de groupe"
                description="Créez des canaux par mission ou équipe"
              />
              <FeatureItem
                icon={<Clock className="w-5 h-5 text-green-600" />}
                title="Temps réel"
                description="Messages instantanés avec notifications push"
              />
              <FeatureItem
                icon={<MessageCircle className="w-5 h-5 text-purple-600" />}
                title="Historique complet"
                description="Conservez tous vos échanges"
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
