import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, FilePlus2, UserPlus, PackagePlus, Calendar, Bell,
  AlertTriangle, FileText, Clock, TrendingUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { buildUrl } from '@/lib/buildUrl';
import {
  getEmergencyTone,
  getOverdueTone,
  getLowStockTone,
  getPendingOffersTone,
  getQuotesToApproveTone,
  type ChipTone
} from '@/config/uiThresholds';

type CountersData = {
  emergencies: number;
  pendingOffers: number;
  overdues: number;
  quotesToApprove: number;
  lowStock: number;
};

export default function AdminHome() {
  const { profile } = useProfile();
  const [counters, setCounters] = useState<CountersData>({
    emergencies: 0,
    pendingOffers: 0,
    overdues: 0,
    quotesToApprove: 0,
    lowStock: 0,
  });
  const [todayMissions, setTodayMissions] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const userRole = profile?.role || '';
  const isAdmin = userRole === 'admin';
  const isSal = userRole === 'sal';

  const can = (action: string) => {
    if (isAdmin) return true;
    if (isSal) {
      return ['create:mission', 'create:quote', 'stock:in'].includes(action);
    }
    return false;
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        emergencyRes,
        offersRes,
        invoicesRes,
        quotesRes,
        stockRes,
        missionsRes,
        notificationsRes,
        recentMissionsRes,
      ] = await Promise.all([
        supabase
          .from('emergency_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),

        supabase
          .from('published_mission_offers')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),

        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('payment_status', 'overdue'),

        supabase
          .from('quotes')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'awaiting_approval'),

        supabase
          .from('stock_items')
          .select('id, quantity, min_stock')
          .filter('quantity', 'lt', 'min_stock'),

        supabase
          .from('missions')
          .select('id, title, status, scheduled_start, city')
          .gte('scheduled_start', today.toISOString())
          .lt('scheduled_start', tomorrow.toISOString())
          .order('scheduled_start')
          .limit(5),

        supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('missions')
          .select('id, title, status, updated_at, city')
          .order('updated_at', { ascending: false })
          .limit(5),
      ]);

      setCounters({
        emergencies: emergencyRes.count || 0,
        pendingOffers: offersRes.count || 0,
        overdues: invoicesRes.count || 0,
        quotesToApprove: quotesRes.count || 0,
        lowStock: stockRes.data?.length || 0,
      });

      setTodayMissions(missionsRes.data || []);
      setRecentNotifications(notificationsRes.data || []);
      setRecentActivity(recentMissionsRes.data || []);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const upcomingRes = await supabase
        .from('missions')
        .select('id, title, scheduled_start, city')
        .gte('scheduled_start', tomorrow.toISOString())
        .lte('scheduled_start', nextWeek.toISOString())
        .order('scheduled_start')
        .limit(2);

      setUpcomingAppointments(upcomingRes.data || []);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Accueil</h1>
          <p className="text-slate-600">Tableau de bord centralisé</p>
        </header>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            À traiter
          </h2>
          <div className="grid gap-4 md:grid-cols-5">
            <ChipStat
              label="Urgences"
              count={counters.emergencies}
              to="/admin/emergency"
              tone={getEmergencyTone(counters.emergencies)}
            />
            <ChipStat
              label="Offres en attente"
              count={counters.pendingOffers}
              to={buildUrl('/admin/offers', { status: 'pending' })}
              tone={getPendingOffersTone(counters.pendingOffers)}
            />
            <ChipStat
              label="Impayés"
              count={counters.overdues}
              to={buildUrl('/admin/comptabilite/invoices', { status: 'overdue' })}
              tone={getOverdueTone(counters.overdues)}
            />
            <ChipStat
              label="Devis à valider"
              count={counters.quotesToApprove}
              to={buildUrl('/admin/comptabilite/quotes', { status: 'awaiting_approval' })}
              tone={getQuotesToApproveTone(counters.quotesToApprove)}
            />
            <ChipStat
              label="Stock bas"
              count={counters.lowStock}
              to={buildUrl('/admin/logistique/stock', { filter: 'low' })}
              tone={getLowStockTone(counters.lowStock)}
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions rapides</h2>
          <div className="flex flex-wrap gap-3">
            {can('create:mission') && (
              <QuickBtn to="/admin/create" icon={<Plus className="w-4 h-4" />}>
                Nouvelle mission
              </QuickBtn>
            )}
            {can('create:quote') && (
              <QuickBtn to={buildUrl('/admin/comptabilite', { action: 'new_quote' })} icon={<FilePlus2 className="w-4 h-4" />}>
                Nouveau devis
              </QuickBtn>
            )}
            {can('create:client') && (
              <QuickBtn to={buildUrl('/admin/users', { action: 'new_client' })} icon={<UserPlus className="w-4 h-4" />}>
                Nouveau client
              </QuickBtn>
            )}
            {can('stock:in') && (
              <QuickBtn to={buildUrl('/admin/logistique/stock', { action: 'entry' })} icon={<PackagePlus className="w-4 h-4" />}>
                Entrée stock
              </QuickBtn>
            )}
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-8">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-900">Aujourd'hui</h2>
              </div>
              <Link
                to={buildUrl('/admin/missions', { date: 'today' })}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Voir toutes →
              </Link>
            </div>

            {todayMissions.length > 0 ? (
              <div className="space-y-3">
                {todayMissions.map((mission) => (
                  <Link
                    key={mission.id}
                    to={`/app/missions/${mission.id}`}
                    className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{mission.title}</div>
                        <div className="text-sm text-slate-600">{mission.city}</div>
                      </div>
                      <div className="text-sm text-blue-600 font-medium">
                        {mission.scheduled_start && new Date(mission.scheduled_start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune mission prévue aujourd'hui</p>
              </div>
            )}

            {upcomingAppointments.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">Prochains RDV</h3>
                  <Link
                    to={buildUrl('/calendar', { range: 'week' })}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Calendrier →
                  </Link>
                </div>
                <div className="space-y-2">
                  {upcomingAppointments.map((apt) => (
                    <Link
                      key={apt.id}
                      to={`/app/missions/${apt.id}`}
                      className="block p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all text-sm"
                    >
                      <div className="font-medium text-slate-900">{apt.title}</div>
                      <div className="text-xs text-slate-600 flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3" />
                        {apt.scheduled_start && new Date(apt.scheduled_start).toLocaleDateString('fr-FR')}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-bold text-slate-900">Activité récente</h2>
              </div>
              <Link
                to={buildUrl('/admin/missions', { sort: 'updated_desc' })}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Tout voir →
              </Link>
            </div>

            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <Link
                    key={item.id}
                    to={`/app/missions/${item.id}`}
                    className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{item.title}</div>
                        <div className="text-sm text-slate-600 mt-1">{item.city}</div>
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.updated_at && new Date(item.updated_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune activité récente</p>
              </div>
            )}
          </section>
        </div>

        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-slate-900">Notifications récentes</h2>
          </div>

          {recentNotifications.length > 0 ? (
            <div className="space-y-3">
              {recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 bg-purple-50 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${notif.read ? 'bg-slate-300' : 'bg-purple-600'}`}></div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{notif.title}</div>
                      {notif.message && (
                        <div className="text-sm text-slate-600 mt-1">{notif.message}</div>
                      )}
                      <div className="text-xs text-slate-500 mt-2">
                        {notif.created_at && new Date(notif.created_at).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune notification récente</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ChipStat({
  label,
  count,
  to,
  tone = 'info',
}: {
  label: string;
  count: number;
  to: string;
  tone?: ChipTone;
}) {
  const toneClasses = {
    success: 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600',
    info: 'bg-blue-50 border-blue-200 hover:border-blue-400 text-blue-900',
    warning: 'bg-yellow-50 border-yellow-200 hover:border-yellow-400 text-yellow-900',
    danger: 'bg-red-50 border-red-200 hover:border-red-400 text-red-900',
  };

  const badgeClasses = {
    success: 'bg-slate-400 text-white',
    info: 'bg-blue-600 text-white',
    warning: 'bg-yellow-600 text-white',
    danger: 'bg-red-600 text-white',
  };

  return (
    <Link
      to={to}
      className={`relative border-2 rounded-xl p-4 transition-all hover:shadow-lg ${toneClasses[tone]}`}
    >
      <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${badgeClasses[tone]}`}>
        {count}
      </div>
      <div className="font-semibold">{label}</div>
    </Link>
  );
}

function QuickBtn({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all font-medium text-slate-900"
    >
      {icon}
      {children}
    </Link>
  );
}
