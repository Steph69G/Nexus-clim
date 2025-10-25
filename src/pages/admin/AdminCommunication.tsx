import { MessageSquare, Mail, Bell } from "lucide-react";
import { BackButton } from "@/components/navigation/BackButton";

export default function AdminCommunication() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <BackButton to="/admin/pilotage" label="Retour au Pilotage" />
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Communication</h1>
          </div>
          <p className="text-slate-600 ml-15">
            Centralisez tous vos échanges avec clients et techniciens
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<MessageSquare className="w-8 h-8 text-blue-600" />}
            title="Tchat"
            description="Messagerie instantanée en temps réel"
            status="À venir"
          />
          <FeatureCard
            icon={<Mail className="w-8 h-8 text-purple-600" />}
            title="Messages"
            description="Envoyez et recevez des messages"
            status="À venir"
          />
          <FeatureCard
            icon={<Bell className="w-8 h-8 text-orange-600" />}
            title="Notifications"
            description="Alertes et rappels automatiques"
            status="À venir"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  status
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 mb-3">{description}</p>
      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
        {status}
      </span>
    </div>
  );
}
