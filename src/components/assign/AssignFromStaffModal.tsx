import { useEffect, useMemo, useState } from "react";

export type MissionLite = {
  id: string;
  title: string | null;
  status: "BROUILLON" | "PUBLIEE" | "ASSIGNEE" | "EN_COURS" | "TERMINEE";
  withinRadius: boolean;        // déjà calculé dans TON système pour CE staff
  distanceKm?: number | null;   // optionnel
};

export default function AssignFromStaffModal({
  open,
  onClose,
  staff,
  missions,
  onAssign, // (missionId, staffId) => Promise<void>
}: {
  open: boolean;
  onClose: () => void;
  staff: { id: string; display_name: string };
  missions: MissionLite[]; // ⚠️ ne pas recalculer — réutiliser TES flags/couleurs
  onAssign: (missionId: string, staffId: string) => Promise<void>;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const copy = [...missions];
    copy.sort((a, b) => {
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
    return copy;
  }, [missions]);

  useEffect(() => {
    if (!open) setLoadingId(null);
  }, [open]);

  if (!open) return null;

  async function pick(m: MissionLite) {
    if (m.status !== "PUBLIEE") return;
    if (!m.withinRadius) {
      const ok = confirm("Cette mission est hors du rayon de ce technicien. Confirmer la dérogation ?");
      if (!ok) return;
    }
    try {
      setLoadingId(m.id);
      await onAssign(m.id, staff.id);
      onClose();
    } catch (e: any) {
      alert(e?.message ?? "Erreur d’assignation");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-4">
        <div className="text-lg font-semibold mb-2">
          Assigner une mission à {staff.display_name}
        </div>
        <div className="text-xs text-gray-500 mb-3">
          Seules les missions <b>publiées</b> sont éligibles.
        </div>
        <div className="max-h-[60vh] overflow-auto divide-y">
          {sorted.map((m) => (
            <button
              key={m.id}
              onClick={() => pick(m)}
              className="w-full text-left py-3 hover:bg-gray-50 px-2 rounded-lg"
              disabled={loadingId === m.id || m.status !== "PUBLIEE"}
              title={
                m.status !== "PUBLIEE"
                  ? "Mission non publiée"
                  : m.withinRadius
                  ? "Dans le rayon"
                  : "Hors rayon (dérogation possible)"
              }
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    m.withinRadius ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <div className="font-medium truncate">{m.title ?? "Mission"}</div>
                {typeof m.distanceKm === "number" && (
                  <div className="ml-auto text-xs text-gray-500">
                    {m.distanceKm.toFixed(1)} km
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">Statut : {m.status}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
