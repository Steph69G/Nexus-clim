import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";
import type { MissionStatus } from "@/types/mission";
import { supabase } from "@/lib/supabase";

interface CalendarFiltersProps {
  onFiltersChange: (filters: {
    statuses: MissionStatus[];
    assignedUserId: string | null;
    interventionType: string | null;
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
  user_id: string;
  full_name: string;
}

interface InterventionType {
  id: string;
  label: string;
}

export function CalendarFilters({ onFiltersChange }: CalendarFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<MissionStatus[]>([]);
  const [assignedUserId, setAssignedUserId] = useState<string | null>(null);
  const [interventionType, setInterventionType] = useState<string | null>(null);
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
      interventionType,
      showOnlyMine,
    });
  }, [selectedStatuses, assignedUserId, interventionType, showOnlyMine]);

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .not("full_name", "is", null)
      .order("full_name");

    if (data) setUsers(data);
  }

  async function loadInterventionTypes() {
    const { data } = await supabase
      .from("intervention_types")
      .select("id, label")
      .order("label");

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
    setInterventionType(null);
    setShowOnlyMine(false);
  }

  function setQuickFilter(type: "active" | "toplan" | "completed") {
    switch (type) {
      case "active":
        setSelectedStatuses(["EN_ROUTE", "EN_INTERVENTION", "PLANIFIEE"]);
        break;
      case "toplan":
        setSelectedStatuses(["Nouveau" as MissionStatus, "Publiée" as MissionStatus, "Assignée" as MissionStatus]);
        break;
      case "completed":
        setSelectedStatuses(["TERMINEE", "FACTURABLE", "FACTUREE", "PAYEE", "CLOTUREE"]);
        break;
    }
  }

  const activeFilterCount =
    selectedStatuses.length +
    (assignedUserId ? 1 : 0) +
    (interventionType ? 1 : 0) +
    (showOnlyMine ? 1 : 0);

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtres avancés</span>
            {(assignedUserId || interventionType) && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                {(assignedUserId ? 1 : 0) + (interventionType ? 1 : 0)}
              </span>
            )}
          </button>

          {(assignedUserId || interventionType) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Réinitialiser
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Technicien assigné
                </label>
                <select
                  value={assignedUserId || ""}
                  onChange={(e) => setAssignedUserId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Tous les techniciens</option>
                  {users.map(user => (
                    <option key={user.user_id} value={user.user_id}>
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
                  value={interventionType || ""}
                  onChange={(e) => setInterventionType(e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Tous les types</option>
                  {interventionTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
