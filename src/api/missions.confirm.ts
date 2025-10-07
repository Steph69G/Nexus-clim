import { supabase } from "@/lib/supabase";

export async function confirmMissionAppointment(missionId: string): Promise<void> {
  const { error } = await supabase
    .from("missions")
    .update({ status: "CONFIRMÉE" })
    .eq("id", missionId);

  if (error) throw new Error(error.message);
}

export async function updateMissionAppointment(
  missionId: string,
  scheduledStart: string
): Promise<void> {
  const { error } = await supabase
    .from("missions")
    .update({
      scheduled_start: scheduledStart,
      status: "CONFIRMÉE"
    })
    .eq("id", missionId);

  if (error) throw new Error(error.message);
}
