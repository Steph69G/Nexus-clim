// src/api/missions.schedule.ts
import { supabase } from "@/lib/supabase";

/** Enregistre un créneau (ISO) sur une mission */
export async function setMissionSchedule(missionId: string, scheduledStartISO: string | null) {
  const { error } = await supabase
    .from("missions")
    .update({ scheduled_start: scheduledStartISO })
    .eq("id", missionId);

  if (error) throw new Error(error.message);
}
