import { supabase } from "@/lib/supabase";

export interface ClientSearchResult {
  id: string;
  source: "user_account" | "mission_history";
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  company_name?: string | null;
  siret?: string | null;
}

export async function searchClients(query: string): Promise<ClientSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchTerm = query.trim().toLowerCase();
  const results: ClientSearchResult[] = [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const [userClientsData, missionHistoryData] = await Promise.all([
      searchUserClients(searchTerm),
      searchMissionHistory(searchTerm),
    ]);

    results.push(...userClientsData);
    results.push(...missionHistoryData);

    const uniqueResults = deduplicateResults(results);
    return uniqueResults.slice(0, 10);
  } catch (error: any) {
    console.error("Erreur lors de la recherche de clients:", error);
    throw new Error(error.message || "Erreur lors de la recherche de clients");
  }
}

async function searchUserClients(searchTerm: string): Promise<ClientSearchResult[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, full_name, email, phone, address, zip")
    .eq("role", "client")
    .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
    .limit(5);

  if (profilesError) {
    console.error("Erreur searchUserClients profiles:", profilesError);
    return [];
  }

  if (!profiles || profiles.length === 0) return [];

  const userIds = profiles.map(p => p.user_id);

  const { data: userClients, error: clientsError } = await supabase
    .from("user_clients")
    .select("user_id, company_name, siret, home_address, home_zip, home_city")
    .in("user_id", userIds);

  if (clientsError) {
    console.error("Erreur searchUserClients user_clients:", clientsError);
  }

  const clientsMap = new Map(
    (userClients || []).map(c => [c.user_id, c])
  );

  return profiles.map((profile) => {
    const userClient = clientsMap.get(profile.user_id);
    return {
      id: profile.user_id,
      source: "user_account" as const,
      name: profile.full_name || "",
      phone: profile.phone,
      email: profile.email,
      address: userClient?.home_address || profile.address,
      zip: userClient?.home_zip || profile.zip,
      city: userClient?.home_city || null,
      lat: null,
      lng: null,
      company_name: userClient?.company_name,
      siret: userClient?.siret,
    };
  });
}

async function searchMissionHistory(searchTerm: string): Promise<ClientSearchResult[]> {
  const { data: missions, error } = await supabase
    .from("missions")
    .select("id, client_name, client_phone, client_email, address, zip, lat, lng")
    .not("client_name", "is", null)
    .or(`client_name.ilike.%${searchTerm}%,client_phone.ilike.%${searchTerm}%,client_email.ilike.%${searchTerm}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Erreur searchMissionHistory:", error);
    return [];
  }

  if (!missions) return [];

  const uniqueClients = new Map<string, ClientSearchResult>();

  for (const mission of missions) {
    const key = `${mission.client_name}-${mission.client_phone || mission.client_email}`.toLowerCase();

    if (!uniqueClients.has(key)) {
      uniqueClients.set(key, {
        id: mission.id,
        source: "mission_history" as const,
        name: mission.client_name || "",
        phone: mission.client_phone,
        email: mission.client_email,
        address: mission.address,
        zip: mission.zip,
        city: null,
        lat: mission.lat,
        lng: mission.lng,
      });
    }
  }

  return Array.from(uniqueClients.values()).slice(0, 5);
}

function deduplicateResults(results: ClientSearchResult[]): ClientSearchResult[] {
  const seen = new Map<string, ClientSearchResult>();

  for (const result of results) {
    const key = createDeduplicationKey(result);

    if (!seen.has(key)) {
      seen.set(key, result);
    } else {
      const existing = seen.get(key)!;
      if (result.source === "user_account" && existing.source === "mission_history") {
        seen.set(key, result);
      }
    }
  }

  return Array.from(seen.values());
}

function createDeduplicationKey(result: ClientSearchResult): string {
  const namePart = result.name.toLowerCase().trim();
  const phonePart = result.phone?.replace(/\s/g, "") || "";
  const emailPart = result.email?.toLowerCase().trim() || "";

  return `${namePart}-${phonePart}-${emailPart}`;
}
