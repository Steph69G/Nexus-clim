import { Filter } from "lucide-react";

type NotificationFiltersProps = {
  statusFilter: "all" | "unread";
  typeFilter: string;
  priorityFilter: string;
  onStatusChange: (status: "all" | "unread") => void;
  onTypeChange: (type: string) => void;
  onPriorityChange: (priority: string) => void;
};

const NOTIFICATION_TYPES = [
  { value: "all", label: "Tous les types" },
  { value: "mission", label: "Missions" },
  { value: "quote", label: "Devis" },
  { value: "invoice", label: "Factures" },
  { value: "contract", label: "Contrats" },
  { value: "emergency", label: "Urgences" },
  { value: "survey", label: "Enquêtes" },
  { value: "general", label: "Général" },
];

const PRIORITIES = [
  { value: "all", label: "Toutes priorités" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "Élevée" },
  { value: "normal", label: "Normale" },
  { value: "low", label: "Basse" },
];

export function NotificationFilters({
  statusFilter,
  typeFilter,
  priorityFilter,
  onStatusChange,
  onTypeChange,
  onPriorityChange,
}: NotificationFiltersProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-slate-600" />
        <h3 className="font-semibold text-slate-900">Filtres</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Statut
          </label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as "all" | "unread")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          >
            <option value="all">Toutes</option>
            <option value="unread">Non lues</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Type
          </label>
          <select
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          >
            {NOTIFICATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Priorité
          </label>
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          >
            {PRIORITIES.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
