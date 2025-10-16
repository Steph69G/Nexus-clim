import { useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import type { CalendarMission } from "@/api/missions.calendar";
import { getMissionDateForCalendar, getStatusLegends } from "@/api/missions.calendar";
import { MissionEventCard } from "./MissionEventCard";

interface CalendarViewProps {
  missions: CalendarMission[];
  onMissionClick: (mission: CalendarMission) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedStatuses: string[];
  onStatusToggle: (status: string) => void;
}

export function CalendarView({
  missions,
  onMissionClick,
  currentMonth,
  onMonthChange,
  selectedStatuses,
  onStatusToggle,
}: CalendarViewProps) {
  const [viewMode] = useState<"month">("month");
  const [showLegendInfo, setShowLegendInfo] = useState(false);

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const previousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  const goToToday = () => {
    onMonthChange(new Date());
  };

  const getMissionsForDay = (day: number): CalendarMission[] => {
    return missions.filter((mission) => {
      const missionDate = getMissionDateForCalendar(mission);
      if (!missionDate) return false;

      return (
        missionDate.getDate() === day &&
        missionDate.getMonth() === currentMonth.getMonth() &&
        missionDate.getFullYear() === currentMonth.getFullYear()
      );
    });
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const monthName = currentMonth.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const unscheduledMissions = missions.filter(
    (mission) => !getMissionDateForCalendar(mission)
  );

  const statusLegends = getStatusLegends();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 capitalize">
            {monthName}
          </h2>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                <button
                  onClick={() => setShowLegendInfo(!showLegendInfo)}
                  className="flex items-center gap-1.5 px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors border-r border-slate-200 pr-3 mr-1"
                  title="Afficher les explications du cycle de vie"
                >
                  <Info className="w-4 h-4" />
                  <span className="text-xs font-medium">Guide</span>
                </button>

                {statusLegends.map((legend) => {
                  const isSelected = selectedStatuses.includes(legend.status);
                  return (
                    <button
                      key={legend.status}
                      onClick={() => onStatusToggle(legend.status)}
                      title={legend.description}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                        isSelected
                          ? `${legend.color} text-white shadow-sm`
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${isSelected ? "bg-white" : legend.color}`} />
                      <span className={`text-xs font-medium whitespace-nowrap ${isSelected ? "text-white" : "text-slate-700"}`}>
                        {legend.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {showLegendInfo && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowLegendInfo(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-xl p-5 z-30">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Cycle de vie d'une mission</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Comprendre les différents statuts</p>
                      </div>
                      <button
                        onClick={() => setShowLegendInfo(false)}
                        className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                      >
                        ×
                      </button>
                    </div>
                    <div className="space-y-3">
                      {statusLegends.map((legend) => (
                        <div key={legend.status} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className={`w-4 h-4 rounded-full ${legend.color} mt-0.5 shrink-0`} />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-slate-900">{legend.label}</div>
                            <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{legend.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 italic">
                        💡 Cliquez sur un statut pour filtrer les missions
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Aujourd'hui
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={previousMonth}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {unscheduledMissions.length > 0 && (
        <div className="px-6 py-4 border-b border-slate-200 bg-orange-50">
          <h3 className="text-sm font-semibold text-orange-900 mb-3">
            Missions à planifier ({unscheduledMissions.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {unscheduledMissions.map((mission) => (
              <MissionEventCard
                key={mission.id}
                mission={mission}
                onClick={() => onMissionClick(mission)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200">
          {weekDays.map((day) => (
            <div
              key={day}
              className="bg-slate-100 px-2 py-3 text-center text-sm font-semibold text-slate-700"
            >
              {day}
            </div>
          ))}

          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50 min-h-[120px]" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayMissions = getMissionsForDay(day);
            const isTodayCell = isToday(day);

            return (
              <div
                key={day}
                className={`bg-white p-2 min-h-[120px] ${
                  isTodayCell ? "ring-2 ring-blue-500 ring-inset" : ""
                }`}
              >
                <div
                  className={`text-sm font-semibold mb-2 ${
                    isTodayCell
                      ? "text-blue-600"
                      : "text-slate-700"
                  }`}
                >
                  {day}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[200px]">
                  {dayMissions.slice(0, 3).map((mission) => (
                    <MissionEventCard
                      key={mission.id}
                      mission={mission}
                      onClick={() => onMissionClick(mission)}
                    />
                  ))}

                  {dayMissions.length > 3 && (
                    <div className="text-xs text-slate-500 text-center py-1">
                      +{dayMissions.length - 3} autre(s)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
