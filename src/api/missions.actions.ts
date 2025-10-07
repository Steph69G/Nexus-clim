// src/api/missions.actions.ts
import { supabase } from "@/supabase";

export async function publishMission(
  missionId: string,
  ttlMinutes = 30,
  includeEmployees = false
) {
  const { data, error } = await supabase.rpc("publish_mission_offers", {
    include_employees: includeEmployees, // <-- noms EXACTS attendus par la RPC
    mission_id: missionId,
    ttl_minutes: ttlMinutes,
  });
  if (error) throw error;
  return data;
}
