import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useOperationsFilters } from "@/stores/operationsFilters";

export default function useSyncFiltersWithUrl() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useOperationsFilters();

  useEffect(() => {
    const dateStart = searchParams.get("dateStart");
    const dateEnd = searchParams.get("dateEnd");
    const techs = searchParams.get("technicians");
    const stats = searchParams.get("statuses");
    const urgent = searchParams.get("urgentOnly");

    const updates: any = {};
    if (dateStart || dateEnd) {
      updates.dateRange = {
        start: dateStart || null,
        end: dateEnd || null,
      };
    }
    if (techs) {
      updates.technicianIds = techs.split(",").filter(Boolean);
    }
    if (stats) {
      updates.statuses = stats.split(",").filter(Boolean);
    }
    if (urgent) {
      updates.urgentOnly = urgent === "true";
    }

    if (Object.keys(updates).length > 0) {
      filters.loadFromObject(updates);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.dateRange.start) params.set("dateStart", filters.dateRange.start);
    if (filters.dateRange.end) params.set("dateEnd", filters.dateRange.end);
    if (filters.technicianIds.length) params.set("technicians", filters.technicianIds.join(","));
    if (filters.statuses.length) params.set("statuses", filters.statuses.join(","));
    if (filters.urgentOnly) params.set("urgentOnly", "true");

    setSearchParams(params, { replace: true });
  }, [
    filters.dateRange.start,
    filters.dateRange.end,
    filters.technicianIds.join(","),
    filters.statuses.join(","),
    filters.urgentOnly,
    setSearchParams,
  ]);
}
