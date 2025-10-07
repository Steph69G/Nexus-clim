// src/api/missions.setStatus.ts
import { supabase } from "@/lib/supabase";

export type SetStatusPayload = {
  missionId: string;
  toStatus: "BROUILLON" | "PUBLIEE" | "ACCEPTEE" | "PLANIFIEE" |
            "EN_ROUTE" | "EN_INTERVENTION" | "TERMINEE" |
            "FACTURABLE" | "FACTUREE" | "PAYEE" | "CLOTUREE" | "ANNULEE";
  note?: string;
  context?: Record<string, any>;
};

export async function setMissionStatus(payload: SetStatusPayload) {
  const { missionId, toStatus, note, context } = payload;

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Non authentifié");

  const { error } = await supabase.rpc("mission_set_status", {
    p_mission_id: missionId,
    p_to: toStatus,
    p_actor: user.id,
    p_via: "MANUAL",
    p_note: note ?? null,
    p_context: context ?? {}
  });

  if (error) throw error;
  return { ok: true };
}
