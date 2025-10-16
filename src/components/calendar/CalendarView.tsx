import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarMission } from "@/api/missions.calendar";
import { getMissionDateForCalendar } from "@/api/missions.calendar";
import { MissionEventCard } from "./MissionEventCard";

interface CalendarViewProps {
  missions: CalendarMission[];
  onMissionClick: (mission: CalendarMission) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

export function CalendarView({
  missions,
  onMissionClick,
  currentMonth,
  onMonthChange,
}: CalendarViewProps) {
  const [viewMode] = useState<"month">("month");

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 capitalize">
            {monthName}
          </h2>

          <div className="flex items-center gap-2">
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
