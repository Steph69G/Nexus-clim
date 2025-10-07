import { supabase } from "@/lib/supabase";

import { MissionStatus } from "@/types/mission";

export type MissionInsert = {
  title: string;
  status?: MissionStatus;
  client_name?: string | null;
  city?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  scheduled_start?: string | null; // ISO string
};

export type Mission = MissionInsert & {
  id: string;
  created_at: string | null;
  updated_at: string | null;
};

export async function createMission(input: MissionInsert): Promise<Mission> {
  const payload = {
    title: input.title,
    status: input.status ?? "BROUILLON",
    client_name: input.client_name ?? null,
    city: input.city ?? null,
    address: input.address ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    scheduled_start: input.scheduled_start ?? null,
  };

  const { data, error } = await supabase
    .from("missions")
    .insert(payload)
    .select("id, title, status, client_name, city, address, lat, lng, scheduled_start, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as Mission;
}