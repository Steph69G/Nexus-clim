// src/api/missions.map.ts
import { supabase } from "@/lib/supabase";

export type AdminMapMission = {
  id: string;
  title: string | null;
  type: string | null;
  status: "Nouveau" | "Publiée" | "Assignée" | "En cours" | "Bloqué" | "Terminé" | string | null;
  city: string | null;
  address: string | null;
  zip: string | null;
  lat: number;
  lng: number;
  description: string | null;
  scheduled_start: string | null;
  estimated_duration_min: number | null;
  price_subcontractor_cents: number | null;
  currency: string | null;

  // Attributions
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  assigned_user_phone: string | null;
  assigned_user_avatar: string | null;
};

const VIEW_COLS = [
  "id",
  "title",
  "type",
  "status",
  "city",
  "address",
  "zip",
  "lat",
  "lng",
  "description",
  "scheduled_start",
  "estimated_duration_min",
  "price_subcontractor_cents",
  "currency",
  "assigned_user_id",
  "assigned_user_name",
  "assigned_user_phone",
  "assigned_user_avatar",
].join(",");

/**
 * Source de vérité pour la carte admin :
 * - On lit la vue `v_admin_missions_map` si elle existe (recommandé)
 * - Sinon, fallback sur un SELECT depuis `missions` + enrichissement profils
 */
export async function getAdminMissionsForMap(limit = 1000): Promise<AdminMapMission[]> {
  // 1) On tente la vue — ⚠️ pas de created_at sur la vue
  const { data, error } = await supabase
    .from("v_admin_missions_map")
    .select(VIEW_COLS)
    // Tri robuste: d’abord par créneau (récent en premier), puis id pour stabiliser
    .order("scheduled_start", { ascending: false, nullsFirst: true })
    .order("id", { ascending: false })
    .limit(limit);

  if (!error && data) {
    return (data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title ?? null,
      type: r.type ?? null,
      status: r.status ?? null,
      city: r.city ?? null,
      address: r.address ?? null,
      zip: r.zip ?? null,
      lat: (r.lat ?? 0) as number,
      lng: (r.lng ?? 0) as number,
      description: r.description ?? null,
      scheduled_start: r.scheduled_start ?? null,
      estimated_duration_min: r.estimated_duration_min ?? null,
      price_subcontractor_cents: r.price_subcontractor_cents ?? null,
      currency: r.currency ?? "EUR",
      assigned_user_id: r.assigned_user_id ?? null,
      assigned_user_name: r.assigned_user_name ?? null,
      assigned_user_phone: r.assigned_user_phone ?? null,
      assigned_user_avatar: r.assigned_user_avatar ?? null,
    })) as AdminMapMission[];
  }

  // 2) Fallback: table missions + profils assignés
  const { data: missions, error: missionsError } = await supabase
    .from("missions")
    .select(
      [
        "id",
        "title",
        "type",
        "status",
        "city",
        "address",
        "zip",
        "lat",
        "lng",
        "description",
        "scheduled_start",
        "estimated_duration_min",
        "price_subcontractor_cents",
        "currency",
        "assigned_user_id",
        "created_at",
      ].join(",")
    )
    .order("created_at", { ascending: false, nullsFirst: true })
    .limit(limit);

  if (missionsError) throw missionsError;

  const assignedIds = Array.from(
    new Set((missions ?? []).map(m => m.assigned_user_id).filter(Boolean) as string[])
  );

  let profilesById: Record<string, { full_name: string | null; phone: string | null; avatar_url: string | null }> = {};
  if (assignedIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone, avatar_url")
      .in("user_id", assignedIds);

    (profs ?? []).forEach(p => {
      profilesById[p.user_id] = {
        full_name: p.full_name ?? null,
        phone: p.phone ?? null,
        avatar_url: p.avatar_url ?? null,
      };
    });
  }

  return (missions ?? []).map((m) => {
    const prof = m.assigned_user_id ? profilesById[m.assigned_user_id] : undefined;
    return {
      id: m.id,
      title: m.title ?? null,
      type: m.type ?? null,
      status: m.status ?? null,
      city: m.city ?? null,
      address: m.address ?? null,
      zip: m.zip ?? null,
      lat: (m.lat ?? 0) as number,
      lng: (m.lng ?? 0) as number,
      description: m.description ?? null,
      scheduled_start: m.scheduled_start ?? null,
      estimated_duration_min: m.estimated_duration_min ?? null,
      price_subcontractor_cents: m.price_subcontractor_cents ?? null,
      currency: m.currency ?? "EUR",
      assigned_user_id: m.assigned_user_id ?? null,
      assigned_user_name: prof?.full_name ?? null,
      assigned_user_phone: prof?.phone ?? null,
      assigned_user_avatar: prof?.avatar_url ?? null,
    } as AdminMapMission;
  });
}

/**
 * Abonnement temps-réel pour la carte admin.
 * On écoute `missions` (+ éventuellement `mission_offers` et `profiles`).
 * Retourne une fonction pour se désabonner.
 */
export function subscribeAdminMissionsMap(onChange: () => void) {
  const ch = supabase
    .channel("admin-missions-map")
    .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, onChange)
    // Décommente/ajuste si tu veux aussi réagir aux offres / profils :
    .on("postgres_changes", { event: "*", schema: "public", table: "mission_offers" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, onChange)
    .subscribe();

  return () => supabase.removeChannel(ch);
}
