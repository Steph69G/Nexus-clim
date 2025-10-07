import { supabase } from "@/lib/supabase";
import type { Mission } from "@/types/mission";

export async function fetchMissions(): Promise<Mission[]> {
  // On récupère toutes les colonnes sans rien supposer
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as any[];

  // heuristiques de mapping -> on cherche le meilleur candidat pour chaque champ
  const pick = (obj: any, candidates: string[]) =>
    candidates.find((k) => k in obj) as string | undefined;

  return rows.map((r, i) => {
    const titleKey = pick(r, ["title", "name", "label", "subject"]) ?? "title";
    const ownerKey = pick(r, ["owner", "assignee", "assigned_to", "user", "username"]) ?? "owner";
    const statusKey = pick(r, ["status", "state"]) ?? "status";
    const createdKey = pick(r, ["created_at", "inserted_at", "createdAt", "createdat"]) ?? "created_at";
    const updatedKey = pick(r, ["updated_at", "updatedAt", "updatedat"]) ?? "updated_at";

    const normalized: Mission = {
      id: r.id ?? i + 1,
      title: r[titleKey] ?? "Mission",
      owner: r[ownerKey] ?? "—",
      status: r[statusKey] ?? "Nouveau",
      created_at: r[createdKey] ?? new Date().toISOString(),
      updated_at: r[updatedKey] ?? null,
    };

    return normalized;
  });
}

// Realtime inchangé (facultatif)
export function subscribeMissions(onChange: () => void) {
  const channel = supabase
    .channel("missions-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "missions" },
      () => onChange()
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
