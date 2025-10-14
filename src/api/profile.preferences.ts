// src/api/profile.preferences.ts
import { supabase } from "@/lib/supabase";

type Prefs = {
  radius_km: number | null;
  preferred_types: string[] | null;
};

export async function getMyPreferences(): Promise<Prefs> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth?.session?.user?.id;
  if (!uid) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("profiles")
    .select("radius_km, preferred_types")
    .eq("user_id", uid)
    .single();

  if (error) throw new Error(error.message);
  return {
    radius_km: data?.radius_km ?? null,
    preferred_types: (data?.preferred_types as string[] | null) ?? [],
  };
}

export async function saveMyPreferences(input: Prefs) {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth?.session?.user?.id;
  if (!uid) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("profiles")
    .update({
      radius_km: input.radius_km,
      preferred_types: input.preferred_types ?? [],
    })
    .eq("user_id", uid);

  if (error) throw new Error(error.message);
}
