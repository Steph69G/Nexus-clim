import { supabase } from "@/lib/supabase";
import type { SubcontractorCertification } from "@/types/database";

export async function fetchMyCertification(): Promise<SubcontractorCertification | null> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth?.session?.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("subcontractor_certifications")
    .select("*")
    .eq("user_id", uid)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data as SubcontractorCertification | null;
}

export async function fetchAllCertifications(): Promise<SubcontractorCertification[]> {
  const { data, error } = await supabase
    .from("subcontractor_certifications")
    .select("*")
    .is("deleted_at", null)
    .order("status", { ascending: true })
    .order("last_checked_at", { ascending: false });

  if (error) throw error;
  return (data || []) as SubcontractorCertification[];
}

export async function fetchExpiringCertifications(
  daysAhead = 60
): Promise<SubcontractorCertification[]> {
  const { data, error } = await supabase
    .from("subcontractor_certifications")
    .select("*")
    .in("status", ["expiring_soon", "expired"])
    .is("deleted_at", null)
    .order("status", { ascending: false });

  if (error) throw error;
  return (data || []) as SubcontractorCertification[];
}

export async function upsertCertification(
  certification: Partial<SubcontractorCertification>
): Promise<SubcontractorCertification> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth?.session?.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const existing = await fetchMyCertification();

  if (existing) {
    const { data, error } = await supabase
      .from("subcontractor_certifications")
      .update(certification)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as SubcontractorCertification;
  } else {
    const { data, error } = await supabase
      .from("subcontractor_certifications")
      .insert({
        ...certification,
        user_id: uid,
        created_by: uid,
      })
      .select()
      .single();

    if (error) throw error;
    return data as SubcontractorCertification;
  }
}

export async function uploadCertificationDocument(
  file: File,
  documentType: "rge" | "qualibois" | "qualipac" | "decennale" | "rc_pro"
): Promise<string> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth?.session?.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const timestamp = Date.now();
  const path = `certifications/${uid}/${documentType}_${timestamp}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("certifications")
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("certifications").getPublicUrl(path);
  return data.publicUrl;
}
