import { supabase } from "@/lib/supabase";
import { mapDbRoleToUi, type UiRole } from "@/lib/roles";

export type Profile = {
  id: string;                 // miroir de user_id pour la compat UI
  user_id?: string | null;    // valeur brute si besoin
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: UiRole | null;
  city: string | null;
  address: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  radius_km: number | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
};

/**
 * Récupère le profil de l'utilisateur courant.
 * - PAS d'alias côté SQL (évite l'erreur 400 "profiles.id n'existe pas")
 * - On mappe en JS: id = user_id
 */
export async function getMyProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth?.session?.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email, full_name, phone, role, city, address, zip, lat, lng, radius_km, avatar_url, created_at, updated_at")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) throw error;

  // 🔍 DEBUG : Afficher le rôle brut de la DB
  console.log("getMyProfile DEBUG:", {
    raw_role_from_db: data?.role,
    mapped_role: data ? mapDbRoleToUi(data.role) : null,
    full_data: data
  });

  return data
    ? ({
        id: data.user_id as string,
        user_id: data.user_id as string,
        email: data.email ?? null,
        full_name: data.full_name ?? null,
        phone: data.phone ?? null,
        role: mapDbRoleToUi(data.role) ?? null,
        city: data.city ?? null,
        address: data.address ?? null,
        zip: data.zip ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        radius_km: data.radius_km ?? null,
        avatar_url: data.avatar_url ?? null,
        created_at: data.created_at ?? undefined,
        updated_at: data.updated_at ?? undefined,
      } as Profile)
    : null;
}

/**
 * Mets à jour (ou crée) le profil de l'utilisateur courant.
 * - Envoie toujours user_id (PK réelle)
 */
export async function upsertMyProfile(patch: Partial<Profile>): Promise<void> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth?.session?.user?.id;
  const email = auth?.session?.user?.email ?? null;
  if (!uid) throw new Error("Not authenticated");

  // Convertir le rôle UI vers le rôle DB si fourni
  let dbRole = undefined;
  if (patch.role) {
    const { mapUiRoleToDb } = await import("@/lib/roles");
    dbRole = mapUiRoleToDb(patch.role);
  }
  
  const payload: any = {
    user_id: uid,
    email,
  };

  // N'ajouter que les champs présents dans le patch pour éviter d'écraser les valeurs existantes
  if (patch.full_name !== undefined) payload.full_name = patch.full_name;
  if (patch.phone !== undefined) payload.phone = patch.phone;
  if (dbRole !== undefined) payload.role = dbRole;
  if (patch.city !== undefined) payload.city = patch.city;
  if (patch.address !== undefined) payload.address = patch.address;
  if (patch.zip !== undefined) payload.zip = patch.zip;
  if (patch.lat !== undefined) payload.lat = patch.lat;
  if (patch.lng !== undefined) payload.lng = patch.lng;
  if (patch.radius_km !== undefined) payload.radius_km = patch.radius_km;
  if (patch.avatar_url !== undefined) payload.avatar_url = patch.avatar_url;

  const { error } = await supabase.from("profiles").upsert(payload);
  if (error) throw error;
}

/**
 * Upload un avatar dans le bucket public "avatars" et renvoie l'URL publique.
 */
export async function uploadAvatar(file: File): Promise<string> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth?.session?.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${uid}/avatar.${ext}`;

  const { error: upErr } = await supabase
    .storage
    .from("avatars")
    .upload(path, file, { upsert: true });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
