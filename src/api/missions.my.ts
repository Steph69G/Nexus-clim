import { supabase } from "@/lib/supabase";

export type MyMission = {
  id: string;
  title: string | null;
  type: string | null;
  status: string | null;
  city: string | null;
  address: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  client_name: string | null;
  description: string | null;
  scheduled_start: string | null;
  estimated_duration_min: number | null;
  price_subcontractor_cents: number | null;
  currency: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function fetchMyMissions(): Promise<MyMission[]> {
  const { data, error } = await supabase
    .from("my_missions")
    .select("*")
    .order("scheduled_start", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as MyMission[];
}

/** Recharge quand une mission change (insert/update/delete). */
export function subscribeMyMissions(onChange: () => void) {
  const ch = supabase
    .channel("my-missions-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(ch);
}
