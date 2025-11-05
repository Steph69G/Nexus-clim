import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DateRangeType = 'day' | 'week' | 'month';

export interface OperationsFilters {
  dateRangeType: DateRangeType;
  dateFrom: string;
  dateTo: string;
  technicians: string[];
  statuses: string[];
  urgentOnly: boolean;
}

interface OperationsFiltersStore extends OperationsFilters {
  setDateRangeType: (type: DateRangeType) => void;
  setDateRange: (from: string, to: string) => void;
  setTechnicians: (technicians: string[]) => void;
  setStatuses: (statuses: string[]) => void;
  setUrgentOnly: (urgent: boolean) => void;
  resetFilters: () => void;
  toQueryString: () => string;
  fromQueryString: (params: URLSearchParams) => void;
}

const defaultFilters: OperationsFilters = {
  dateRangeType: 'week',
  dateFrom: new Date().toISOString().split('T')[0],
  dateTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  technicians: [],
  statuses: [],
  urgentOnly: false,
};

export const useOperationsFilters = create<OperationsFiltersStore>()(
  persist(
    (set, get) => ({
      ...defaultFilters,

      setDateRangeType: (type) =>
        set(() => {
          const now = new Date();
          let dateFrom = now.toISOString().split('T')[0];
          let dateTo = dateFrom;

          if (type === 'day') {
            dateTo = dateFrom;
          } else if (type === 'week') {
            dateTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          } else if (type === 'month') {
            dateTo = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          }

          return { dateRangeType: type, dateFrom, dateTo };
        }),

      setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),

      setTechnicians: (technicians) => set({ technicians }),

      setStatuses: (statuses) => set({ statuses }),

      setUrgentOnly: (urgent) => set({ urgentOnly: urgent }),

      resetFilters: () => set(defaultFilters),

      toQueryString: () => {
        const state = get();
        const params = new URLSearchParams();
        params.set('dateRangeType', state.dateRangeType);
        params.set('dateFrom', state.dateFrom);
        params.set('dateTo', state.dateTo);
        if (state.technicians.length) params.set('technicians', state.technicians.join(','));
        if (state.statuses.length) params.set('statuses', state.statuses.join(','));
        if (state.urgentOnly) params.set('urgentOnly', 'true');
        return params.toString();
      },

      fromQueryString: (params) => {
        const updates: Partial<OperationsFilters> = {};
        const type = params.get('dateRangeType');
        if (type) updates.dateRangeType = type as DateRangeType;
        const from = params.get('dateFrom');
        if (from) updates.dateFrom = from;
        const to = params.get('dateTo');
        if (to) updates.dateTo = to;
        const techs = params.get('technicians');
        if (techs) updates.technicians = techs.split(',').filter(Boolean);
        const stats = params.get('statuses');
        if (stats) updates.statuses = stats.split(',').filter(Boolean);
        const urgent = params.get('urgentOnly');
        if (urgent) updates.urgentOnly = urgent === 'true';
        set(updates);
      },
    }),
    {
      name: 'operations-filters-storage',
    }
  )
);
