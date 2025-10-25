import { supabase } from "@/lib/supabase";
import type { MaintenanceContract, ContractEquipment, ContractScheduledIntervention } from "@/types/database";

export async function fetchContracts(clientId?: string): Promise<MaintenanceContract[]> {
  let query = supabase
    .from("maintenance_contracts")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data: contracts, error } = await query;
  if (error) throw error;

  if (!contracts || contracts.length === 0) return [];

  const clientIds = [...new Set(contracts.map(c => c.client_id))];

  const { data: clients } = await supabase
    .from("user_clients")
    .select("id, user_id, profiles(full_name, email)")
    .in("id", clientIds);

  const clientMap = new Map(
    (clients || []).map(c => [
      c.id,
      {
        name: (c.profiles as any)?.full_name || "Client inconnu",
        email: (c.profiles as any)?.email || ""
      }
    ])
  );

  return contracts.map((contract: any) => ({
    ...contract,
    client_name: clientMap.get(contract.client_id)?.name || "Client inconnu",
    client_email: clientMap.get(contract.client_id)?.email || "",
  })) as MaintenanceContract[];
}

export async function fetchContractById(id: string): Promise<MaintenanceContract | null> {
  const { data, error } = await supabase
    .from("maintenance_contracts")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data as MaintenanceContract | null;
}

export async function fetchContractEquipment(contractId: string): Promise<ContractEquipment[]> {
  const { data, error } = await supabase
    .from("contract_equipment")
    .select("*")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as ContractEquipment[];
}

export async function fetchContractInterventions(contractId: string): Promise<ContractScheduledIntervention[]> {
  const { data, error } = await supabase
    .from("contract_scheduled_interventions")
    .select("*")
    .eq("contract_id", contractId)
    .order("scheduled_date", { ascending: true });

  if (error) throw error;
  return (data || []) as ContractScheduledIntervention[];
}

export async function createContract(
  contract: Omit<MaintenanceContract, "id" | "created_at" | "updated_at" | "contract_number">
): Promise<MaintenanceContract> {
  const contractNumber = await generateContractNumber();

  const { data, error } = await supabase
    .from("maintenance_contracts")
    .insert({
      ...contract,
      contract_number: contractNumber,
    })
    .select()
    .single();

  if (error) throw error;
  return data as MaintenanceContract;
}

export async function addEquipmentToContract(
  equipment: Omit<ContractEquipment, "id" | "created_at" | "updated_at">
): Promise<ContractEquipment> {
  const { data, error } = await supabase
    .from("contract_equipment")
    .insert(equipment)
    .select()
    .single();

  if (error) throw error;
  return data as ContractEquipment;
}

export async function updateContractStatus(
  id: string,
  status: MaintenanceContract["status"],
  reason?: string
): Promise<void> {
  const { error } = await supabase
    .from("maintenance_contracts")
    .update({ status, status_reason: reason })
    .eq("id", id);

  if (error) throw error;
}

async function generateContractNumber(): Promise<string> {
  const { data, error } = await supabase.rpc("generate_contract_number");
  if (error) throw error;
  return data as string;
}

export async function fetchActiveContractsByClient(clientId: string): Promise<MaintenanceContract[]> {
  const { data, error } = await supabase
    .from("maintenance_contracts")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("start_date", { ascending: false });

  if (error) throw error;
  return (data || []) as MaintenanceContract[];
}
