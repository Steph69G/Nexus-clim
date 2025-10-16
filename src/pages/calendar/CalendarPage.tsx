import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { CalendarView } from "@/components/calendar/CalendarView";
import { CalendarFilters } from "@/components/calendar/CalendarFilters";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { CalendarMission } from "@/api/missions.calendar";
import { fetchCalendarMissions } from "@/api/missions.calendar";
import type { MissionStatus } from "@/types/mission";

export default function CalendarPage() {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<CalendarMission[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<CalendarMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [filters, setFilters] = useState<{
    statuses: MissionStatus[];
    assignedUserId: string | null;
    interventionTypeId: number | null;
    showOnlyMine: boolean;
  }>({
    statuses: [],
    assignedUserId: null,
    interventionTypeId: null,
    showOnlyMine: false,
  });

  useEffect(() => {
    loadMissions();
  }, [currentMonth]);

  useEffect(() => {
    applyFilters();
  }, [missions, filters]);

  async function loadMissions() {
    try {
      setLoading(true);
      setError(null);

      const startOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      );
      const endOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      const data = await fetchCalendarMissions({
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString(),
      });

      setMissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
      console.error("Error loading calendar missions:", err);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...missions];

    if (filters.statuses.length > 0) {
      filtered = filtered.filter((m) => filters.statuses.includes(m.status));
    }

    if (filters.assignedUserId) {
      filtered = filtered.filter((m) => m.assigned_user_id === filters.assignedUserId);
    }

    if (filters.interventionTypeId) {
      filtered = filtered.filter(
        (m) => m.intervention_type_id === filters.interventionTypeId
      );
    }

    setFilteredMissions(filtered);
  }

  function handleMissionClick(mission: CalendarMission) {
    navigate(`/missions/${mission.id}`);
  }

  function handleMonthChange(newMonth: Date) {
    setCurrentMonth(newMonth);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Calendrier des missions
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Visualisez et planifiez vos interventions
              </p>
            </div>
          </div>
        </div>
      </div>

      <CalendarFilters onFiltersChange={setFilters} />

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Erreur de chargement</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {filteredMissions.length} mission(s) affichée(s)
                {filters.statuses.length > 0 ||
                filters.assignedUserId ||
                filters.interventionTypeId ? (
                  <span className="ml-1 text-blue-600 font-medium">
                    (filtré)
                  </span>
                ) : null}
              </div>
            </div>

            <CalendarView
              missions={filteredMissions}
              onMissionClick={handleMissionClick}
              currentMonth={currentMonth}
              onMonthChange={handleMonthChange}
            />

            {filteredMissions.length === 0 && !loading && (
              <div className="mt-8 text-center py-12 bg-white rounded-xl border border-slate-200">
                <CalendarIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  Aucune mission trouvée
                </h3>
                <p className="text-sm text-slate-500">
                  {filters.statuses.length > 0 ||
                  filters.assignedUserId ||
                  filters.interventionTypeId
                    ? "Essayez de modifier vos filtres"
                    : "Aucune mission prévue pour ce mois"}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
