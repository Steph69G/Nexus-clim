import { supabase } from "@/lib/supabase";

export type AdminMapMission = {
  id: string;
  title: string | null;
  status: string | null;
  type: string | null;
  lat: number;
  lng: number;
  scheduled_start: string | null;
  estimated_duration_min: number | null;
  price_subcontractor_cents: number | null;
  currency: string | null;
  description: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  assigned_user_avatar: string | null;
  assigned_user_phone: string | null;
};

export async function getAdminMissionsForMap(): Promise<AdminMapMission[]> {
  const { data, error } = await supabase
    .from("v_admin_missions_map")
    .select("*");

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    title: r.title ?? "Mission",
    status: r.status ?? "Nouveau",
    type: r.type ?? null,
    lat: Number(r.lat),
    lng: Number(r.lng),
    scheduled_start: r.scheduled_start ?? null,
    estimated_duration_min: r.estimated_duration_min ?? null,
    price_subcontractor_cents: r.price_subcontractor_cents ?? null,
    currency: r.currency ?? null,
    description: r.description ?? null,
    address: r.address ?? null,
    zip: r.zip ?? null,
    city: r.city ?? null,
    assigned_user_id: r.assigned_user_id ?? null,
    assigned_user_name: r.assigned_user_name ?? null,
    assigned_user_avatar: r.assigned_user_avatar ?? null,
    assigned_user_phone: r.assigned_user_phone ?? null,
  }));
}

export function subscribeAdminMissionsMap(onChange: () => void) {
  const ch = supabase
    .channel("admin-missions-map")
    .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(ch);
}
