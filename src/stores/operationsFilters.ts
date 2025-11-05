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
  loadFromObject: (obj: Partial<OperationsFiltersState>) => void;
};

const initial = {
  dateRange: { start: null, end: null },
  technicianIds: [] as string[],
  statuses: [] as string[],
  urgentOnly: false,
};

export const useOperationsFilters = create<OperationsFiltersState>((set) => ({
  ...initial,
  setDateRange: (dateRange) => set({ dateRange }),
  setTechnicianIds: (technicianIds) => set({ technicianIds }),
  setStatuses: (statuses) => set({ statuses }),
  setUrgentOnly: (urgentOnly) => set({ urgentOnly }),
  reset: () => set({ ...initial }),
  loadFromObject: (obj) =>
    set((prev) => ({
      ...prev,
      ...obj,
      dateRange: {
        start: obj.dateRange?.start ?? prev.dateRange.start,
        end: obj.dateRange?.end ?? prev.dateRange.end,
      },
      technicianIds: obj.technicianIds ?? prev.technicianIds,
      statuses: obj.statuses ?? prev.statuses,
      urgentOnly: obj.urgentOnly ?? prev.urgentOnly,
    })),
}));
