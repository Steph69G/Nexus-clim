import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Users, FileText, DollarSign, Star } from "lucide-react";
import { fetchDashboardSummary, type DashboardSummary } from "@/api/kpis";

export default function AdminKpiDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchDashboardSummary();
        setSummary(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Chargement des KPIs...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">
            Aucune donnée KPI disponible. Les snapshots seront générés automatiquement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de Bord</h1>
        <p className="text-gray-600">Indicateurs de performance du mois en cours</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard
          title="Chiffre d'Affaires"
          value={`${summary.revenue.current.toLocaleString("fr-FR")} €`}
          change={summary.revenue.change}
          icon={<DollarSign className="w-6 h-6" />}
          color="blue"
        />

        <KpiCard
          title="Taux de Conversion"
          value={`${summary.conversion.rate.toFixed(1)}%`}
          subtitle={`${summary.conversion.quotesAccepted}/${summary.conversion.quotesTotal} devis`}
          icon={<FileText className="w-6 h-6" />}
          color="green"
        />

        <KpiCard
          title="Satisfaction Client"
          value={`${summary.satisfaction.rating.toFixed(1)}/10`}
          subtitle={`NPS: ${summary.satisfaction.nps.toFixed(0)}`}
          icon={<Star className="w-6 h-6" />}
          color="yellow"
        />

        <KpiCard
          title="Missions Terminées"
          value={summary.operations.missionsCompleted.toString()}
          subtitle={`${summary.operations.onTimeRate.toFixed(0)}% à l'heure`}
          icon={<Users className="w-6 h-6" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Performance Commerciale</h2>
          <div className="space-y-4">
            <MetricRow
              label="Devis signés"
              value={summary.conversion.quotesAccepted}
              total={summary.conversion.quotesTotal}
              percentage={summary.conversion.rate}
            />
            <MetricRow
              label="Taux de réponse enquêtes"
              value={0}
              total={0}
              percentage={summary.satisfaction.responseRate}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Performance Opérationnelle</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Taux de ponctualité</span>
              <span className="font-semibold">
                {summary.operations.onTimeRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Délai moyen intervention</span>
              <span className="font-semibold">
                {summary.operations.averageDelay.toFixed(0)}h
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  change,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    purple: "bg-purple-50 text-purple-600",
  }[color];

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses}`}>{icon}</div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              change >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <h3 className="text-gray-600 text-sm mb-1">{title}</h3>
      <p className="text-2xl font-bold mb-1">{value}</p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

function MetricRow({
  label,
  value,
  total,
  percentage,
}: {
  label: string;
  value: number;
  total: number;
  percentage: number;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold">
          {value}/{total} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
