import { Link } from 'react-router-dom';
import { Calendar, Map, Plus, Wrench, Mail, AlertTriangle, CalendarRange } from 'lucide-react';

export default function AdminOperations() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-blue-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Centre Opérationnel</h1>
          </div>
          <p className="text-slate-600 ml-15">
            Gérez toutes vos opérations terrain : missions, planning, interventions et dépannages
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <HubCard
            to="/admin/planning"
            icon={<Calendar className="w-10 h-10 text-blue-600" />}
            title="Planning Journalier"
            description="Organisez les interventions du jour et de la semaine"
            color="blue"
          />

          <HubCard
            to="/admin/planning-tech"
            icon={<CalendarRange className="w-10 h-10 text-indigo-600" />}
            title="Planning Multi-Tech"
            description="Vue d'ensemble de tous les techniciens"
            color="indigo"
          />

          <HubCard
            to="/calendar"
            icon={<Calendar className="w-10 h-10 text-purple-600" />}
            title="Calendrier"
            description="Vue calendrier complète des missions"
            color="purple"
          />

          <HubCard
            to="/admin/map"
            icon={<Map className="w-10 h-10 text-green-600" />}
            title="Carte Interventions"
            description="Visualisez toutes les missions sur carte"
            color="green"
          />

          <HubCard
            to="/admin/create"
            icon={<Plus className="w-10 h-10 text-emerald-600" />}
            title="Créer Mission"
            description="Planifiez une nouvelle intervention"
            color="emerald"
          />

          <HubCard
            to="/app/missions/my"
            icon={<Wrench className="w-10 h-10 text-orange-600" />}
            title="Toutes les Missions"
            description="Consultez et gérez toutes les missions"
            color="orange"
          />

          <HubCard
            to="/admin/offers"
            icon={<Mail className="w-10 h-10 text-cyan-600" />}
            title="Offres Publiées"
            description="Gérez les offres aux sous-traitants"
            color="cyan"
          />

          <HubCard
            to="/admin/emergency"
            icon={<AlertTriangle className="w-10 h-10 text-red-600" />}
            title="Dépannages Urgents"
            description="Interventions d'urgence en attente"
            color="red"
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
  color
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'hover:border-blue-400 hover:shadow-blue-100',
    indigo: 'hover:border-indigo-400 hover:shadow-indigo-100',
    purple: 'hover:border-purple-400 hover:shadow-purple-100',
    green: 'hover:border-green-400 hover:shadow-green-100',
    emerald: 'hover:border-emerald-400 hover:shadow-emerald-100',
    orange: 'hover:border-orange-400 hover:shadow-orange-100',
    cyan: 'hover:border-cyan-400 hover:shadow-cyan-100',
    red: 'hover:border-red-400 hover:shadow-red-100',
  };

  return (
    <Link
      to={to}
      className={`bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 hover:shadow-lg transition-all ${colorClasses[color as keyof typeof colorClasses]} group`}
    >
      <div className="mb-4 transform group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">
        {title}
      </h3>
      <p className="text-slate-600 text-sm">
        {description}
      </p>
    </Link>
  );
}
