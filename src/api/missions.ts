import type { Mission } from "@/types/mission";

const API_URL = "/api/missions"; // ⇦ ajuste si besoin

export async function fetchMissions(signal?: AbortSignal): Promise<Mission[]> {
  // 1) essaie l'API réelle
  try {
    const r = await fetch(API_URL, { signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = (await r.json()) as Mission[];
    return normalize(data);
  } catch {
    // 2) fallback dev: /public/missions.json  (cf. étape 4)
    const r = await fetch("/missions.json", { signal });
    if (!r.ok) throw new Error(`Fallback HTTP ${r.status}`);
    const data = (await r.json()) as Mission[];
    return normalize(data);
  }
}

function normalize(rows: Mission[]): Mission[] {
  return rows.map((r, i) => ({
    id: r.id ?? i + 1,
    title: r.title ?? `Mission #${i + 1}`,
    owner: r.owner ?? "—",
    status: (r.status as Mission["status"]) ?? "Nouveau",
    created_at: r.created_at ?? undefined,
    updated_at: r.updated_at ?? undefined,
  }));
}
