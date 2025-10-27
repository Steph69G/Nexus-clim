import { supabase } from "@/lib/supabase";

export async function ensureAuthenticated() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error("[Auth Check] Session error:", error);
    throw new Error("Session error: " + error.message);
  }

  if (!session) {
    console.error("[Auth Check] No session found");
    throw new Error("No active session. Please log in.");
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error("[Auth Check] User error:", userError);
    throw new Error("User error: " + userError.message);
  }

  if (!user) {
    console.error("[Auth Check] No user found");
    throw new Error("No authenticated user. Please log in.");
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at || 0;
  const timeUntilExpiry = expiresAt - now;

  console.log("[Auth Check] ✅ Authenticated:", {
    userId: user.id,
    email: user.email,
    expiresIn: timeUntilExpiry > 0 ? `${Math.floor(timeUntilExpiry / 60)} minutes` : "EXPIRED",
    sessionValid: timeUntilExpiry > 0,
  });

  if (timeUntilExpiry <= 0) {
    console.warn("[Auth Check] Session expired, attempting refresh...");
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !refreshData.session) {
      console.error("[Auth Check] Refresh failed:", refreshError);
      throw new Error("Session expired. Please log in again.");
    }

    console.log("[Auth Check] ✅ Session refreshed successfully");
  }

  return user;
}
