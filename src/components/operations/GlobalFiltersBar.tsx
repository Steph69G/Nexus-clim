import { useEffect, useState } from "react";
import { useOperationsFilters } from "@/stores/operationsFilters";
import { supabase } from "@/lib/supabase";

export default function GlobalFiltersBar() {
  const {
    dateRange, technicianIds, statuses, urgentOnly,
    setDateRange, setTechnicianIds, setStatuses, setUrgentOnly, reset
  } = useOperationsFilters();

  const [techOptions, setTechOptions] = useState<{ id: string; name: string }[]>(
    []
  );
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: techs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("role", "tech")
        .order("full_name", { ascending: true });

      if (!cancelled && techs) {
        setTechOptions(
          techs.map((t: any) => ({ id: t.user_id, name: t.full_name ?? "Technicien" }))
        );
      }

      const hardcoded = [
        "BROUILLON",
        "PUBLIEE",
        "ACCEPTEE",
        "PLANIFIEE",
        "EN_ROUTE",
        "EN_INTERVENTION",
        "TERMINEE",
        "FACTURABLE",
        "PAYEE",
        "CLOTUREE",
      ];
      setStatusOptions(hardcoded);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mb-6 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-muted-foreground">Début</label>
          <input
            type="date"
            className="rounded-md border px-2 py-1"
            value={dateRange.start ?? ""}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value || null })}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-muted-foreground">Fin</label>
          <input
            type="date"
            className="rounded-md border px-2 py-1"
            value={dateRange.end ?? ""}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value || null })}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-muted-foreground">Techniciens</label>
          <select
            multiple
            className="rounded-md border px-2 py-1 min-w-[220px] h-24"
            value={technicianIds}
            onChange={(e) =>
              setTechnicianIds(Array.from(e.target.selectedOptions).map((o) => o.value))
            }
          >
            {techOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-muted-foreground">Statuts</label>
          <select
            multiple
            className="rounded-md border px-2 py-1 min-w-[220px] h-24"
            value={statuses}
            onChange={(e) =>
              setStatuses(Array.from(e.target.selectedOptions).map((o) => o.value))
            }
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <label className="inline-flex items-center gap-2 mt-1">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={urgentOnly}
            onChange={(e) => setUrgentOnly(e.target.checked)}
          />
          <span className="text-sm">Urgences uniquement</span>
        </label>

        <button
          onClick={reset}
          className="ml-auto rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
