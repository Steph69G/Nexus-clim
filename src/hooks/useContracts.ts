import { useEffect, useState, useCallback } from "react";
import type { MaintenanceContract, ContractEquipment } from "@/types/database";
import {
  fetchContracts,
  fetchContractById,
  fetchContractEquipment,
  fetchActiveContractsByClient,
} from "@/api/contracts";

export function useContracts(clientId?: string) {
  const [contracts, setContracts] = useState<MaintenanceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchContracts(clientId);
      setContracts(data);
    } catch (e: any) {
      setError(e?.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    contracts,
    loading,
    error,
    refresh: load,
  };
}

export function useContract(contractId?: string) {
  const [contract, setContract] = useState<MaintenanceContract | null>(null);
  const [equipment, setEquipment] = useState<ContractEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!contractId) {
      setContract(null);
      setEquipment([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [contractData, equipmentData] = await Promise.all([
        fetchContractById(contractId),
        fetchContractEquipment(contractId),
      ]);
      setContract(contractData);
      setEquipment(equipmentData);
    } catch (e: any) {
      setError(e?.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    contract,
    equipment,
    loading,
    error,
    refresh: load,
  };
}

export function useClientActiveContracts(clientId?: string) {
  const [contracts, setContracts] = useState<MaintenanceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) {
      setContracts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchActiveContractsByClient(clientId);
      setContracts(data);
    } catch (e: any) {
      setError(e?.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    contracts,
    hasActiveContract: contracts.length > 0,
    loading,
    error,
    refresh: load,
  };
}
