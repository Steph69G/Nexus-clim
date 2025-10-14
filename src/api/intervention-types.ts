import { supabase } from "@/lib/supabase";

export interface InterventionType {
  id: string;
  code: string;
  label: string;
  icon_name: string;
  color: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface InterventionTypeInput {
  code: string;
  label: string;
  icon_name: string;
  color: string;
  display_order?: number;
}

export interface InterventionTypeHistory {
  id: string;
  intervention_type_id: string;
  action: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_by: string | null;
  changed_at: string;
}

export async function getAllInterventionTypes(): Promise<InterventionType[]> {
  const { data, error } = await supabase
    .from("intervention_types")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getActiveInterventionTypes(): Promise<InterventionType[]> {
  const { data, error } = await supabase
    .from("intervention_types")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createInterventionType(input: InterventionTypeInput): Promise<InterventionType> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Non authentifié");

  const maxOrder = await getMaxDisplayOrder();

  const { data, error } = await supabase
    .from("intervention_types")
    .insert({
      ...input,
      display_order: input.display_order ?? maxOrder + 1,
      created_by: user.user.id,
      updated_by: user.user.id,
    })
    .select()
    .single();

  if (error) throw error;

  await logHistory(data.id, "CREATE", null, data);

  return data;
}

export async function updateInterventionType(
  id: string,
  updates: Partial<InterventionTypeInput>
): Promise<InterventionType> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Non authentifié");

  const { data: oldData } = await supabase
    .from("intervention_types")
    .select("*")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("intervention_types")
    .update({
      ...updates,
      updated_by: user.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logHistory(id, "UPDATE", oldData, data);

  return data;
}

export async function toggleInterventionTypeStatus(id: string): Promise<InterventionType> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Non authentifié");

  const { data: currentType } = await supabase
    .from("intervention_types")
    .select("*")
    .eq("id", id)
    .single();

  if (!currentType) throw new Error("Type non trouvé");

  const newStatus = !currentType.is_active;

  const { data, error } = await supabase
    .from("intervention_types")
    .update({
      is_active: newStatus,
      updated_by: user.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logHistory(id, newStatus ? "ACTIVATE" : "DEACTIVATE", currentType, data);

  return data;
}

export async function deleteInterventionType(id: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Non authentifié");

  const { data: oldData } = await supabase
    .from("intervention_types")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("intervention_types")
    .delete()
    .eq("id", id);

  if (error) throw error;

  await logHistory(id, "DELETE", oldData, null);
}

export async function getInterventionTypeHistory(typeId?: string): Promise<InterventionTypeHistory[]> {
  let query = supabase
    .from("intervention_types_history")
    .select("*")
    .order("changed_at", { ascending: false });

  if (typeId) {
    query = query.eq("intervention_type_id", typeId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

async function getMaxDisplayOrder(): Promise<number> {
  const { data } = await supabase
    .from("intervention_types")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.display_order ?? 0;
}

async function logHistory(
  interventionTypeId: string,
  action: string,
  oldValues: any,
  newValues: any
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;

  await supabase.from("intervention_types_history").insert({
    intervention_type_id: interventionTypeId,
    action,
    old_values: oldValues,
    new_values: newValues,
    changed_by: user.user.id,
  });
}
