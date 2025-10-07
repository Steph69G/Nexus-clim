import { useEffect, useMemo, useState } from "react";
import type { Mission } from "@/types/mission";
import { fetchMissionsPaged, type MissionFilters, type MissionPage } from "@/api/missions.query";

export function useMissions() {
  const [rows, setRows] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<MissionFilters>({ status: "ALL", q: "" });
  const [page, setPage] = useState<MissionPage>({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);

  async function load() {
    try {
      setLoading(true); setError(null);
      const { rows, total } = await fetchMissionsPaged(filters, page);
      setRows(rows); setTotal(total);
    } catch (e: any) {
      setError(e?.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters, page.page, page.pageSize]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const by = (s: Mission["status"]) => rows.filter(r => r.status === s).length;
    return { total, enCours: by("En cours"), bloquees: by("Bloqué"), terminees: by("Terminé") };
  }, [rows]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / page.pageSize)), [total, page.pageSize]);

  return {
    rows, loading, error, refresh: load,
    filters, setFilters,
    page, setPage,
    total, pages,
    kpis, // <-- ✅ on ré-expose kpis
  };
}
