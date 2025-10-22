import { Link } from 'react-router-dom';
import { Users, UserCheck, Car, Clock } from 'lucide-react';

export default function AdminRessources() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Ressources</h1>
          </div>
          <p className="text-slate-600 ml-15">
            Gérez vos équipes, sous-traitants, véhicules et heures
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <HubCard
            to="/admin/users"
            icon={<Users className="w-10 h-10 text-blue-600" />}
            title="Utilisateurs"
            description="Techniciens, admins et employés"
            color="blue"
          />

          <HubCard
            to="/admin/users"
            icon={<UserCheck className="w-10 h-10 text-green-600" />}
            title="Sous-traitants"
            description="Partenaires et prestataires externes"
            color="green"
          />

          <HubCard
            to="/admin/vehicles"
            icon={<Car className="w-10 h-10 text-purple-600" />}
            title="Véhicules"
            description="Flotte, affectations et maintenance"
            color="purple"
          />

          <HubCard
            to="/admin/timesheet"
            icon={<Clock className="w-10 h-10 text-orange-600" />}
            title="Heures & Pointage"
            description="Suivi du temps et présences"
            color="orange"
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
    green: 'hover:border-green-400 hover:shadow-green-100',
    purple: 'hover:border-purple-400 hover:shadow-purple-100',
    orange: 'hover:border-orange-400 hover:shadow-orange-100',
  };

  return (
    <Link
      to={to}
      className={`bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 hover:shadow-lg transition-all ${colorClasses[color as keyof typeof colorClasses]} group`}
    >
      <div className="mb-4 transform group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-orange-700 transition-colors">
        {title}
      </h3>
      <p className="text-slate-600 text-sm">
        {description}
      </p>
    </Link>
  );
}
