export const tailwindColorToHex: Record<string, string> = {
  emerald: "#10b981",
  amber: "#f59e0b",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  orange: "#f97316",
  sky: "#0ea5e9",
  red: "#ef4444",
  purple: "#a855f7",
  pink: "#ec4899",
  slate: "#64748b",
  violet: "#8b5cf6",
};

export function getColorClasses(color: string): { bg: string; text: string } {
  const colorMap: Record<string, { bg: string; text: string }> = {
    emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
    amber: { bg: "bg-amber-100", text: "text-amber-600" },
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    cyan: { bg: "bg-cyan-100", text: "text-cyan-600" },
    orange: { bg: "bg-orange-100", text: "text-orange-600" },
    sky: { bg: "bg-sky-100", text: "text-sky-600" },
    red: { bg: "bg-red-100", text: "text-red-600" },
    purple: { bg: "bg-purple-100", text: "text-purple-600" },
    pink: { bg: "bg-pink-100", text: "text-pink-600" },
    slate: { bg: "bg-slate-100", text: "text-slate-600" },
    violet: { bg: "bg-violet-100", text: "text-violet-600" },
  };
  return colorMap[color] || { bg: "bg-slate-100", text: "text-slate-600" };
}

export function getTailwindColorHex(color: string): string {
  return tailwindColorToHex[color] || "#64748b";
}
