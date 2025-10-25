import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, Target, CheckCircle, Award } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BackButton } from "@/components/navigation/BackButton";

interface KpiSnapshot {
  id: string;
  period_start: string;
  period_end: string;
  quotes_sent: number;
  quotes_signed: number;
  conversion_rate: number;
  total_revenue_ttc: number;
  missions_created: number;
  missions_completed: number;
}

export default function AdminAnalytics() {
  const [snapshots, setSnapshots] = useState<KpiSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSnapshots();
  }, []);

  async function loadSnapshots() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("kpi_snapshots")
        .select("*")
        .order("period_end", { ascending: true })
        .limit(12);

      if (error) throw error;
      setSnapshots(data || []);
    } catch (err) {
      console.error("Error loading snapshots:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  const latestSnapshot = snapshots[snapshots.length - 1];
  const previousSnapshot = snapshots[snapshots.length - 2];

  const calculateTrend = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueTrend = calculateTrend(
    latestSnapshot?.total_revenue_ttc || 0,
    previousSnapshot?.total_revenue_ttc || 0
  );

  const conversionTrend = calculateTrend(
    latestSnapshot?.conversion_rate || 0,
    previousSnapshot?.conversion_rate || 0
  );

  const missionsTrend = calculateTrend(
    latestSnapshot?.missions_completed || 0,
    previousSnapshot?.missions_completed || 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <BackButton to="/admin/pilotage" label="Retour au Pilotage" />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            Analytics & Évolution
          </h1>
          <p className="text-slate-600">Suivez l'évolution de vos performances sur 6 mois</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <TrendCard
            icon={<DollarSign className="w-6 h-6" />}
            title="Chiffre d'Affaires"
            value={`${(latestSnapshot?.total_revenue_ttc || 0).toFixed(0)} €`}
            trend={revenueTrend}
            color="green"
          />
          <TrendCard
            icon={<Target className="w-6 h-6" />}
            title="Taux de Conversion"
            value={`${(latestSnapshot?.conversion_rate || 0).toFixed(1)} %`}
            trend={conversionTrend}
            color="blue"
          />
          <TrendCard
            icon={<CheckCircle className="w-6 h-6" />}
            title="Missions Complétées"
            value={`${latestSnapshot?.missions_completed || 0}`}
            trend={missionsTrend}
            color="purple"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Évolution du Chiffre d'Affaires</h2>
            <LineChart
              data={snapshots.map((s) => ({
                label: new Date(s.period_end).toLocaleDateString("fr-FR", { month: "short" }),
                value: s.total_revenue_ttc,
              }))}
              color="#10b981"
              suffix=" €"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Taux de Conversion</h2>
            <LineChart
              data={snapshots.map((s) => ({
                label: new Date(s.period_end).toLocaleDateString("fr-FR", { month: "short" }),
                value: s.conversion_rate,
              }))}
              color="#3b82f6"
              suffix=" %"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Missions par Mois</h2>
            <BarChart
              data={snapshots.map((s) => ({
                label: new Date(s.period_end).toLocaleDateString("fr-FR", { month: "short" }),
                value: s.missions_completed,
                total: s.missions_created,
              }))}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Performance Mensuelle</h2>
            <div className="space-y-4">
              {snapshots.slice(-6).reverse().map((snapshot, index) => {
                const monthName = new Date(snapshot.period_end).toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                });
                const completionRate = (snapshot.missions_completed / snapshot.missions_created) * 100;

                return (
                  <div key={snapshot.id} className="border-b border-slate-100 pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-900 capitalize">{monthName}</h3>
                      <span className="text-sm font-medium text-slate-600">
                        {snapshot.missions_completed}/{snapshot.missions_created}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${completionRate}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-slate-500">Taux: {completionRate.toFixed(0)}%</span>
                      <span className="text-green-600 font-semibold">
                        {snapshot.total_revenue_ttc.toFixed(0)} €
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendCard({ icon, title, value, trend, color }: any) {
  const isPositive = trend >= 0;
  const colors: Record<string, string> = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-slate-600 text-sm mb-1">{title}</p>
      <p className="text-3xl font-bold text-slate-900 mb-2">{value}</p>
      <div className="flex items-center gap-2">
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-green-600" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-600" />
        )}
        <span className={`text-sm font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
          {Math.abs(trend).toFixed(1)}% vs mois dernier
        </span>
      </div>
    </div>
  );
}

function LineChart({ data, color, suffix = "" }: any) {
  if (!data || data.length === 0) return <div className="text-center text-slate-500">Aucune donnée</div>;

  const maxValue = Math.max(...data.map((d: any) => d.value));
  const minValue = Math.min(...data.map((d: any) => d.value));
  const range = maxValue - minValue || 1;

  const width = 600;
  const height = 200;
  const padding = 40;

  const points = data.map((d: any, i: number) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.value - minValue) / range) * (height - padding * 2);
    return { x, y, value: d.value, label: d.label };
  });

  const pathD = points.map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        <path
          d={`${pathD} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
          fill={`url(#gradient-${color})`}
        />

        <path d={pathD} fill="none" stroke={color} strokeWidth="3" />

        {points.map((p: any, i: number) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={color} />
            <text
              x={p.x}
              y={height - 10}
              textAnchor="middle"
              fontSize="12"
              fill="#64748b"
              fontWeight="500"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function BarChart({ data }: any) {
  if (!data || data.length === 0) return <div className="text-center text-slate-500">Aucune donnée</div>;

  const maxValue = Math.max(...data.map((d: any) => d.total));

  return (
    <div className="space-y-4">
      {data.map((item: any, index: number) => {
        const completedPercent = (item.value / maxValue) * 100;
        const totalPercent = (item.total / maxValue) * 100;

        return (
          <div key={index}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">{item.label}</span>
              <span className="text-sm text-slate-600">
                {item.value}/{item.total}
              </span>
            </div>
            <div className="relative w-full bg-slate-200 rounded-full h-8">
              <div
                className="absolute bg-slate-300 h-8 rounded-full"
                style={{ width: `${totalPercent}%` }}
              ></div>
              <div
                className="absolute bg-blue-600 h-8 rounded-full"
                style={{ width: `${completedPercent}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
