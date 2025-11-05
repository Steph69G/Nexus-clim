import { create } from "zustand";

export type DateRange = { start: string | null; end: string | null };

type OperationsFiltersState = {
  dateRange: DateRange;
  technicianIds: string[];
  statuses: string[];
  urgentOnly: boolean;

  setDateRange: (range: DateRange) => void;
  setTechnicianIds: (ids: string[]) => void;
  setStatuses: (st: string[]) => void;
  setUrgentOnly: (v: boolean) => void;
  reset: () => void;
};

const initial: Pick<
  OperationsFiltersState,
  "dateRange" | "technicianIds" | "statuses" | "urgentOnly"
> = {
  dateRange: { start: null, end: null },
  technicianIds: [],
  statuses: [],
  urgentOnly: false,
};

export const useOperationsFilters = create<OperationsFiltersState>((set) => ({
  ...initial,
  setDateRange: (dateRange) => set({ dateRange }),
  setTechnicianIds: (technicianIds) => set({ technicianIds }),
  setStatuses: (statuses) => set({ statuses }),
  setUrgentOnly: (urgentOnly) => set({ urgentOnly }),
  reset: () => set({ ...initial }),
}));
