import { supabase } from "@/lib/supabase";

export async function publishMission(missionId: string, ttlMinutes = 30, includeEmployees = false) {
  const { data, error } = await supabase.rpc("publish_mission_offers", {
    p_mission_id: missionId,
    p_ttl_minutes: ttlMinutes,
    p_include_employees: includeEmployees,
  });
  if (error) throw new Error(error.message);
  // data = nombre d'offres créées
  return data as number;
}
