import { Link } from 'react-router-dom';
import { Package, TrendingUp, Truck } from 'lucide-react';

export default function AdminLogistique() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-cyan-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Logistique</h1>
          </div>
          <p className="text-slate-600 ml-15">
            Gérez votre stock, mouvements et fournisseurs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <HubCard
            to="/admin/stock"
            icon={<Package className="w-10 h-10 text-blue-600" />}
            title="Stock & Pièces"
            description="Inventaire des pièces et consommables"
            color="blue"
          />

          <HubCard
            to="/admin/stock"
            icon={<TrendingUp className="w-10 h-10 text-green-600" />}
            title="Mouvements"
            description="Entrées, sorties et affectations"
            color="green"
            badge="Prochainement"
          />

          <HubCard
            to="/admin/stock"
            icon={<Truck className="w-10 h-10 text-purple-600" />}
            title="Fournisseurs"
            description="Gestion des fournisseurs et commandes"
            color="purple"
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
    purple: 'hover:border-purple-400 hover:shadow-purple-100',
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
      <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-cyan-700 transition-colors">
        {title}
      </h3>
      <p className="text-slate-600 text-sm">
        {description}
      </p>
    </Link>
  );
}
