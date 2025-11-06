import { supabase } from "@/lib/supabase";

const PREF_KEY = "operations.filters";

function is404(err: any) {
  return !!err && (err.code === "PGRST202" || err.code === "PGRST205");
}

export async function fetchOperationsFiltersPref() {
  // Try RPC
  try {
    const { data, error } = await supabase.rpc("get_user_pref", { p_key: PREF_KEY });
    if (!error) return data ?? null;
    if (!is404(error)) console.warn("[prefs] get_user_pref error:", error);
  } catch (e) {
    /* ignore réseau */
  }

  // Fallback SELECT
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("value")
      .eq("pref_key", PREF_KEY)
      .maybeSingle();

    if (!error) return data?.value ?? null;
    if (!is404(error)) console.warn("[prefs] table select error:", error);
  } catch (e) {
    /* ignore */
  }

  // Non configuré → pas d’erreur, on retourne null
  return null;
}

export async function saveOperationsFiltersPref(value: any) {
  // Try RPC
  try {
    const { error } = await supabase.rpc("set_user_pref", {
      p_key: PREF_KEY,
      p_value: value,
    });
    if (!error) return;
    if (!is404(error)) console.warn("[prefs] set_user_pref error:", error);
  } catch (e) {
    /* ignore */
  }

  // Fallback UPSERT direct
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;

    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: user.user.id,
        pref_key: PREF_KEY,
        value,
      },
      { onConflict: "user_id,pref_key" }
    );
    if (error && !is404(error)) console.warn("[prefs] upsert error:", error);
  } catch (e) {
    /* ignore */
  }
}
