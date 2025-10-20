import { supabase } from "@/lib/supabase";
import type { ClientPortalDocument } from "@/types/database";

export async function fetchMyDocuments(clientId: string): Promise<ClientPortalDocument[]> {
  const { data, error } = await supabase
    .from("client_portal_documents")
    .select("*")
    .eq("client_id", clientId)
    .eq("visible_to_client", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as ClientPortalDocument[];
}

export async function fetchDocumentsByType(
  clientId: string,
  documentType: ClientPortalDocument["document_type"]
): Promise<ClientPortalDocument[]> {
  const { data, error } = await supabase
    .from("client_portal_documents")
    .select("*")
    .eq("client_id", clientId)
    .eq("document_type", documentType)
    .eq("visible_to_client", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as ClientPortalDocument[];
}

export async function fetchDocumentsByMission(missionId: string): Promise<ClientPortalDocument[]> {
  const { data, error } = await supabase
    .from("client_portal_documents")
    .select("*")
    .eq("related_mission_id", missionId)
    .eq("visible_to_client", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as ClientPortalDocument[];
}

export async function markDocumentViewed(documentId: string): Promise<void> {
  const { data: currentDoc } = await supabase
    .from("client_portal_documents")
    .select("viewed_by_client")
    .eq("id", documentId)
    .single();

  const isFirstView = !currentDoc?.viewed_by_client;

  const updates: Partial<ClientPortalDocument> = {
    viewed_by_client: true,
    last_viewed_at: new Date().toISOString(),
  };

  if (isFirstView) {
    updates.first_viewed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("client_portal_documents")
    .update(updates)
    .eq("id", documentId);

  if (error) throw error;
}

export async function incrementDocumentDownload(documentId: string): Promise<void> {
  const { data: currentDoc } = await supabase
    .from("client_portal_documents")
    .select("download_count")
    .eq("id", documentId)
    .single();

  const { error } = await supabase
    .from("client_portal_documents")
    .update({
      download_count: (currentDoc?.download_count || 0) + 1,
    })
    .eq("id", documentId);

  if (error) throw error;
}

export async function uploadClientDocument(
  file: File,
  clientId: string,
  documentType: ClientPortalDocument["document_type"],
  metadata?: {
    document_name?: string;
    related_mission_id?: string;
    related_contract_id?: string;
    tags?: string[];
  }
): Promise<ClientPortalDocument> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth?.session?.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const timestamp = Date.now();
  const path = `documents/${clientId}/${documentType}/${timestamp}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("client-documents")
    .upload(path, file);

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("client-documents")
    .getPublicUrl(path);

  const { data, error } = await supabase
    .from("client_portal_documents")
    .insert({
      client_id: clientId,
      document_type: documentType,
      document_name: metadata?.document_name || file.name,
      document_url: urlData.publicUrl,
      file_size_bytes: file.size,
      file_type: file.type,
      related_mission_id: metadata?.related_mission_id,
      related_contract_id: metadata?.related_contract_id,
      tags: metadata?.tags || [],
      visible_to_client: true,
      uploaded_by: uid,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ClientPortalDocument;
}
