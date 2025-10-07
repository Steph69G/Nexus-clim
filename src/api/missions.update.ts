import { supabase } from "@/lib/supabase";

export type MissionPatch = Partial<{
  title: string | null;
  type: string | null;
  city: string | null;
  address: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  scheduled_start: string | null;           // ISO
  estimated_duration_min: number | null;
  price_total_cents: number | null;
  price_subcontractor_cents: number | null;
  currency: string | null;
}>;

/** Met à jour une mission si non acceptée (RLS le garantit côté DB). */
export async function updateMissionAdmin(id: string, patch: MissionPatch) {
  const { data, error } = await supabase
    .from("missions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
