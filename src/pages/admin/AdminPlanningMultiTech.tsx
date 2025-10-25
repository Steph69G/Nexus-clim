import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, Users, TrendingUp, AlertTriangle, Clock, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BackButton } from "@/components/navigation/BackButton";

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
  planning_technician_id: string | null;
}

interface Technician {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  specialties: string[];
  color: string;
  is_active: boolean;
}

interface TimeSlot {
  hour: number;
  label: string;
}

export default function AdminPlanningMultiTech() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [draggingMission, setDraggingMission] = useState<Mission | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
    loadData();
  }, [currentWeekStart]);

  async function loadData() {
    try {
      setLoading(true);

      const { data: techData, error: techError } = await supabase
        .from("planning_technicians")
        .select("*")
        .eq("is_active", true)
        .order("full_name");

      if (techError) throw techError;
      setTechnicians(techData || []);

      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const { data: missionData, error: missionError } = await supabase
        .from("missions")
        .select("*")
        .gte("scheduled_start", currentWeekStart.toISOString())
        .lt("scheduled_start", weekEnd.toISOString())
        .order("scheduled_start");

      if (missionError) throw missionError;
      setMissions(missionData || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDrop(date: Date, hour: number, techId: string) {
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
          planning_technician_id: techId,
        })
        .eq("id", draggingMission.id);

      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error("Error updating mission:", err);
    }

    setDraggingMission(null);
  }

  function getMissionsForTechAndSlot(techId: string, date: Date, hour: number): Mission[] {
    return missions.filter((m) => {
      const missionDate = new Date(m.scheduled_start);
      const missionHour = new Date(m.scheduled_window_start).getHours();

      return (
        m.planning_technician_id === techId &&
        missionDate.toDateString() === date.toDateString() &&
        missionHour === hour
      );
    });
  }

  function getUnassignedMissions(date: Date): Mission[] {
    return missions.filter((m) => {
      const missionDate = new Date(m.scheduled_start);
      return (
        !m.planning_technician_id &&
        missionDate.toDateString() === date.toDateString()
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

  function getTechWorkload(techId: string, date: Date): { hours: number; missions: number } {
    const techMissions = missions.filter((m) => {
      const missionDate = new Date(m.scheduled_start);
      return (
        m.planning_technician_id === techId &&
        missionDate.toDateString() === date.toDateString()
      );
    });

    const totalMs = techMissions.reduce((sum, m) => {
      const start = new Date(m.scheduled_window_start);
      const end = new Date(m.scheduled_window_end);
      return sum + (end.getTime() - start.getTime());
    }, 0);

    return {
      hours: totalMs / (1000 * 60 * 60),
      missions: techMissions.length,
    };
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
    setSelectedDate(new Date());
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

  const selectedDateMissions = weekDays.find(d => d.toDateString() === selectedDate.toDateString()) || selectedDate;
  const unassignedMissions = getUnassignedMissions(selectedDateMissions);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-full mx-auto px-4 py-8">
        <BackButton to="/admin/operations" label="Retour aux Opérations" />
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Planning Multi-Techniciens
          </h1>
          <p className="text-slate-600">Vue par technicien - Glissez-déposez pour assigner</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
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

          <div className="flex gap-2 overflow-x-auto pb-2">
            {weekDays.map((day, index) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const isSelected = day.toDateString() === selectedDate.toDateString();

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : isToday
                      ? "border-blue-300 bg-blue-50 bg-opacity-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`text-sm font-semibold ${isSelected ? "text-blue-600" : "text-slate-700"}`}>
                    {day.toLocaleDateString("fr-FR", { weekday: "short" })}
                  </div>
                  <div className={`text-2xl font-bold ${isSelected ? "text-blue-600" : "text-slate-900"}`}>
                    {day.getDate()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {technicians.map((tech) => {
            const workload = getTechWorkload(tech.id, selectedDateMissions);
            const workloadPercent = (workload.hours / 8) * 100;

            return (
              <div key={tech.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: tech.color }}
                  >
                    {tech.full_name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{tech.full_name}</h3>
                    <p className="text-xs text-slate-500">{tech.specialties.join(", ")}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Charge de travail</span>
                    <span className="font-semibold text-slate-900">{workload.hours.toFixed(1)}h / 8h</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        workloadPercent > 100
                          ? "bg-red-500"
                          : workloadPercent > 80
                          ? "bg-orange-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(workloadPercent, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Missions</span>
                    <span className="font-semibold text-slate-900">{workload.missions}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {unassignedMissions.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-2">
                  {unassignedMissions.length} mission(s) non assignée(s) ce jour
                </h3>
                <div className="space-y-2">
                  {unassignedMissions.map((mission) => {
                    const colors = typeColors[mission.type] || typeColors.INST;
                    return (
                      <div
                        key={mission.id}
                        draggable
                        onDragStart={() => setDraggingMission(mission)}
                        onDragEnd={() => setDraggingMission(null)}
                        className={`p-3 rounded-lg border-2 cursor-move hover:shadow-lg transition-all ${colors.bg} ${colors.border}`}
                      >
                        <p className={`font-semibold text-sm ${colors.text}`}>{mission.client_name}</p>
                        <p className="text-xs text-slate-600">{mission.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="grid grid-cols-5 border-b border-slate-200">
                <div className="p-4 bg-slate-50 border-r border-slate-200">
                  <span className="text-sm font-semibold text-slate-700">Heure</span>
                </div>
                {technicians.map((tech) => (
                  <div
                    key={tech.id}
                    className="p-4 border-r border-slate-200 last:border-r-0"
                    style={{ backgroundColor: `${tech.color}10` }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: tech.color }}
                      >
                        {tech.full_name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{tech.full_name}</div>
                        <div className="text-xs text-slate-500">{tech.specialties[0]}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {timeSlots.map((slot) => (
                <div key={slot.hour} className="grid grid-cols-5 border-b border-slate-200 last:border-b-0">
                  <div className="p-4 bg-slate-50 border-r border-slate-200 flex items-start">
                    <span className="text-sm text-slate-600 font-medium">{slot.label}</span>
                  </div>
                  {technicians.map((tech) => {
                    const slotMissions = getMissionsForTechAndSlot(tech.id, selectedDateMissions, slot.hour);

                    return (
                      <div
                        key={tech.id}
                        className="p-2 border-r border-slate-200 last:border-r-0 min-h-[60px] relative"
                        style={{ backgroundColor: `${tech.color}05` }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(selectedDateMissions, slot.hour, tech.id)}
                      >
                        {slotMissions.map((mission) => {
                          const colors = typeColors[mission.type] || typeColors.INST;
                          const height = getDurationHeight(mission);

                          return (
                            <div
                              key={mission.id}
                              draggable
                              onDragStart={() => setDraggingMission(mission)}
                              onDragEnd={() => setDraggingMission(null)}
                              className={`p-2 rounded-lg border-2 cursor-move hover:shadow-lg transition-all mb-2 ${colors.bg} ${colors.border}`}
                              style={{ minHeight: `${height}px` }}
                            >
                              <p className={`font-semibold text-sm ${colors.text}`}>{mission.client_name}</p>
                              <p className="text-xs text-slate-600 line-clamp-1 mb-1">{mission.description}</p>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(mission.scheduled_window_start).toLocaleTimeString("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                  -
                                  {new Date(mission.scheduled_window_end).toLocaleTimeString("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
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
