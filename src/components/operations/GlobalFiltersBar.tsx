import { useState, useEffect } from 'react';
import { Calendar, Users, Filter, AlertTriangle, X } from 'lucide-react';
import { useOperationsFilters, DateRangeType } from '@/stores/operationsFilters';
import { supabase } from '@/lib/supabase';

const MISSION_STATUSES = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'publiee', label: 'Publiée' },
  { value: 'acceptee', label: 'Acceptée' },
  { value: 'confirmee', label: 'Confirmée' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminée' },
  { value: 'validee', label: 'Validée' },
  { value: 'annulee', label: 'Annulée' },
];

export function GlobalFiltersBar() {
  const {
    dateRangeType,
    dateFrom,
    dateTo,
    technicians,
    statuses,
    urgentOnly,
    setDateRangeType,
    setDateRange,
    setTechnicians,
    setStatuses,
    setUrgentOnly,
    resetFilters,
  } = useOperationsFilters();

  const [availableTechs, setAvailableTechs] = useState<{ id: string; name: string }[]>([]);
  const [showTechsDropdown, setShowTechsDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('role', 'tech')
        .order('full_name');

      if (data) {
        setAvailableTechs(data.map((t) => ({ id: t.user_id, name: t.full_name || 'Technicien' })));
      }
    })();
  }, []);

  const toggleTech = (id: string) => {
    setTechnicians(technicians.includes(id) ? technicians.filter((t) => t !== id) : [...technicians, id]);
  };

  const toggleStatus = (status: string) => {
    setStatuses(statuses.includes(status) ? statuses.filter((s) => s !== status) : [...statuses, status]);
  };

  const activeFiltersCount =
    technicians.length + statuses.length + (urgentOnly ? 1 : 0) + (dateRangeType !== 'week' ? 1 : 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter className="w-4 h-4" />
          <span>Filtres</span>
        </div>

        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <Calendar className="w-4 h-4 text-slate-500" />
          <select
            value={dateRangeType}
            onChange={(e) => setDateRangeType(e.target.value as DateRangeType)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Jour</option>
            <option value="week">Semaine</option>
            <option value="month">Mois</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateRange(e.target.value, dateTo)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateRange(dateFrom, e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative border-l border-slate-200 pl-3">
          <button
            onClick={() => setShowTechsDropdown(!showTechsDropdown)}
            className="flex items-center gap-2 text-sm border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>
              Techniciens
              {technicians.length > 0 && <span className="ml-1 text-blue-600">({technicians.length})</span>}
            </span>
          </button>

          {showTechsDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg border border-slate-200 shadow-lg z-50 max-h-64 overflow-y-auto">
              <div className="p-2 space-y-1">
                {availableTechs.map((tech) => (
                  <label
                    key={tech.id}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={technicians.includes(tech.id)}
                      onChange={() => toggleTech(tech.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{tech.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative border-l border-slate-200 pl-3">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="flex items-center gap-2 text-sm border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Filter className="w-4 h-4 text-slate-500" />
            <span>
              Statuts
              {statuses.length > 0 && <span className="ml-1 text-blue-600">({statuses.length})</span>}
            </span>
          </button>

          {showStatusDropdown && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg border border-slate-200 shadow-lg z-50 max-h-64 overflow-y-auto">
              <div className="p-2 space-y-1">
                {MISSION_STATUSES.map((status) => (
                  <label
                    key={status.value}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={statuses.includes(status.value)}
                      onChange={() => toggleStatus(status.value)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setUrgentOnly(!urgentOnly)}
          className={`flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            urgentOnly
              ? 'bg-red-50 border-red-300 text-red-700'
              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${urgentOnly ? 'text-red-600' : 'text-slate-500'}`} />
          <span>Urgences</span>
        </button>

        {activeFiltersCount > 0 && (
          <button
            onClick={resetFilters}
            className="ml-auto flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Réinitialiser ({activeFiltersCount})</span>
          </button>
        )}
      </div>
    </div>
  );
}
