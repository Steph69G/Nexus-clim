import { supabase } from "@/lib/supabase";
import { maskAddress, maskCoordinates, hasUserAcceptedMission } from "@/lib/addressPrivacy";

export type SubcontractorOffer = {
  offer_id: string;
  mission_id: string;
  title: string | null;
  type: string | null;
  status: string | null;
  city: string | null;
  address: string | null;           // Adresse originale (pour usage interne)
  masked_address: string;           // Adresse masquée pour affichage
  masked_lat: number | null;        // Coordonnées masquées
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
  is_mine: boolean; // true si j'ai accepté cette mission
};

/**
 * Récupère les offres visibles pour le sous-traitant connecté :
 * 1. Offres reçues non acceptées par personne (disponibles)
 * 2. Offres que j'ai acceptées (mes missions)
 */
export async function fetchSubcontractorOffers(): Promise<SubcontractorOffer[]> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth?.session?.user?.id;
  if (!uid) throw new Error("Non authentifié");

  // Récupérer toutes mes offres (acceptées ou non)
  const { data: myOffers, error: myOffersError } = await supabase
    .from("mission_offers")
    .select(`
      id,
      mission_id,
      sent_at,
      expires_at,
      expired,
      accepted_at,
      refused_at,
      missions!inner(
        id,
        title,
        type,
        status,
        city,
        address,
        lat,
        lng,
        privacy,
        scheduled_start,
        estimated_duration_min,
        price_subcontractor_cents,
        currency,
        assigned_user_id
      )
    `)
    .eq("user_id", uid)
    .order("sent_at", { ascending: false });

  if (myOffersError) throw new Error(myOffersError.message);

  const results: SubcontractorOffer[] = [];

  for (const offer of myOffers || []) {
    const mission = offer.missions;

    // Inclure si :
    // 1. Mission publiée ET non assignée à quelqu'un (disponible)
    // 2. OU mission que j'ai acceptée (assignée à moi)
    const isAvailable = mission.status === "PUBLIÉE" && !mission.assigned_user_id;
    const isMine = mission.assigned_user_id === uid;

    if (isAvailable || isMine) {
      // Déterminer si l'utilisateur a accepté cette mission
      const hasAccepted = hasUserAcceptedMission(mission.assigned_user_id, uid);
      
      // Masquer l'adresse et les coordonnées selon les règles de confidentialité
      const maskedAddress = maskAddress(
        mission.address,
        mission.city,
        mission.privacy || 'STREET_CITY',
        hasAccepted
      );
      
      const { lat: maskedLat, lng: maskedLng } = maskCoordinates(
        mission.lat,
        mission.lng,
        hasAccepted
      );

      results.push({
        offer_id: offer.id,
        mission_id: offer.mission_id,
        title: mission.title,
        type: mission.type,
        status: mission.status,
        city: mission.city,
        address: mission.address,
        masked_address: maskedAddress,
        masked_lat: maskedLat,
        masked_lng: maskedLng,
        scheduled_start: mission.scheduled_start,
        estimated_duration_min: mission.estimated_duration_min,
        price_subcontractor_cents: mission.price_subcontractor_cents,
        currency: mission.currency,
        sent_at: offer.sent_at,
        expires_at: offer.expires_at,
        expired: offer.expired,
        accepted_at: offer.accepted_at,
        refused_at: offer.refused_at,
        is_mine: isMine,
      });
    }
  }

  return results;
}

/**
 * Accepter une offre de mission
 */
export async function acceptSubcontractorOffer(missionId: string): Promise<"OK" | string> {
  const { data, error } = await supabase.rpc("accept_mission_offer", {
    p_mission_id: missionId,
  });
  
  if (error) throw new Error(error.message);
  return (data as string) ?? "OK";
}

/**
 * S'abonner aux changements d'offres
 */
export function subscribeSubcontractorOffers(onChange: () => void) {
  const ch = supabase
    .channel("subcontractor-offers")
    .on("postgres_changes", { event: "*", schema: "public", table: "mission_offers" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(ch);
}