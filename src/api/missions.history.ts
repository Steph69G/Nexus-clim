import { supabase } from "@/lib/supabase";

export interface MissionHistory {
  mission_id: string;
  title: string;
  status: string;
  masked_address: string;
  price_subcontractor_cents: number | null;
  currency: string;
  created_at: string;
  scheduled_at: string | null;
  completed_at: string | null;
}

export interface UserMissionStats {
  total_missions: number;
  active_missions: number;
  completed_missions: number;
  total_earnings_cents: number;
}

/**
 * Récupérer l'historique des missions d'un utilisateur
 */
export async function fetchUserMissionHistory(userId: string): Promise<MissionHistory[]> {
  const { data, error } = await supabase
    .from("missions")
    .select("mission_id, title, status, masked_address, price_subcontractor_cents, currency, created_at, scheduled_at, completed_at")
    .eq("assigned_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data || [];
}

/**
 * Récupérer les statistiques d'un utilisateur
 */
export async function fetchUserMissionStats(userId: string): Promise<UserMissionStats> {
  const { data, error } = await supabase
    .from("missions")
    .select("status, price_subcontractor_cents")
    .eq("assigned_user_id", userId);

  if (error) throw new Error(error.message);

  const missions = data || [];

  const active = missions.filter(m => m.status !== "completed" && m.status !== "cancelled");
  const completed = missions.filter(m => m.status === "completed");

  const totalEarnings = completed.reduce((sum, m) => {
    return sum + (m.price_subcontractor_cents || 0);
  }, 0);

  return {
    total_missions: missions.length,
    active_missions: active.length,
    completed_missions: completed.length,
    total_earnings_cents: totalEarnings,
  };
}
