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
  const { data: auth } = await supabase.auth.getSession();
  const currentUserId = userId ?? auth?.session?.user?.id;

  let query = supabase
    .from("missions")
    .select(`
      id,
      title,
      status,
      lat,
      lng,
      city,
      address,
      type,
      scheduled_start,
      estimated_duration_min,
      price_subcontractor_cents,
      currency,
      description,
      assigned_user_id,
      assigned_user:profiles!missions_assigned_user_id_fkey(full_name)
    `)
    .not("lat", "is", null)
    .not("lng", "is", null);

  const { data, error } = await query;

  if (error) throw error;

  let filteredData = data ?? [];

  if ((role === "st" || role === "tech") && currentUserId) {
    filteredData = filteredData.filter((m: any) => {
      if (m.status === "BROUILLON" || m.status === "NOUVEAU") return false;
      return m.status === "PUBLIEE" || m.assigned_user_id === currentUserId;
    });
  }

  return filteredData.map((r: any) => ({
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
    assigned_user_name: r.assigned_user?.full_name ?? null,
  }));
}

export function subscribeMissionPoints(onChange: () => void) {
  const ch = supabase
    .channel("missions-geo")
    .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(ch);
}
