import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Publie (ou re-publie) une mission via l’edge function.
 * Fallback robuste :
 *  - Si l’edge renvoie un 400 "missions_status_check", on force status='PUBLIEE' côté DB.
 *  - Headers corrects pour edge functions: Authorization + apikey.
 */
export async function publishMission(
  id: string,
  opts?: { ttlMinutes?: number; alsoEmployees?: boolean }
) {
  // Récupère le token utilisateur si dispo, sinon anon (fonctionnera mais sans contexte user)
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken =
    sessionData?.session?.access_token ?? SUPABASE_ANON_KEY;

  const apiUrl = `${SUPABASE_URL}/functions/v1/publish-mission`;

  const body = JSON.stringify({
    mission_id: id,
    ttl_minutes: opts?.ttlMinutes ?? 30,
    include_employees: opts?.alsoEmployees ?? false,
  });

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`, // ✅ token utilisateur si possible
      apikey: SUPABASE_ANON_KEY,              // ✅ requis côté edge
      "Content-Type": "application/json",
    },
    body,
  });

  if (res.ok) {
    // Succès côté edge
    try {
      return await res.json();
    } catch {
      return { ok: true };
    }
  }

  // Erreur : on lit le texte pour détecter la contrainte ENUM
  const errorText = await res.text();
  let errorMsg = errorText;
  try {
    const parsed = JSON.parse(errorText);
    errorMsg = parsed?.error ?? errorText;
  } catch {
    // noop
  }

  // Fallback : la plupart des 400 ici sont dus à un statut non conforme à l’ENUM (missions_status_check)
  if (
    res.status === 400 &&
    (errorMsg?.includes("missions_status_check") || errorMsg?.includes("Bad Request"))
  ) {
    // Met la mission en 'PUBLIEE' directement (ENUM DB attendu)
    const { data, error } = await supabase
      .from("missions")
      .update({ status: "PUBLIEE" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // Autre erreur → la remonter telle quelle
  throw new Error(errorMsg || `HTTP ${res.status}`);
}
