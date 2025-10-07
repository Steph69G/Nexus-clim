import { supabase } from "@/lib/supabase";

export type OfferInboxRow = {
  offer_id: string;
  mission_id: string;
  sent_at: string | null;
  expires_at: string | null;
  expired: boolean;
  accepted_at: string | null;
  refused_at: string | null;
  title: string | null;
  type: string | null;
  status: string | null;
  city: string | null;
  scheduled_start: string | null;
  estimated_duration_min: number | null;
  price_subcontractor_cents: number | null;
  currency: string | null;
};

export async function fetchMyOffers(): Promise<OfferInboxRow[]> {
  const { data, error } = await supabase
    .from("offers_inbox")
    .select("*")
    .order("sent_at", { ascending: false });
  if (error) throw new Error(error.message);

  // Exclure les offres déjà acceptées (elles sont dans "Mes missions")
  const filtered = (data ?? []).filter(offer => !offer.accepted_at);

  return filtered as OfferInboxRow[];
}

export type AcceptedMissionDetails = {
  mission_id: string;
  title: string;
  address: string;
  city: string;
  scheduled_start: string | null;
  client_name: string | null;
  client_phone: string | null;
  status: string;
};

export async function acceptOffer(missionId: string): Promise<"OK" | string> {
  const { data, error } = await supabase.rpc("accept_mission_offer", {
    p_mission_id: missionId,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? "OK";
}

export async function getMissionDetails(missionId: string): Promise<AcceptedMissionDetails | null> {
  const { data, error } = await supabase
    .from("missions")
    .select("id, title, address, city, scheduled_start, client_name, client_phone, status")
    .eq("id", missionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    mission_id: data.id,
    title: data.title,
    address: data.address,
    city: data.city,
    scheduled_start: data.scheduled_start,
    client_name: data.client_name,
    client_phone: data.client_phone,
    status: data.status,
  };
}
