// src/api/profile.preferences.ts
import { supabase } from "@/lib/supabase";

// Lit les préférences depuis la table `profiles`.
// La carte doit utiliser `profiles.radius_km`.
export async function getMyPreferences(): Promise<{
  radius_km: number | null;
  preferred_types: string[];
}> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) throw new Error("Utilisateur non connecté");

  const { data, error } = await supabase
    .from("profiles")
    .select("radius_km, preferred_types")
    .eq("user_id", auth.user.id)
    .single();

  if (error) throw error;

  return {
    radius_km: data?.radius_km ?? null,
    preferred_types: data?.preferred_types ?? [],
  };
}

// Écrit dans `profiles.radius_km` (source unique de vérité pour la carte)
// et dans `profiles.preferred_types`.
export async function saveMyPreferences(payload: {
  radius_km: number | null;
  preferred_types: string[];
}): Promise<void> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) throw new Error("Utilisateur non connecté");

  const update = {
    radius_km: payload.radius_km, // ← clé lue par la carte
    // si vide, on passe null pour éviter du bruit côté SQL
    preferred_types:
      payload.preferred_types && payload.preferred_types.length > 0
        ? payload.preferred_types
        : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("user_id", auth.user.id);

  if (error) throw error;
}
