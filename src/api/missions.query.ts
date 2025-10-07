import { supabase } from "@/lib/supabase";
import type { Mission } from "@/types/mission";

export type MissionFilters = {
  status?: "Nouveau" | "En cours" | "Bloqué" | "Terminé" | "ALL";
  q?: string;           // recherche plein-texte: titre/owner
  owner?: string;       // filtre exact sur owner (optionnel)
};
export type MissionPage = { page: number; pageSize: number };

function mapRows(rows: any[]): Mission[] {
  const pick = (o: any, ks: string[]) => ks.find(k => k in o);
  return rows.map((r, i) => {
    const titleKey  = pick(r, ["title","name","label","subject"]) ?? "title";
    const ownerKey  = pick(r, ["owner","assigned_to","assignee","user","username"]) ?? "owner";
    const statusKey = pick(r, ["status","state"]) ?? "status";
    const createdKey= pick(r, ["created_at","inserted_at","createdAt","createdat"]) ?? "created_at";
    const updatedKey= pick(r, ["updated_at","updatedAt","updatedat"]) ?? "updated_at";
    return {
      id: r.id ?? String(i + 1),
      title: r[titleKey] ?? "Mission",
      owner: r[ownerKey] ?? "—",
      status: r[statusKey] ?? "Nouveau",
      created_at: r[createdKey] ?? new Date().toISOString(),
      updated_at: r[updatedKey] ?? null,
    } as Mission;
  });
}

/** Récupère missions avec filtres + pagination + total côté serveur */
export async function fetchMissionsPaged(
  filters: MissionFilters,
  paging: MissionPage
): Promise<{ rows: Mission[]; total: number; }> {
  const { page, pageSize } = paging;
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let q = supabase.from("missions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "ALL") {
    q = q.eq("status", filters.status);
  }
  if (filters.owner && filters.owner.trim()) {
    q = q.eq("owner", filters.owner.trim());
  }
  if (filters.q && filters.q.trim()) {
    const term = `%${filters.q.trim()}%`;
    // essaie sur title + owner si dispo
    q = q.or(`title.ilike.${term},owner.ilike.${term}`);
  }

  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;

  return { rows: mapRows(data ?? []), total: count ?? 0 };
}
