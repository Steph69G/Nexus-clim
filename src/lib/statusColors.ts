import type { MissionStatus } from "@/types/mission";

export type UIStatus = "Nouveau" | "Publiée" | "Assignée" | "En cours" | "Bloqué" | "Terminé";

export interface StatusColorConfig {
  hex: string;
  tailwind: string;
  label: string;
  description: string;
}

export const STATUS_COLORS: Record<UIStatus, StatusColorConfig> = {
  "Nouveau": {
    hex: "#EAB308",
    tailwind: "bg-yellow-500",
    label: "Brouillon",
    description: "Mission créée, en attente de publication"
  },
  "Publiée": {
    hex: "#6366F1",
    tailwind: "bg-indigo-500",
    label: "Publiée",
    description: "Mission publiée, en attente d'assignation"
  },
  "Assignée": {
    hex: "#22C55E",
    tailwind: "bg-green-500",
    label: "Assignée",
    description: "Technicien assigné, à planifier"
  },
  "En cours": {
    hex: "#3B82F6",
    tailwind: "bg-blue-500",
    label: "En cours",
    description: "Intervention en cours de réalisation"
  },
  "Bloqué": {
    hex: "#F87171",
    tailwind: "bg-red-400",
    label: "Bloqué",
    description: "Mission bloquée, nécessite une action"
  },
  "Terminé": {
    hex: "#10B981",
    tailwind: "bg-green-500",
    label: "Terminé",
    description: "Intervention terminée"
  }
};

export function normalizeStatus(input: string | null | undefined): UIStatus {
  const s = (input ?? "Nouveau")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase();

  switch (s) {
    case "BROUILLON":
    case "NOUVEAU":
    case "DRAFT":
      return "Nouveau";
    case "PUBLIEE":
    case "PUBLISHED":
      return "Publiée";
    case "ASSIGNEE":
    case "ASSIGNED":
    case "ACCEPTEE":
    case "PLANIFIEE":
      return "Assignée";
    case "EN COURS":
    case "IN_PROGRESS":
    case "IN PROGRESS":
    case "EN_ROUTE":
    case "EN_INTERVENTION":
      return "En cours";
    case "BLOQUE":
    case "BLOQUEE":
    case "BLOCKED":
      return "Bloqué";
    case "TERMINE":
    case "TERMINEE":
    case "DONE":
    case "COMPLETED":
    case "CLOTUREE":
    case "FACTURABLE":
    case "FACTUREE":
    case "PAYEE":
      return "Terminé";
    default:
      return "Nouveau";
  }
}

export function getStatusColor(status: MissionStatus | string | null | undefined): string {
  const normalized = normalizeStatus(status);
  return STATUS_COLORS[normalized].tailwind;
}

export function getStatusHex(status: MissionStatus | string | null | undefined): string {
  const normalized = normalizeStatus(status);
  return STATUS_COLORS[normalized].hex;
}

export function getStatusLabel(status: MissionStatus | string | null | undefined): string {
  const normalized = normalizeStatus(status);
  return STATUS_COLORS[normalized].label;
}

export function getStatusDescription(status: MissionStatus | string | null | undefined): string {
  const normalized = normalizeStatus(status);
  return STATUS_COLORS[normalized].description;
}

export function getAllStatusLegends() {
  return Object.entries(STATUS_COLORS).map(([status, config]) => ({
    status: status as UIStatus,
    ...config
  }));
}
