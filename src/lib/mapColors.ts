import { STATUS_COLORS, normalizeStatus, type UIStatus } from "./statusColors";

export type UserRole = "admin" | "manager" | "sal" | "tech" | "st" | "client";

export interface TechnicianColorConfig {
  hex: string;
  label: string;
}

export const TECHNICIAN_COLORS = {
  eligible: {
    hex: "#10B981",
    label: "Dans le rayon / Eligible"
  },
  tooFar: {
    hex: "#EF4444",
    label: "Hors rayon"
  },
  neutral: {
    hex: "#1E40AF",
    label: "Autre technicien"
  }
} as const;

export const MY_LOCATION_COLOR = "#8B5CF6";

export function getMissionColorForRole(
  status: string | null | undefined,
  role: UserRole
): string {
  const normalized = normalizeStatus(status);

  if (role === "admin" || role === "manager" || role === "sal") {
    if (normalized === "Terminé") {
      return "#059669";
    }
    return STATUS_COLORS[normalized].hex;
  }

  if (role === "tech") {
    switch (normalized) {
      case "En cours":
        return "#3B82F6";
      case "Terminé":
        return "#10B981";
      case "Bloqué":
        return "#F87171";
      case "Assignée":
        return "#22C55E";
      default:
        return "#9CA3AF";
    }
  }

  if (role === "st") {
    switch (normalized) {
      case "En cours":
        return "#3B82F6";
      case "Bloqué":
        return "#F87171";
      case "Terminé":
        return "#10B981";
      case "Publiée":
        return "#6366F1";
      default:
        return "#9CA3AF";
    }
  }

  return STATUS_COLORS[normalized].hex;
}

export function getTechnicianColor(
  isEligible: boolean,
  isTooFar: boolean
): string {
  if (isEligible) return TECHNICIAN_COLORS.eligible.hex;
  if (isTooFar) return TECHNICIAN_COLORS.tooFar.hex;
  return TECHNICIAN_COLORS.neutral.hex;
}

export function getMissionColorLegend(role: UserRole): Array<{ color: string; label: string }> {
  if (role === "admin" || role === "manager" || role === "sal") {
    return [
      { color: STATUS_COLORS["Nouveau"].hex, label: "Brouillon" },
      { color: STATUS_COLORS["Publiée"].hex, label: "Publiée" },
      { color: STATUS_COLORS["Assignée"].hex, label: "Assignée" },
      { color: STATUS_COLORS["En cours"].hex, label: "En cours" },
      { color: STATUS_COLORS["Bloqué"].hex, label: "Bloqué" },
      { color: "#059669", label: "Terminé" }
    ];
  }

  if (role === "tech") {
    return [
      { color: "#22C55E", label: "Assignée" },
      { color: "#3B82F6", label: "En cours" },
      { color: "#F87171", label: "Bloqué" },
      { color: "#10B981", label: "Terminé" }
    ];
  }

  if (role === "st") {
    return [
      { color: "#6366F1", label: "Publiée" },
      { color: "#3B82F6", label: "En cours" },
      { color: "#F87171", label: "Bloqué" },
      { color: "#10B981", label: "Terminé" }
    ];
  }

  return [];
}

export function getTechnicianColorLegend(): Array<{ color: string; label: string }> {
  return [
    { color: TECHNICIAN_COLORS.eligible.hex, label: TECHNICIAN_COLORS.eligible.label },
    { color: TECHNICIAN_COLORS.tooFar.hex, label: TECHNICIAN_COLORS.tooFar.label },
    { color: TECHNICIAN_COLORS.neutral.hex, label: TECHNICIAN_COLORS.neutral.label }
  ];
}
