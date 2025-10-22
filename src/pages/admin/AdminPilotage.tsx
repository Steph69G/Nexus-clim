import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, Star, Mail, MessageSquare, FileText } from 'lucide-react';

export default function AdminPilotage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-indigo-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Pilotage & Analytics</h1>
          </div>
          <p className="text-slate-600 ml-15">
            Suivez vos performances, satisfaction clients et indicateurs clés
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <HubCard
            to="/admin/kpis"
            icon={<BarChart3 className="w-10 h-10 text-blue-600" />}
            title="KPIs"
            description="Indicateurs clés de performance"
            color="blue"
          />

          <HubCard
            to="/admin/analytics"
            icon={<TrendingUp className="w-10 h-10 text-green-600" />}
            title="Analytics"
            description="Analyses détaillées et tendances"
            color="green"
          />

          <HubCard
            to="/admin/satisfaction"
            icon={<Star className="w-10 h-10 text-yellow-600" />}
            title="Satisfaction Clients"
            description="Notes et retours clients"
            color="yellow"
          />

          <HubCard
            to="/admin/surveys"
            icon={<Mail className="w-10 h-10 text-purple-600" />}
            title="Enquêtes"
            description="Envoi d'enquêtes de satisfaction"
            color="purple"
          />

          <HubCard
            to="/admin/communication"
            icon={<MessageSquare className="w-10 h-10 text-cyan-600" />}
            title="Communication"
            description="Messages et notifications"
            color="cyan"
          />

          <HubCard
            to="/admin/kpis"
            icon={<FileText className="w-10 h-10 text-orange-600" />}
            title="Rapports"
            description="Rapports d'activité et exports"
            color="orange"
            badge="Prochainement"
          />
        </div>
      </div>
    </div>
  );
}

function HubCard({
  to,
  icon,
  title,
  description,
  color,
  badge
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  badge?: string;
}) {
  const colorClasses = {
    blue: 'hover:border-blue-400 hover:shadow-blue-100',
    green: 'hover:border-green-400 hover:shadow-green-100',
    yellow: 'hover:border-yellow-400 hover:shadow-yellow-100',
    purple: 'hover:border-purple-400 hover:shadow-purple-100',
    cyan: 'hover:border-cyan-400 hover:shadow-cyan-100',
    orange: 'hover:border-orange-400 hover:shadow-orange-100',
  };

  return (
    <Link
      to={to}
      className={`bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 hover:shadow-lg transition-all ${colorClasses[color as keyof typeof colorClasses]} group relative`}
    >
      {badge && (
        <span className="absolute top-3 right-3 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
          {badge}
        </span>
      )}
      <div className="mb-4 transform group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors">
        {title}
      </h3>
      <p className="text-slate-600 text-sm">
        {description}
      </p>
    </Link>
  );
}
