import { useState, useEffect } from "react";
import { Clock, Check, X, Calendar, User, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BackButton } from "@/components/navigation/BackButton";

interface TimeEntry {
  id: string;
  mission_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  break_duration_minutes: number;
  billable_duration_minutes: number;
  status: string;
  notes: string;
  mission?: {
    title: string;
  };
  user?: {
    full_name: string;
  };
}

export default function AdminTimesheet() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("submitted");
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    loadEntries();
  }, [filter, dateFilter]);

  async function loadEntries() {
    try {
      setLoading(true);

      let query = supabase
        .from("time_entries")
        .select(
          `
          *,
          mission:missions(title),
          user:profiles(full_name)
        `
        )
        .order("start_time", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      if (dateFilter) {
        const date = new Date(dateFilter);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query
          .gte("start_time", date.toISOString())
          .lt("start_time", nextDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error("Error loading entries:", err);
      alert("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate(entryId: string, approved: boolean) {
    try {
      const { error } = await supabase.rpc("validate_time_entry", {
        p_entry_id: entryId,
        p_validator_id: (await supabase.auth.getUser()).data.user?.id,
        p_approved: approved,
        p_rejection_reason: approved ? null : "Nécessite vérification",
      });

      if (error) throw error;

      loadEntries();
    } catch (err: any) {
      console.error("Validation error:", err);
      alert("Erreur : " + err.message);
    }
  }

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, "0")}`;
  }

  const totalHours = entries.reduce((sum, e) => sum + (e.billable_duration_minutes || 0), 0);
  const pendingCount = entries.filter((e) => e.status === "submitted").length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <BackButton to="/admin/ressources" label="Retour aux Ressources" />
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-600" />
            Gestion des Heures
          </h1>
          <p className="text-slate-600 mt-1">Validation et suivi du temps de travail</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">En attente validation</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{pendingCount}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total heures (période)</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{formatDuration(totalHours)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Entrées totales</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{entries.length}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Statut</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous</option>
                <option value="submitted">En attente</option>
                <option value="validated">Validées</option>
                <option value="rejected">Rejetées</option>
                <option value="draft">Brouillons</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                  Date
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                  Technicien
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                  Mission
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                  Début
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                  Fin
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                  Durée
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                  Facturable
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                  Statut
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    Aucune entrée trouvée
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {new Date(entry.start_time).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {entry.user?.full_name || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">{entry.mission?.title || "N/A"}</div>
                      {entry.notes && (
                        <div className="text-xs text-slate-500 mt-1 line-clamp-1">{entry.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-600">
                      {new Date(entry.start_time).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-600">
                      {entry.end_time
                        ? new Date(entry.end_time).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-slate-900">
                      {formatDuration(entry.duration_minutes)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">
                      {formatDuration(entry.billable_duration_minutes)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          entry.status === "validated"
                            ? "bg-green-100 text-green-700"
                            : entry.status === "submitted"
                            ? "bg-orange-100 text-orange-700"
                            : entry.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {entry.status === "validated"
                          ? "Validée"
                          : entry.status === "submitted"
                          ? "En attente"
                          : entry.status === "rejected"
                          ? "Rejetée"
                          : "Brouillon"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {entry.status === "submitted" && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleValidate(entry.id, true)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Valider"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleValidate(entry.id, false)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Rejeter"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
