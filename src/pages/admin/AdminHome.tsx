import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench, DollarSign, Users, Package, BarChart3,
  Calendar, Bell, AlertTriangle, TrendingDown, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminHome() {
  const [todayMissions, setTodayMissions] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [alerts, setAlerts] = useState({
    unpaidInvoices: 0,
    urgentRequests: 0,
    lowStock: 0,
  });
  const [loading, setLoading] = useState(true);

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

      const [missionsRes, notificationsRes, invoicesRes, emergencyRes, stockRes] = await Promise.all([
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
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('payment_status', 'pending'),

        supabase
          .from('emergency_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),

        supabase
          .from('stock_items')
          .select('id, quantity, min_stock', { count: 'exact', head: true })
      ]);

      setTodayMissions(missionsRes.data || []);
      setRecentNotifications(notificationsRes.data || []);

      const stockItems = await supabase
        .from('stock_items')
        .select('quantity, min_stock')
        .filter('quantity', 'lt', 'min_stock');

      setAlerts({
        unpaidInvoices: invoicesRes.count || 0,
        urgentRequests: emergencyRes.count || 0,
        lowStock: stockItems.data?.length || 0,
      });

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

  const domainLinks = [
    { to: '/admin/operations', icon: Wrench, label: 'Opérations', color: 'blue' },
    { to: '/admin/comptabilite', icon: DollarSign, label: 'Comptabilité', color: 'green' },
    { to: '/admin/clients', icon: Users, label: 'Clients', color: 'purple' },
    { to: '/admin/logistique', icon: Package, label: 'Logistique', color: 'orange' },
    { to: '/admin/pilotage', icon: BarChart3, label: 'Pilotage', color: 'indigo' },
  ];

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
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Bienvenue sur Nexus Clim</h1>
          <p className="text-lg text-slate-600">Votre tableau de bord centralisé</p>
        </header>

        <section className="grid md:grid-cols-5 gap-4 mb-12">
          {domainLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 hover:shadow-lg transition-all hover:border-${link.color}-400 group`}
            >
              <link.icon className={`w-8 h-8 text-${link.color}-600 mb-3 group-hover:scale-110 transition-transform`} />
              <h3 className="font-semibold text-slate-900">{link.label}</h3>
            </Link>
          ))}
        </section>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {alerts.unpaidInvoices > 0 && (
            <Link to="/admin/comptabilite" className="bg-red-50 border-2 border-red-200 rounded-xl p-6 hover:shadow-lg transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{alerts.unpaidInvoices}</div>
                  <div className="text-sm text-red-700">Factures impayées</div>
                </div>
              </div>
            </Link>
          )}

          {alerts.urgentRequests > 0 && (
            <Link to="/admin/emergency" className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 hover:shadow-lg transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{alerts.urgentRequests}</div>
                  <div className="text-sm text-orange-700">Dépannages urgents</div>
                </div>
              </div>
            </Link>
          )}

          {alerts.lowStock > 0 && (
            <Link to="/admin/stock" className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 hover:shadow-lg transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{alerts.lowStock}</div>
                  <div className="text-sm text-yellow-700">Articles en stock bas</div>
                </div>
              </div>
            </Link>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">Aujourd'hui</h2>
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
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Prochains rendez-vous</h3>
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
    </div>
  );
}
