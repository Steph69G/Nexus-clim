import { useEffect, useState } from "react";
import {
  X,
  User,
  TrendingUp,
  CheckCircle,
  Clock,
  MapPin,
  Euro,
  Calendar,
  Briefcase
} from "lucide-react";
import { fetchUserMissionHistory, fetchUserMissionStats, type MissionHistory, type UserMissionStats } from "@/api/missions.history";
import { useToast } from "@/ui/toast/ToastProvider";

interface SubcontractorHistoryModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

function formatMoney(cents: number | null, cur: string | null) {
  if (cents == null) return "—";
  const eur = (cents / 100).toFixed(2);
  return `${eur} ${cur ?? "EUR"}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: "Brouillon", color: "bg-slate-100 text-slate-700" },
    published: { label: "Publiée", color: "bg-blue-100 text-blue-700" },
    assigned: { label: "Assignée", color: "bg-orange-100 text-orange-700" },
    in_progress: { label: "En cours", color: "bg-yellow-100 text-yellow-700" },
    completed: { label: "Terminée", color: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "Annulée", color: "bg-red-100 text-red-700" },
  };

  const config = statusMap[status] || { label: status, color: "bg-slate-100 text-slate-700" };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

export default function SubcontractorHistoryModal({ userId, userName, onClose }: SubcontractorHistoryModalProps) {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<MissionHistory[]>([]);
  const [stats, setStats] = useState<UserMissionStats | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [historyData, statsData] = await Promise.all([
          fetchUserMissionHistory(userId),
          fetchUserMissionStats(userId),
        ]);
        setHistory(historyData);
        setStats(statsData);
      } catch (e: any) {
        push({ type: "error", message: e.message || "Erreur chargement historique" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">{userName}</h2>
                <p className="text-emerald-100">Historique des missions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Chargement...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Statistiques */}
            {stats && (
              <div className="p-6 bg-slate-50 border-b border-slate-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatItem
                    icon={<Briefcase className="w-5 h-5 text-blue-600" />}
                    label="Total missions"
                    value={stats.total_missions}
                    color="blue"
                  />
                  <StatItem
                    icon={<Clock className="w-5 h-5 text-orange-600" />}
                    label="En cours"
                    value={stats.active_missions}
                    color="orange"
                  />
                  <StatItem
                    icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
                    label="Terminées"
                    value={stats.completed_missions}
                    color="emerald"
                  />
                  <StatItem
                    icon={<TrendingUp className="w-5 h-5 text-teal-600" />}
                    label="Gains totaux"
                    value={formatMoney(stats.total_earnings_cents, "EUR")}
                    color="teal"
                  />
                </div>
              </div>
            )}

            {/* Liste des missions */}
            <div className="flex-1 overflow-y-auto p-6">
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune mission</h3>
                  <p className="text-slate-600">Cet utilisateur n'a pas encore de missions assignées.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((mission) => (
                    <MissionHistoryCard key={mission.mission_id} mission={mission} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white border-2 border-slate-300 rounded-2xl hover:bg-slate-50 transition-all font-semibold text-slate-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-100",
    orange: "bg-orange-100",
    emerald: "bg-emerald-100",
    teal: "bg-teal-100",
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200">
      <div className={`w-10 h-10 ${colorClasses[color]} rounded-lg flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  );
}

function MissionHistoryCard({ mission }: { mission: MissionHistory }) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="font-semibold text-lg text-slate-900 mb-2">{mission.title}</h4>
          <div className="flex flex-wrap items-center gap-3">
            {getStatusBadge(mission.status)}
            <div className="flex items-center gap-1 text-sm text-slate-600">
              <MapPin className="w-4 h-4" />
              {mission.masked_address}
            </div>
          </div>
        </div>
        <div className="text-right ml-4">
          <div className="text-2xl font-bold text-emerald-600">
            {formatMoney(mission.price_subcontractor_cents, mission.currency)}
          </div>
          <div className="text-xs text-slate-500">Rémunération</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Calendar className="w-3 h-3" />
            Créée le
          </div>
          <div className="text-sm font-medium text-slate-700">{formatDate(mission.created_at)}</div>
        </div>
        {mission.scheduled_at && (
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Clock className="w-3 h-3" />
              Planifiée le
            </div>
            <div className="text-sm font-medium text-slate-700">{formatDate(mission.scheduled_at)}</div>
          </div>
        )}
        {mission.completed_at && (
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <CheckCircle className="w-3 h-3" />
              Terminée le
            </div>
            <div className="text-sm font-medium text-slate-700">{formatDate(mission.completed_at)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
