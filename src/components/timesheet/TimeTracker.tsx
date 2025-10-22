import { useState, useEffect } from "react";
import { Play, Pause, Square, Clock, Coffee } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

interface TimeTrackerProps {
  missionId: string;
  onComplete?: () => void;
}

interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  status: string;
  duration_minutes: number;
  break_duration_minutes: number;
}

export default function TimeTracker({ missionId, onComplete }: TimeTrackerProps) {
  const { profile } = useProfile();
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);

  useEffect(() => {
    loadActiveEntry();
  }, [missionId]);

  useEffect(() => {
    if (activeEntry && activeEntry.status === "running" && !isOnBreak) {
      const interval = setInterval(() => {
        const start = new Date(activeEntry.start_time);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        setElapsedSeconds(diff - (activeEntry.break_duration_minutes * 60));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeEntry, isOnBreak]);

  async function loadActiveEntry() {
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("mission_id", missionId)
        .eq("user_id", profile?.user_id)
        .eq("status", "running")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setActiveEntry(data);
        const start = new Date(data.start_time);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        setElapsedSeconds(diff - (data.break_duration_minutes * 60));
      }
    } catch (err) {
      console.error("Error loading active entry:", err);
    }
  }

  async function handleStart() {
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          mission_id: missionId,
          user_id: profile?.user_id,
          start_time: new Date().toISOString(),
          status: "running",
          entry_type: "work",
        })
        .select()
        .single();

      if (error) throw error;

      setActiveEntry(data);
      setElapsedSeconds(0);
    } catch (err: any) {
      console.error("Start error:", err);
      alert("Erreur : " + err.message);
    }
  }

  async function handlePause() {
    if (!activeEntry) return;

    setIsOnBreak(true);
    setBreakStartTime(new Date());

    try {
      const { error } = await supabase.from("time_entry_breaks").insert({
        time_entry_id: activeEntry.id,
        start_time: new Date().toISOString(),
        break_type: "other",
      });

      if (error) throw error;
    } catch (err: any) {
      console.error("Pause error:", err);
      alert("Erreur : " + err.message);
    }
  }

  async function handleResume() {
    if (!activeEntry || !breakStartTime) return;

    try {
      const { data: breaks } = await supabase
        .from("time_entry_breaks")
        .select("*")
        .eq("time_entry_id", activeEntry.id)
        .is("end_time", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (breaks && breaks.length > 0) {
        const { error } = await supabase
          .from("time_entry_breaks")
          .update({ end_time: new Date().toISOString() })
          .eq("id", breaks[0].id);

        if (error) throw error;
      }

      setIsOnBreak(false);
      setBreakStartTime(null);
      loadActiveEntry();
    } catch (err: any) {
      console.error("Resume error:", err);
      alert("Erreur : " + err.message);
    }
  }

  async function handleStop() {
    if (!activeEntry) return;

    if (isOnBreak) {
      await handleResume();
    }

    try {
      const { error } = await supabase
        .from("time_entries")
        .update({
          end_time: new Date().toISOString(),
          status: "draft",
        })
        .eq("id", activeEntry.id);

      if (error) throw error;

      setActiveEntry(null);
      setElapsedSeconds(0);

      if (onComplete) onComplete();
    } catch (err: any) {
      console.error("Stop error:", err);
      alert("Erreur : " + err.message);
    }
  }

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  const isRunning = activeEntry && activeEntry.status === "running";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Pointage Heures
        </h3>
        {isOnBreak && (
          <span className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
            <Coffee className="w-4 h-4" />
            En pause
          </span>
        )}
      </div>

      <div className="text-center py-8">
        <div
          className={`text-6xl font-mono font-bold mb-6 ${
            isRunning
              ? isOnBreak
                ? "text-orange-600"
                : "text-blue-600"
              : "text-slate-400"
          }`}
        >
          {formatTime(elapsedSeconds)}
        </div>

        <div className="flex items-center justify-center gap-3">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Play className="w-5 h-5" />
              Démarrer
            </button>
          ) : (
            <>
              {!isOnBreak ? (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                >
                  <Pause className="w-5 h-5" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Play className="w-5 h-5" />
                  Reprendre
                </button>
              )}
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <Square className="w-5 h-5" />
                Terminer
              </button>
            </>
          )}
        </div>
      </div>

      {activeEntry && (
        <div className="mt-4 pt-4 border-t border-slate-200 text-sm text-slate-600">
          <div className="flex justify-between">
            <span>Début :</span>
            <span className="font-medium">
              {new Date(activeEntry.start_time).toLocaleTimeString("fr-FR")}
            </span>
          </div>
          {activeEntry.break_duration_minutes > 0 && (
            <div className="flex justify-between mt-1">
              <span>Pauses :</span>
              <span className="font-medium">{activeEntry.break_duration_minutes} min</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-slate-500 bg-blue-50 p-3 rounded-lg">
        <div className="font-medium text-blue-900 mb-1">ℹ️ Instructions</div>
        <ul className="space-y-1 list-disc list-inside">
          <li>Cliquez sur Démarrer au début de l'intervention</li>
          <li>Utilisez Pause pour les pauses (repas, etc.)</li>
          <li>Cliquez sur Terminer à la fin de l'intervention</li>
          <li>Le temps est sauvegardé automatiquement</li>
        </ul>
      </div>
    </div>
  );
}
