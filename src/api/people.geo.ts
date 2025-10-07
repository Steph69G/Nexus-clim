import { supabase } from "@/lib/supabase";

export type PersonLoc = {
  user_id: string;
  lat: number;
  lng: number;
  updated_at: string;
};

export type EmployeeLocation = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  display_mode: "address" | "gps" | "hidden";
  share_location: boolean;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_updated_at: string | null;
};

export async function fetchTechnicians(): Promise<PersonLoc[]> {
  const { data, error } = await supabase
    .from("person_locations")
    .select("user_id,lat,lng,updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    user_id: String(r.user_id),
    lat: Number(r.lat),
    lng: Number(r.lng),
    updated_at: r.updated_at,
  }));
}

export async function fetchEmployeesForMap(): Promise<EmployeeLocation[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      user_id,
      full_name,
      email,
      role,
      display_mode,
      share_location,
      address,
      city,
      lat,
      lng
    `)
    .in("role", ["tech", "st", "sal"])
    .neq("display_mode", "hidden");

  if (error) throw error;

  const employees: EmployeeLocation[] = [];

  for (const profile of data || []) {
    let gpsLat: number | null = null;
    let gpsLng: number | null = null;
    let gpsUpdatedAt: string | null = null;

    if (profile.display_mode === "gps" && profile.share_location) {
      const { data: gpsData } = await supabase
        .from("person_locations")
        .select("lat, lng, updated_at")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      if (gpsData) {
        gpsLat = gpsData.lat;
        gpsLng = gpsData.lng;
        gpsUpdatedAt = gpsData.updated_at;
      }
    }

    employees.push({
      user_id: profile.user_id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      display_mode: (profile.display_mode || "address") as "address" | "gps" | "hidden",
      share_location: profile.share_location || false,
      address: profile.address,
      city: profile.city,
      lat: profile.lat,
      lng: profile.lng,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
      gps_updated_at: gpsUpdatedAt,
    });
  }

  return employees;
}

/** Upsert la position pour l’utilisateur courant (doit être authentifié) */
export async function upsertMyLocation(lat: number, lng: number) {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData?.session?.user?.id;
  if (!uid) return; // pas connecté → on ignore

  const { error } = await supabase
    .from("person_locations")
    .upsert({ user_id: uid, lat, lng, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) throw error;
}

export function subscribeTechnicians(onChange: () => void) {
  const ch = supabase
    .channel("person-locs")
    .on("postgres_changes", { event: "*", schema: "public", table: "person_locations" }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(ch);
}
