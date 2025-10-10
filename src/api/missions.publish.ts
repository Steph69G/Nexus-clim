// src/api/missions.publish.ts
import { supabase } from "@/lib/supabase";
import { toCanonicalStatus } from "@/domain/missions/status";

export async function publishMission(id: string) {
  const status = toCanonicalStatus("Publiée"); // => "Publiée" NFC, sans espace parasite
  const { data, error } = await supabase
    .from("missions")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
