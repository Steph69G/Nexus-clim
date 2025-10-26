import { useEffect, useMemo, useState } from "react";
import type { Mission } from "@/types/mission";
import { fetchMissionsPaged, type MissionFilters, type MissionPage } from "@/api/missions.query";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useMissions(enableRealtime = true) {
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

  useEffect(() => {
    if (!enableRealtime) return;

    let channel: RealtimeChannel;

    channel = supabase
      .channel(`missions-realtime-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "missions",
        },
        (payload) => {
          console.log("[useMissions] Realtime event:", payload.eventType);

          if (payload.eventType === "INSERT") {
            load();
          } else if (payload.eventType === "UPDATE") {
            setRows((prev) =>
              prev.map((m) =>
                m.id === payload.new.id ? { ...m, ...payload.new } : m
              )
            );
          } else if (payload.eventType === "DELETE") {
            setRows((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log("[useMissions] Realtime subscription:", status);
      });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [enableRealtime]);

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
