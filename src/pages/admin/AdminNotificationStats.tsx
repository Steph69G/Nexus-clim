import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity, TrendingUp, Clock, AlertTriangle, Users, Zap } from "lucide-react";
import { BackButton } from "@/components/navigation/BackButton";

interface ChannelStats {
  channel: string;
  sent: number;
  failed: number;
  success_rate: number;
}

interface TopType {
  notification_type: string;
  count: number;
}

interface LatencyStats {
  channel: string;
  p50_seconds: number;
  p95_seconds: number;
  avg_seconds: number;
}

interface DailyStats {
  date: string;
  total: number;
  in_app: number;
  email: number;
  sms: number;
  push: number;
}

interface EngagementStats {
  total_users: number;
  users_with_read: number;
  avg_read_time_minutes: number;
  read_rate: number;
}

interface PriorityStats {
  priority: string;
  count: number;
  avg_read_time_minutes: number;
}

interface ErrorStats {
  channel: string;
  error_message: string;
  count: number;
  last_occurrence: string;
}

const CHANNEL_COLORS: Record<string, string> = {
  email: "#3b82f6",
  sms: "#10b981",
  push: "#f59e0b",
  in_app: "#8b5cf6",
};

export default function AdminNotificationStats() {
  const [channelStats, setChannelStats] = useState<ChannelStats[]>([]);
  const [topTypes, setTopTypes] = useState<TopType[]>([]);
  const [latency, setLatency] = useState<LatencyStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [engagement, setEngagement] = useState<EngagementStats | null>(null);
  const [priorityStats, setPriorityStats] = useState<PriorityStats[]>([]);
  const [errors, setErrors] = useState<ErrorStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);

      const [
        { data: channels },
        { data: types },
        { data: lat },
        { data: daily },
        { data: eng },
        { data: priority },
        { data: err },
      ] = await Promise.all([
        supabase.rpc("rpc_stats_notifications_by_channel"),
        supabase.rpc("rpc_stats_notifications_top_types", { p_days: 7, p_limit: 10 }),
        supabase.rpc("rpc_stats_notifications_latency"),
        supabase.rpc("rpc_stats_notifications_daily", { p_days: 30 }),
        supabase.rpc("rpc_stats_notifications_user_engagement"),
        supabase.rpc("rpc_stats_notifications_by_priority"),
        supabase.rpc("rpc_stats_notification_errors", { p_channel: null, p_limit: 10 }),
      ]);

      setChannelStats(channels || []);
      setTopTypes(types || []);
      setLatency(lat || []);
      setDailyStats((daily || []).reverse());
      setEngagement(eng?.[0] || null);
      setPriorityStats(priority || []);
      setErrors(err || []);
    } catch (error) {
      console.error("Failed to load notification stats:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-600">Chargement des statistiques...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <BackButton />
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Statistiques Notifications</h1>
          <p className="text-slate-600 mt-1">Vue d'ensemble des performances multi-canal</p>
        </div>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Actualiser
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          title="Total Utilisateurs"
          value={engagement?.total_users?.toLocaleString() || "0"}
          subtitle="7 derniers jours"
          color="blue"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          title="Utilisateurs Actifs"
          value={engagement?.users_with_read?.toLocaleString() || "0"}
          subtitle={`${engagement?.read_rate || 0}% taux de lecture`}
          color="green"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          title="Temps de Lecture Moyen"
          value={`${engagement?.avg_read_time_minutes?.toFixed(1) || "0"}min`}
          subtitle="Délai moyen jusqu'à lecture"
          color="purple"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          title="Canaux Actifs"
          value={channelStats.length.toString()}
          subtitle="Email, SMS, Push"
          color="orange"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Volume par Canal (7j)
          </h2>
          <div className="h-64">
            {channelStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelStats}>
                  <XAxis dataKey="channel" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sent" name="Envoyés" fill="#10b981" />
                  <Bar dataKey="failed" name="Échecs" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                Aucune donnée disponible
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            {channelStats.map((stat) => (
              <div key={stat.channel} className="text-center">
                <div className="text-xs text-slate-500 uppercase">{stat.channel}</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">
                  {stat.success_rate.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-600">succès</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            Latence par Canal
          </h2>
          <div className="h-64">
            {latency.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latency}>
                  <XAxis dataKey="channel" />
                  <YAxis label={{ value: "Secondes", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="p50_seconds" name="Médiane (p50)" fill="#8b5cf6" />
                  <Bar dataKey="p95_seconds" name="p95" fill="#a78bfa" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                Aucune donnée disponible
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Volume Quotidien (30j)</h2>
        <div className="h-80">
          {dailyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyStats}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(date) => new Date(date).toLocaleDateString("fr-FR")}
                />
                <Legend />
                <Line type="monotone" dataKey="in_app" name="In-app" stroke={CHANNEL_COLORS.in_app} strokeWidth={2} />
                <Line type="monotone" dataKey="email" name="Email" stroke={CHANNEL_COLORS.email} strokeWidth={2} />
                <Line type="monotone" dataKey="sms" name="SMS" stroke={CHANNEL_COLORS.sms} strokeWidth={2} />
                <Line type="monotone" dataKey="push" name="Push" stroke={CHANNEL_COLORS.push} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Top 10 Types (7j)</h2>
          <div className="space-y-3">
            {topTypes.length > 0 ? (
              topTypes.map((type, idx) => (
                <div key={type.notification_type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
                      {idx + 1}
                    </div>
                    <span className="text-sm text-slate-700">{type.notification_type}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{type.count.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-8">Aucune donnée disponible</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Erreurs Récentes (7j)
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {errors.length > 0 ? (
              errors.map((error, idx) => (
                <div key={idx} className="border border-red-100 bg-red-50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-medium text-red-900 uppercase">{error.channel}</span>
                    <span className="text-xs text-red-600">{error.count}×</span>
                  </div>
                  <p className="text-sm text-red-800 mb-1 truncate">{error.error_message}</p>
                  <span className="text-xs text-red-600">
                    Dernier: {new Date(error.last_occurrence).toLocaleString("fr-FR")}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-8">Aucune erreur récente 🎉</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Performance par Priorité</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {priorityStats.map((stat) => (
            <div key={stat.priority} className="border border-slate-200 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-600 capitalize mb-2">{stat.priority}</div>
              <div className="text-2xl font-bold text-slate-900 mb-1">{stat.count.toLocaleString()}</div>
              <div className="text-xs text-slate-500">
                {stat.avg_read_time_minutes ? `${stat.avg_read_time_minutes.toFixed(1)}min lecture` : "N/A"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: "blue" | "green" | "purple" | "orange";
}

function StatCard({ icon, title, value, subtitle, color }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-sm font-medium text-slate-600 mb-1">{title}</div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}
