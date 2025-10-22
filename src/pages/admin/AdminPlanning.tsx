import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, Clock, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Mission {
  id: string;
  client_name: string;
  description: string;
  address: string;
  city: string;
  type: string;
  scheduled_start: string;
  scheduled_window_start: string;
  scheduled_window_end: string;
  status: string;
}

interface TimeSlot {
  hour: number;
  label: string;
}

export default function AdminPlanning() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [draggingMission, setDraggingMission] = useState<Mission | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const timeSlots: TimeSlot[] = [];
  for (let hour = 7; hour <= 19; hour++) {
    timeSlots.push({ hour, label: `${hour.toString().padStart(2, '0')}:00` });
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  useEffect(() => {
    loadMissions();
  }, [currentWeekStart]);

  async function loadMissions() {
    try {
      setLoading(true);
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .gte("scheduled_start", currentWeekStart.toISOString())
        .lt("scheduled_start", weekEnd.toISOString())
        .order("scheduled_start");

      if (error) throw error;
      setMissions(data || []);
      detectConflicts(data || []);
    } catch (err) {
      console.error("Error loading missions:", err);
    } finally {
      setLoading(false);
    }
  }

  function detectConflicts(missionsList: Mission[]) {
    const conflictIds: string[] = [];

    for (let i = 0; i < missionsList.length; i++) {
      for (let j = i + 1; j < missionsList.length; j++) {
        const m1 = missionsList[i];
        const m2 = missionsList[j];

        const start1 = new Date(m1.scheduled_window_start);
        const end1 = new Date(m1.scheduled_window_end);
        const start2 = new Date(m2.scheduled_window_start);
        const end2 = new Date(m2.scheduled_window_end);

        if (start1.toDateString() === start2.toDateString()) {
          if ((start1 < end2 && end1 > start2)) {
            conflictIds.push(m1.id, m2.id);
          }
        }
      }
    }

    setConflicts([...new Set(conflictIds)]);
  }

  async function handleDrop(date: Date, hour: number) {
    if (!draggingMission) return;

    const newStart = new Date(date);
    newStart.setHours(hour, 0, 0, 0);

    const duration = new Date(draggingMission.scheduled_window_end).getTime() -
                     new Date(draggingMission.scheduled_window_start).getTime();

    const newEnd = new Date(newStart.getTime() + duration);

    try {
      const { error } = await supabase
        .from("missions")
        .update({
          scheduled_start: newStart.toISOString(),
          scheduled_window_start: newStart.toISOString(),
          scheduled_window_end: newEnd.toISOString(),
        })
        .eq("id", draggingMission.id);

      if (error) throw error;
      await loadMissions();
    } catch (err) {
      console.error("Error updating mission:", err);
    }

    setDraggingMission(null);
  }

  function getMissionsForSlot(date: Date, hour: number): Mission[] {
    return missions.filter((m) => {
      const missionDate = new Date(m.scheduled_start);
      const missionHour = new Date(m.scheduled_window_start).getHours();

      return (
        missionDate.toDateString() === date.toDateString() &&
        missionHour === hour
      );
    });
  }

  function getDurationHeight(mission: Mission): number {
    const start = new Date(mission.scheduled_window_start);
    const end = new Date(mission.scheduled_window_end);
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    return Math.max(durationHours * 60, 60);
  }

  function previousWeek() {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  }

  function nextWeek() {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  }

  function goToToday() {
    setCurrentWeekStart(getMonday(new Date()));
  }

  const typeColors: Record<string, { bg: string; text: string; border: string }> = {
    INST: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
    ENTR: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
    DEP: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
    PACS: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du planning...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-full mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            Planning Hebdomadaire
          </h1>
          <p className="text-slate-600">Glissez-déposez les missions pour les réorganiser</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={previousWeek}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">
                Semaine du {currentWeekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </h2>
              <button
                onClick={goToToday}
                className="mt-2 px-4 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                Aujourd'hui
              </button>
            </div>

            <button
              onClick={nextWeek}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {conflicts.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Conflits détectés</p>
                <p className="text-sm text-red-700">{conflicts.length} mission(s) ont des horaires qui se chevauchent</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="grid grid-cols-8 border-b border-slate-200">
                <div className="p-4 bg-slate-50 border-r border-slate-200">
                  <span className="text-sm font-semibold text-slate-700">Heure</span>
                </div>
                {weekDays.map((day, index) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={index}
                      className={`p-4 border-r border-slate-200 last:border-r-0 ${
                        isToday ? "bg-blue-50" : "bg-slate-50"
                      }`}
                    >
                      <div className={`text-sm font-semibold ${isToday ? "text-blue-600" : "text-slate-700"}`}>
                        {day.toLocaleDateString("fr-FR", { weekday: "short" })}
                      </div>
                      <div className={`text-lg font-bold ${isToday ? "text-blue-600" : "text-slate-900"}`}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {timeSlots.map((slot) => (
                <div key={slot.hour} className="grid grid-cols-8 border-b border-slate-200 last:border-b-0">
                  <div className="p-4 bg-slate-50 border-r border-slate-200 flex items-start">
                    <span className="text-sm text-slate-600 font-medium">{slot.label}</span>
                  </div>
                  {weekDays.map((day, dayIndex) => {
                    const slotMissions = getMissionsForSlot(day, slot.hour);
                    const isToday = day.toDateString() === new Date().toDateString();

                    return (
                      <div
                        key={dayIndex}
                        className={`p-2 border-r border-slate-200 last:border-r-0 min-h-[60px] relative ${
                          isToday ? "bg-blue-50 bg-opacity-30" : ""
                        }`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(day, slot.hour)}
                      >
                        {slotMissions.map((mission) => {
                          const hasConflict = conflicts.includes(mission.id);
                          const colors = typeColors[mission.type] || typeColors.INST;
                          const height = getDurationHeight(mission);

                          return (
                            <div
                              key={mission.id}
                              draggable
                              onDragStart={() => setDraggingMission(mission)}
                              onDragEnd={() => setDraggingMission(null)}
                              className={`p-2 rounded-lg border-2 cursor-move hover:shadow-lg transition-all mb-2 ${
                                colors.bg
                              } ${colors.border} ${hasConflict ? "ring-2 ring-red-500" : ""}`}
                              style={{ minHeight: `${height}px` }}
                            >
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <p className={`font-semibold text-sm ${colors.text}`}>
                                  {mission.client_name}
                                </p>
                                {hasConflict && (
                                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-2 mb-1">
                                {mission.description}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(mission.scheduled_window_start).toLocaleTimeString("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                  {" - "}
                                  {new Date(mission.scheduled_window_end).toLocaleTimeString("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{mission.city}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Légende</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
              <span className="text-sm text-slate-700">Installation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
              <span className="text-sm text-slate-700">Entretien</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
              <span className="text-sm text-slate-700">Dépannage</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-slate-700">Conflit horaire</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
