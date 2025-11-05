import { supabase } from "@/lib/supabase";

const PREF_KEY = "operations.filters";

export async function fetchOperationsFiltersPref() {
  try {
    const { data, error } = await supabase.rpc("get_user_pref", { p_key: PREF_KEY });
    if (!error && data) return data as any;
  } catch {
    // ignore
  }

  const { data } = await supabase
    .from("user_preferences")
    .select("value")
    .eq("pref_key", PREF_KEY)
    .maybeSingle();
  return data?.value ?? null;
}

export async function saveOperationsFiltersPref(value: any) {
  try {
    const { error } = await supabase.rpc("set_user_pref", {
      p_key: PREF_KEY,
      p_value: value,
    });
    if (!error) return;
  } catch {
    // ignore
  }

  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) return;

  await supabase.from("user_preferences").upsert(
    {
      user_id: user.user.id,
      pref_key: PREF_KEY,
      value,
    },
    { onConflict: "user_id,pref_key" }
  );
}
