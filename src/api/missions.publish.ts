import { supabase } from "@/lib/supabase";

/**
 * Publie (ou re-publie) une mission.
 * Logique: status -> "Publiée" (visible, en recherche d’intervenant).
 * Ne touche PAS à assignee_id ni aux autres champs.
 */
export async function publishMission(id: string) {
  const { data, error } = await supabase
    .from("missions")
    .update({ status: "Publiée" }) // 👈 valeur autorisée par ta contrainte missions_status_check
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
