import { supabase } from "@/lib/supabase";
import type { ClientSatisfactionSurvey } from "@/types/database";

export async function fetchSurveyByMission(missionId: string): Promise<ClientSatisfactionSurvey | null> {
  const { data, error } = await supabase
    .from("client_satisfaction_surveys")
    .select("*")
    .eq("mission_id", missionId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data as ClientSatisfactionSurvey | null;
}

export async function fetchMySurveys(clientId: string): Promise<ClientSatisfactionSurvey[]> {
  const { data, error } = await supabase
    .from("client_satisfaction_surveys")
    .select("*")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("sent_at", { ascending: false });

  if (error) throw error;
  return (data || []) as ClientSatisfactionSurvey[];
}

export async function submitSurveyResponse(
  surveyId: string,
  responses: {
    overall_rating: number;
    punctuality_rating?: number;
    quality_rating?: number;
    cleanliness_rating?: number;
    explanation_rating?: number;
    professionalism_rating?: number;
    would_recommend: number;
    comment?: string;
    positive_aspects?: string;
    improvement_suggestions?: string;
    on_time?: boolean;
    explained_work?: boolean;
    clean_workspace?: boolean;
    would_use_again?: boolean;
  }
): Promise<void> {
  const { error } = await supabase
    .from("client_satisfaction_surveys")
    .update({
      ...responses,
      completed_at: new Date().toISOString(),
    })
    .eq("id", surveyId);

  if (error) throw error;
}

export async function fetchPendingSurveys(): Promise<ClientSatisfactionSurvey[]> {
  const { data, error } = await supabase
    .from("client_satisfaction_surveys")
    .select("*")
    .is("completed_at", null)
    .is("deleted_at", null)
    .order("sent_at", { ascending: true });

  if (error) throw error;
  return (data || []) as ClientSatisfactionSurvey[];
}

export async function fetchSurveysNeedingResponse(): Promise<ClientSatisfactionSurvey[]> {
  const { data, error } = await supabase
    .from("client_satisfaction_surveys")
    .select("*")
    .eq("response_needed", true)
    .is("response_handled_at", null)
    .is("deleted_at", null)
    .order("response_priority", { ascending: false })
    .order("completed_at", { ascending: true });

  if (error) throw error;
  return (data || []) as ClientSatisfactionSurvey[];
}

export async function markSurveyResponseHandled(
  surveyId: string,
  handledBy: string,
  notes: string
): Promise<void> {
  const { error } = await supabase
    .from("client_satisfaction_surveys")
    .update({
      response_handled_by: handledBy,
      response_handled_at: new Date().toISOString(),
      response_notes: notes,
    })
    .eq("id", surveyId);

  if (error) throw error;
}
