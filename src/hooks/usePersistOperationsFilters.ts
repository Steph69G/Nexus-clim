import { useEffect, useRef } from "react";
import { useOperationsFilters } from "@/stores/operationsFilters";
import {
  fetchOperationsFiltersPref,
  saveOperationsFiltersPref,
} from "@/lib/preferences";

function useDebouncedCallback<T extends (...args: any[]) => void>(
  fn: T,
  delay = 600
) {
  const t = useRef<number | null>(null);
  return (...args: Parameters<T>) => {
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => fn(...args), delay);
  };
}

export default function usePersistOperationsFilters() {
  const state = useOperationsFilters();
  const { loadFromObject, ...filters } = state;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const value = await fetchOperationsFiltersPref();
      if (!cancelled && value && typeof value === "object") {
        loadFromObject(value);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFromObject]);

  const debouncedSave = useDebouncedCallback(async (payload: any) => {
    try {
      await saveOperationsFiltersPref(payload);
    } catch {
      /* silencieux */
    }
  }, 800);

  useEffect(() => {
    const payload = {
      dateRange: filters.dateRange,
      technicianIds: filters.technicianIds,
      statuses: filters.statuses,
      urgentOnly: filters.urgentOnly,
    };
    debouncedSave(payload);
  }, [
    filters.dateRange.start,
    filters.dateRange.end,
    filters.technicianIds.join(","),
    filters.statuses.join(","),
    filters.urgentOnly,
    debouncedSave,
  ]);
}
