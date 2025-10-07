import { supabase } from "@/lib/supabase";

export async function updateMissionStatus(
  id: string,
  status: "Nouveau" | "En cours" | "Bloqué" | "Terminé"
) {
  const { error } = await supabase.from("missions").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteMission(id: string) {
  const { error } = await supabase.from("missions").delete().eq("id", id);
  if (error) throw error;
}
