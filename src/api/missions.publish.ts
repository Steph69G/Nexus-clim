// src/api/missions.publish.ts
import { supabase } from "@/lib/supabase";

export async function publishMission(
  id: string,
  opts?: { ttlMinutes?: number; alsoEmployees?: boolean } // gardé pour compat compat
) {
  // publication directe : statut ENUM exact attendu par la BDD
  const { data, error } = await supabase
    .from("missions")
    .update({ status: "PUBLIEE" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
