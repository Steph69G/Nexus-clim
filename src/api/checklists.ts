import { supabase } from "@/lib/supabase";
import type { InstallationChecklist } from "@/types/database";

export async function fetchChecklistByMission(missionId: string): Promise<InstallationChecklist | null> {
  const { data, error } = await supabase
    .from("installation_checklists")
    .select("*")
    .eq("mission_id", missionId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data as InstallationChecklist | null;
}

export async function fetchPendingChecklists(): Promise<InstallationChecklist[]> {
  const { data, error } = await supabase
    .from("installation_checklists")
    .select("*")
    .eq("validation_status", "pending")
    .is("deleted_at", null)
    .order("completed_at", { ascending: true });

  if (error) throw error;
  return (data || []) as InstallationChecklist[];
}

export async function createChecklist(
  checklist: Omit<InstallationChecklist, "id" | "created_at" | "updated_at">
): Promise<InstallationChecklist> {
  const { data, error } = await supabase
    .from("installation_checklists")
    .insert(checklist)
    .select()
    .single();

  if (error) throw error;
  return data as InstallationChecklist;
}

export async function updateChecklist(
  id: string,
  updates: Partial<InstallationChecklist>
): Promise<void> {
  const { error } = await supabase
    .from("installation_checklists")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function validateChecklist(
  id: string,
  validatedBy: string,
  approved: boolean,
  rejectionReason?: string
): Promise<void> {
  const { error } = await supabase
    .from("installation_checklists")
    .update({
      validated_by: validatedBy,
      validated_at: new Date().toISOString(),
      validation_status: approved ? "approved" : "rejected",
      rejection_reason: rejectionReason,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function uploadChecklistPhoto(
  file: File,
  missionId: string,
  type: "before" | "after" | "installation"
): Promise<string> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth?.session?.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const path = `checklists/${missionId}/${type}/${timestamp}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("mission-photos")
    .upload(path, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("mission-photos").getPublicUrl(path);
  return data.publicUrl;
}
