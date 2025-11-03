import { useMemo } from "react";
import { getMissionColorForRole } from "@/lib/mapColors";
import type { UiRole } from "@/lib/roles";

type MissionPoint = {
  status: string;
  assigned_user_id?: string | null;
};

type StatCategory = {
  label: string;
  filter: (m: MissionPoint, userId?: string) => boolean;
  color: string;
};

function getStatsCategories(role: UiRole): StatCategory[] {
  if (role === "admin" || role === "manager" || role === "sal") {
    return [
      {
        label: "Brouillons",
        filter: (m) => m.status === "BROUILLON" || m.status === "NOUVEAU",
        color: getMissionColorForRole("Nouveau", role),
      },
      {
        label: "Publiées",
        filter: (m) => m.status === "PUBLIEE",
        color: getMissionColorForRole("Publiée", role),
      },
      {
        label: "Assignées",
        filter: (m) => m.status === "ASSIGNEE" || m.status === "ACCEPTEE" || m.status === "PROGRAMMEE",
        color: getMissionColorForRole("Assignée", role),
      },
      {
        label: "En cours",
        filter: (m) => m.status === "EN_COURS" || m.status === "EN_ATTENTE" || m.status === "PAUSE",
        color: getMissionColorForRole("En cours", role),
      },
      {
        label: "Bloquées",
        filter: (m) => m.status === "BLOQUEE",
        color: getMissionColorForRole("Bloqué", role),
      },
      {
        label: "Terminées",
        filter: (m) => m.status === "TERMINEE" || m.status === "VALIDEE" || m.status === "FACTUREE",
        color: getMissionColorForRole("Terminé", role),
      },
    ];
  }

  return [
    {
      label: "Publiées",
      filter: (m) => m.status === "PUBLIEE",
      color: getMissionColorForRole("Publiée", role),
    },
    {
      label: "Assignées à moi",
      filter: (m, userId) => !!(m.assigned_user_id && m.assigned_user_id === userId),
      color: getMissionColorForRole("Assignée", role),
    },
    {
      label: "En cours",
      filter: (m) => m.status === "EN_COURS" || m.status === "EN_ATTENTE" || m.status === "PAUSE",
      color: getMissionColorForRole("En cours", role),
    },
    {
      label: "Terminées",
      filter: (m) => m.status === "TERMINEE" || m.status === "VALIDEE" || m.status === "FACTUREE",
      color: getMissionColorForRole("Terminé", role),
    },
  ];
}

type MapStatsCardsProps = {
  missions: MissionPoint[];
  role: UiRole;
  userId?: string;
  onFilterChange?: (status: string | null) => void;
  selectedFilter?: string | null;
};

export default function MapStatsCards({ missions, role, userId, onFilterChange, selectedFilter }: MapStatsCardsProps) {
  const categories = useMemo(() => getStatsCategories(role), [role]);

  const stats = useMemo(() => {
    const counts = categories.map((cat) => ({
      label: cat.label,
      count: missions.filter((m) => cat.filter(m, userId)).length,
      color: cat.color,
      key: cat.label.toLowerCase(),
    }));

    return [
      { label: "Total", count: missions.length, color: "#374151", key: "all" },
      ...counts,
    ];
  }, [missions, categories, userId]);

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.key}
          label={stat.label}
          value={stat.count}
          color={stat.color}
          active={selectedFilter === stat.key}
          onClick={() => onFilterChange?.(stat.key === "all" ? null : stat.key)}
        />
      ))}
    </section>
  );
}

function StatCard({
  label,
  value,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl border-2 text-left transition-all transform hover:scale-105 ${
        active
          ? "border-slate-400 bg-gradient-to-r from-slate-100 to-blue-100 shadow-xl"
          : "border-slate-200 bg-white hover:bg-slate-50 shadow-lg"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-4 h-4 rounded-full shadow border-2 border-white"
          style={{ backgroundColor: color }}
        />
        <div className="text-sm text-slate-700 font-semibold">{label}</div>
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
    </button>
  );
}
