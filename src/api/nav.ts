import { supabase } from "@/lib/supabase";

export async function setRoleNavVisibility(role: string, navKey: string, visible: boolean) {
  return supabase
    .from("role_nav_visibility")
    .upsert({ role, nav_key: navKey, visible }, { onConflict: "role,nav_key" });
}

export async function setUserNavPreference(userId: string, navKey: string, visible: boolean) {
  return supabase
    .from("nav_preferences")
    .upsert({ user_id: userId, nav_key: navKey, visible }, { onConflict: "user_id,nav_key" });
}
