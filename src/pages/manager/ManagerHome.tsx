import { Link, Navigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Package, Calendar, MapPin, FileText, Star, TrendingUp, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/supabase';

export default function ManagerHome() {
  const { profile } = useProfile();
  const [stats, setStats] = useState({
    pending: 0,
    active: 0,
    completed: 0,
    earnings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    async function fetchStats() {
      try {
        const { data: missions } = await supabase
          .from('missions')
          .select('id, status, st_prix_ht')
          .eq('assigned_to', profile.id);

        if (missions) {
          const pending = missions.filter(m => m.status === 'pending' || m.status === 'scheduled').length;
          const active = missions.filter(m => m.status === 'in_progress').length;
          const completed = missions.filter(m => m.status === 'completed').length;
          const earnings = missions
            .filter(m => m.status === 'completed')
            .reduce((sum, m) => sum + (m.st_prix_ht || 0), 0);

          setStats({ pending, active, completed, earnings });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [profile?.id]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (profile.role === 'st') {
    return <Navigate to="/offers" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Bienvenue, {profile.full_name || 'Manager'}
          </h1>
          <p className="text-slate-600">
            Tableau de bord de gestion
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">Chargement...</p>
          </div>
        ) : (
          <>
            <div className="grid lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                icon={<Package className="w-6 h-6" />}
                label="Missions en attente"
                value={stats.pending}
                color="blue"
              />
              <StatsCard
                icon={<TrendingUp className="w-6 h-6" />}
                label="Missions actives"
                value={stats.active}
                color="orange"
              />
              <StatsCard
                icon={<Star className="w-6 h-6" />}
                label="Missions terminées"
                value={stats.completed}
                color="green"
              />
              <StatsCard
                icon={<DollarSign className="w-6 h-6" />}
                label="Revenus"
                value={new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.earnings)}
                color="purple"
                isAmount
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <QuickAccessCard
                to="/offers"
                icon={<Package className="w-8 h-8 text-blue-600" />}
                title="Offres disponibles"
                description="Consultez les nouvelles offres de mission"
                color="blue"
              />
              <QuickAccessCard
                to="/app/missions/my"
                icon={<Calendar className="w-8 h-8 text-emerald-600" />}
                title="Mes missions"
                description="Gérez vos missions en cours"
                color="emerald"
              />
              <QuickAccessCard
                to="/calendar"
                icon={<Calendar className="w-8 h-8 text-violet-600" />}
                title="Planning"
                description="Visualisez votre planning"
                color="violet"
              />
              <QuickAccessCard
                to="/account/profile"
                icon={<FileText className="w-8 h-8 text-orange-600" />}
                title="Mon profil"
                description="Gérez vos informations"
                color="orange"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatsCard({
  icon,
  label,
  value,
  color,
  isAmount = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: 'blue' | 'orange' | 'green' | 'purple';
  isAmount?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    orange: 'bg-orange-100 text-orange-600 border-orange-200',
    green: 'bg-green-100 text-green-600 border-green-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colorClasses[color]} mb-4`}>
        {icon}
      </div>
      <div className={`${isAmount ? 'text-xl' : 'text-2xl'} font-bold text-slate-900 mb-1`}>{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  );
}

function QuickAccessCard({
  to,
  icon,
  title,
  description,
  color,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      to={to}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      </div>
    </Link>
  );
}
