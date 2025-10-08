import { supabase } from "@/lib/supabase";
import { maskAddress, maskCoordinates, hasUserAcceptedMission } from "@/lib/addressPrivacy";

export type AdminOffer = {
  offer_id: string;
  mission_id: string;
  user_id: string;
  user_name: string | null;
  user_role: string | null;
  user_phone: string | null;
  user_city: string | null;
  title: string | null;
  type: string | null;
  status: string | null;
  city: string | null;
  address: string | null;
  masked_address: string;
  masked_lat: number | null;
  masked_lng: number | null;
  scheduled_start: string | null;
  estimated_duration_min: number | null;
  price_subcontractor_cents: number | null;
  currency: string | null;
  sent_at: string | null;
  expires_at: string | null;
  expired: boolean;
  accepted_at: string | null;
  refused_at: string | null;
  assigned_user_id: string | null;
  is_available: boolean;
  created_at: string | null;
};

/**
 * Récupère toutes les offres visibles pour un admin :
 * - Offres en cours (non acceptées)
 * - Missions assignées/bloquées dans son secteur
 */
export async function fetchAdminOffers(): Promise<AdminOffer[]> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth?.session?.user?.id;
  if (!uid) throw new Error("Non authentifié");

  // Inclure les missions "En cours", "Assignée" et "Bloqué"
  const { data: missions, error: missionsError } = await supabase
    .from("missions")
    .select(
      "id, title, type, status, city, address, lat, lng, privacy, " +
      "scheduled_start, estimated_duration_min, price_subcontractor_cents, currency, " +
      "assigned_user_id, created_at, accepted_at"
    )
    .in("status", ["En cours", "Assignée", "Bloqué"])
    .order("created_at", { ascending: false });

  if (missionsError) throw new Error(missionsError.message);

  const missionIds = (missions || []).map(m => m.id);
  const offersMap = new Map<string, any[]>();

  if (missionIds.length > 0) {
    const { data: offers, error: offersError } = await supabase
      .from("mission_offers")
      .select("id, mission_id, user_id, sent_at, expires_at, expired, accepted_at, refused_at")
      .in("mission_id", missionIds);

    if (offersError) {
      // on ne bloque pas l'affichage des missions si la jointure offres remonte une erreur légère
      console.warn("fetchAdminOffers offersError:", offersError.message);
    } else if (offers) {
      for (const offer of offers) {
        if (!offersMap.has(offer.mission_id)) offersMap.set(offer.mission_id, []);
        offersMap.get(offer.mission_id)!.push(offer);
      }
    }
  }

  const results: AdminOffer[] = (missions || []).map(mission => {
    const missionOffers = offersMap.get(mission.id) || [];
    const firstOffer = missionOffers[0];
    const isAvailable = mission.status === "En cours" && !mission.assigned_user_id;

    // masque : si le user assigné == candidat accepté, on peut lever une partie du masque
    const hasAccepted = hasUserAcceptedMission(mission.assigned_user_id, firstOffer?.user_id);

    const maskedAddress = maskAddress(
      mission.address,
      mission.city,
      "STREET_CITY",
      hasAccepted
    );

    const { lat: maskedLat, lng: maskedLng } = maskCoordinates(
      mission.lat,
      mission.lng,
      hasAccepted
    );

    return {
      offer_id: firstOffer?.id || "",
      mission_id: mission.id,
      user_id: firstOffer?.user_id || "",
      user_name:
        missionOffers.length > 1
          ? `${missionOffers.length} candidats`
          : missionOffers.length === 1
          ? "1 candidat"
          : "Aucun candidat",
      user_role: "ST/SAL",
      user_phone: null,
      user_city: null,
      title: mission.title,
      type: mission.type,
      status: mission.status,
      city: mission.city,
      address: mission.address,
      scheduled_start: mission.scheduled_start,
      estimated_duration_min: mission.estimated_duration_min,
      price_subcontractor_cents: mission.price_subcontractor_cents,
      currency: mission.currency,
      sent_at: firstOffer?.sent_at || null,
      expires_at: firstOffer?.expires_at || null,
      expired: firstOffer?.expired || false,
      accepted_at: firstOffer?.accepted_at || (mission as any).accepted_at || null,
      refused_at: firstOffer?.refused_at || null,
      assigned_user_id: mission.assigned_user_id,
      is_available: isAvailable,
      masked_address: maskedAddress,
      masked_lat: maskedLat,
      masked_lng: maskedLng,
      created_at: (mission as any).created_at || null,
    };
  });

  return results;
}

/**
 * Assigner manuellement une mission à un utilisateur (admin uniquement)
 * => met aussi le statut à "Assignée"
 */
export async function assignMissionToUser(missionId: string, userId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getSession();
  const adminId = auth?.session?.user?.id;
  if (!adminId) throw new Error("Non authentifié");

  // Vérifier que l'utilisateur courant est admin
  const { data: adminProfile, error: adminErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", adminId)
    .single();
  if (adminErr) throw new Error(adminErr.message);
  if (!adminProfile || adminProfile.role !== "admin") {
    throw new Error("Accès réservé aux administrateurs");
  }

  // Vérifier que l'utilisateur cible existe
  const { data: targetUser, error: userError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (userError) throw new Error(userError.message);
  if (!targetUser) throw new Error("Utilisateur introuvable. Cet utilisateur n'existe plus dans la base de données.");

  // Mettre à jour la mission : assignation + statut "Assignée"
  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("missions")
    .update({
      assigned_user_id: userId,
      status: "Assignée",
      accepted_at: nowIso, // optionnel : enlève si tu ne veux pas toucher à accepted_at
    })
    .eq("id", missionId);

  if (updateError) throw new Error(updateError.message);

  // Marquer l'offre comme acceptée pour cet utilisateur (si elle existe)
  const { error: offerError } = await supabase
    .from("mission_offers")
    .update({ accepted_at: nowIso })
    .eq("mission_id", missionId)
    .eq("user_id", userId);

  if (offerError) {
    // on ignore si pas d'offre correspondante (assignation manuelle)
    console.warn("assignMissionToUser offerError:", offerError.message);
  }
}

/**
 * Récupérer la liste des ST/SAL disponibles pour assignation
 */
export async function fetchAvailableSubcontractors(): Promise<{
  id: string;
  name: string;
  role: string;
  city: string | null;
  phone: string | null;
  radius_km: number | null;
  lat: number | null;
  lng: number | null;
  location_mode: string | null;
}[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, role, city, phone, radius_km, lat, lng, location_mode")
    .in("role", ["st", "sal", "ST", "SAL", "admin"])
    .order("full_name");

  if (error) throw new Error(error.message);

  return (data || []).map(profile => ({
    id: profile.user_id,
    name: profile.full_name || "Utilisateur",
    role: profile.role,
    city: profile.city,
    phone: profile.phone,
    radius_km: profile.radius_km,
    lat: profile.lat,
    lng: profile.lng,
    location_mode: profile.location_mode,
  }));
}

/**
 * S'abonner aux changements d'offres (admin)
 */
export function subscribeAdminOffers(onChange: () => void) {
  const ch = supabase
    .channel("admin-offers")
    .on("postgres_changes", { event: "*", schema: "public", table: "mission_offers" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(ch);
}
