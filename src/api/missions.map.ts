// src/api/missions.map.ts
import { supabase } from "@/lib/supabase";

export type AdminMapMission = {
  id: string;
  title: string | null;
  type: string | null;
  status: string | null;
  city: string | null;
  address: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  scheduled_start: string | null;
  scheduled_window_start: string | null;
  scheduled_window_end: string | null;
  estimated_duration_min: number | null;
  price_total_cents: number | null;
  price_subcontractor_cents: number | null;
  currency: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  planned_at: string | null;
  finished_at: string | null;
  invoiced_at: string | null;
  paid_at: string | null;
  closed_at: string | null;
  requires_follow_up: boolean | null;
  follow_up_notes: string | null;
  privacy: string | null;
  created_at: string | null;
  updated_at: string | null;

  client_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;

  assigned_user_id: string | null;
  assigned_user_name: string | null;
  assigned_user_avatar: string | null;
  assigned_user_phone: string | null;

  created_by_id: string | null;
  created_by_name: string | null;
};

export async function getAdminMissionsForMap(): Promise<AdminMapMission[]> {
  const { data, error } = await supabase
    .from("v_nexus_missions_full_admin")
    .select(
      [
        "id","title","type","status","city","address","zip","lat","lng",
        "description","scheduled_start","scheduled_window_start","scheduled_window_end",
        "estimated_duration_min","price_total_cents","price_subcontractor_cents","currency",
        "accepted_at","expires_at","planned_at","finished_at","invoiced_at","paid_at","closed_at",
        "requires_follow_up","follow_up_notes","privacy","created_at","updated_at",
        "client_id","client_name","client_phone","client_email",
        "assigned_user_id","assigned_user_name","assigned_user_avatar","assigned_user_phone",
        "created_by_id","created_by_name"
      ].join(",")
    );

  if (error) throw error;
  return (data ?? []) as AdminMapMission[];
}
