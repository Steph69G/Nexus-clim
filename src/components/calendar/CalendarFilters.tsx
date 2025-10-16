import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";
import type { MissionStatus } from "@/types/mission";
import { supabase } from "@/lib/supabase";

interface CalendarFiltersProps {
  onFiltersChange: (filters: {
    statuses: MissionStatus[];
    assignedUserId: string | null;
    interventionTypeId: number | null;
    showOnlyMine: boolean;
  }) => void;
}

const ALL_STATUSES: MissionStatus[] = [
  "BROUILLON",
  "PUBLIEE",
  "ACCEPTEE",
  "PLANIFIEE",
  "EN_ROUTE",
  "EN_INTERVENTION",
  "TERMINEE",
  "FACTURABLE",
  "FACTUREE",
  "PAYEE",
  "CLOTUREE",
  "ANNULEE",
];

interface User {
  id: string;
  full_name: string;
}

interface InterventionType {
  id: number;
  name: string;
}

export function CalendarFilters({ onFiltersChange }: CalendarFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<MissionStatus[]>([]);
  const [assignedUserId, setAssignedUserId] = useState<string | null>(null);
  const [interventionTypeId, setInterventionTypeId] = useState<number | null>(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [interventionTypes, setInterventionTypes] = useState<InterventionType[]>([]);

  useEffect(() => {
    loadUsers();
    loadInterventionTypes();
  }, []);

  useEffect(() => {
    onFiltersChange({
      statuses: selectedStatuses,
      assignedUserId,
      interventionTypeId,
      showOnlyMine,
    });
  }, [selectedStatuses, assignedUserId, interventionTypeId, showOnlyMine]);

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .not("full_name", "is", null)
      .order("full_name");

    if (data) setUsers(data);
  }

  async function loadInterventionTypes() {
    const { data } = await supabase
      .from("intervention_types")
      .select("id, name")
      .order("name");

    if (data) setInterventionTypes(data);
  }

  function toggleStatus(status: MissionStatus) {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  }

  function clearFilters() {
    setSelectedStatuses([]);
    setAssignedUserId(null);
    setInterventionTypeId(null);
    setShowOnlyMine(false);
  }

  function setQuickFilter(type: "active" | "toplan" | "completed") {
    switch (type) {
      case "active":
        setSelectedStatuses(["EN_ROUTE", "EN_INTERVENTION", "PLANIFIEE"]);
        break;
      case "toplan":
        setSelectedStatuses(["PUBLIEE", "ACCEPTEE"]);
        break;
      case "completed":
        setSelectedStatuses(["TERMINEE", "FACTURABLE", "FACTUREE", "PAYEE", "CLOTUREE"]);
        break;
    }
  }

  const activeFilterCount =
    selectedStatuses.length +
    (assignedUserId ? 1 : 0) +
    (interventionTypeId ? 1 : 0) +
    (showOnlyMine ? 1 : 0);

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filtres</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickFilter("active")}
              className="px-3 py-1.5 text-sm rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
            >
              Actives
            </button>
            <button
              onClick={() => setQuickFilter("toplan")}
              className="px-3 py-1.5 text-sm rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors"
            >
              À planifier
            </button>
            <button
              onClick={() => setQuickFilter("completed")}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
            >
              Terminées
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Statuts
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map(status => (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      selectedStatuses.includes(status)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    {status.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Technicien assigné
                </label>
                <select
                  value={assignedUserId || ""}
                  onChange={(e) => setAssignedUserId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tous les techniciens</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type d'intervention
                </label>
                <select
                  value={interventionTypeId || ""}
                  onChange={(e) => setInterventionTypeId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tous les types</option>
                  {interventionTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyMine}
                    onChange={(e) => setShowOnlyMine(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Mes missions uniquement
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
