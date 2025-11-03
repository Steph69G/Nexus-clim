// src/api/missions.geo.ts
import { supabase } from "@/lib/supabase";
import type { UiRole } from "@/lib/roles";

export type MissionPoint = {
  id: string;
  title: string;
  status: string;
  lat: number;
  lng: number;
  city: string | null;
  address: string | null;
  type: string | null;
  scheduled_start: string | null;
  estimated_duration_min: number | null;
  price_subcontractor_cents: number | null;
  currency: string | null;
  description: string | null;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
};

export async function fetchMissionPoints(role?: UiRole, userId?: string): Promise<MissionPoint[]> {
  const { data, error } = await supabase.rpc("missions_map_secure");

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    title: r.title ?? "Mission",
    status: r.status ?? "Nouveau",
    lat: Number(r.lat),
    lng: Number(r.lng),
    city: r.city ?? null,
    address: r.address ?? null,
    type: r.type ?? null,
    scheduled_start: r.scheduled_start ?? null,
    estimated_duration_min: r.estimated_duration_min ?? null,
    price_subcontractor_cents: r.price_subcontractor_cents ?? null,
    currency: r.currency ?? null,
    description: r.description ?? null,
    assigned_user_id: r.assigned_user_id ?? null,
    assigned_user_name: null,
  }));
}

export function subscribeMissionPoints(onChange: () => void) {
  const ch = supabase
    .channel("missions-geo")
    .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(ch);
}
