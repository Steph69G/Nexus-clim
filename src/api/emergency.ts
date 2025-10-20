import { supabase } from "@/lib/supabase";
import type { EmergencyRequest } from "@/types/database";

export async function fetchEmergencyRequests(
  status?: EmergencyRequest["status"]
): Promise<EmergencyRequest[]> {
  let query = supabase
    .from("emergency_requests")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as EmergencyRequest[];
}

export async function fetchMyEmergencyRequests(clientId: string): Promise<EmergencyRequest[]> {
  const { data, error } = await supabase
    .from("emergency_requests")
    .select("*")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as EmergencyRequest[];
}

export async function createEmergencyRequest(
  request: Omit<EmergencyRequest, "id" | "created_at" | "updated_at" | "status" | "covered_by_contract" | "first_response_time_minutes" | "resolution_time_minutes">
): Promise<EmergencyRequest> {
  const { data, error } = await supabase
    .from("emergency_requests")
    .insert(request)
    .select()
    .single();

  if (error) throw error;
  return data as EmergencyRequest;
}

export async function assignEmergencyRequest(
  id: string,
  assignedTo: string
): Promise<void> {
  const { error } = await supabase
    .from("emergency_requests")
    .update({
      assigned_to: assignedTo,
      assigned_at: new Date().toISOString(),
      status: "assigned",
    })
    .eq("id", id);

  if (error) throw error;
}

export async function updateEmergencyStatus(
  id: string,
  status: EmergencyRequest["status"],
  notes?: string
): Promise<void> {
  const updates: Partial<EmergencyRequest> = { status };

  if (status === "resolved") {
    updates.resolved_at = new Date().toISOString();
  }

  if (notes) {
    updates.resolution_notes = notes;
  }

  const { error } = await supabase
    .from("emergency_requests")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function uploadEmergencyPhoto(
  file: File,
  requestId: string
): Promise<string> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth?.session?.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const path = `emergency/${requestId}/${timestamp}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("emergency-photos")
    .upload(path, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("emergency-photos").getPublicUrl(path);
  return data.publicUrl;
}
