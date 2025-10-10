import { useEffect, useMemo, useState } from "react";

export type StaffLite = {
  id: string;
  display_name: string;
  role: "ST" | "SAL";
  withinRadius: boolean;       // déjà calculé dans TON système (vert/rouge)
  distanceKm?: number | null;  // optionnel si tu l’as
};

export default function AssignToUserPopover({
  open,
  onClose,
  mission,
  staffCandidates,
  onAssign, // (missionId, staffId) => Promise<void>
}: {
  open: boolean;
  onClose: () => void;
  mission: { id: string; status: "BROUILLON" | "PUBLIEE" | "ASSIGNEE" };
  staffCandidates: StaffLite[]; // ⚠️ passe-moi la même liste que tu utilises déjà pour colorer la carte
  onAssign: (missionId: string, staffId: string) => Promise<void>;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const mayAssign = mission.status === "PUBLIEE";

  const sorted = useMemo(() => {
    const copy = [...staffCandidates];
    copy.sort((a, b) => {
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
    return copy;
  }, [staffCandidates]);

  useEffect(() => {
    if (!open) setLoadingId(null);
  }, [open]);

  if (!open) return null;

  async function handleClick(s: StaffLite) {
    if (!mayAssign) {
      alert("Publie la mission avant d’assigner.");
      return;
    }
    if (!s.withinRadius) {
      const ok = confirm("Ce technicien est hors de son rayon d’action. Confirmer la dérogation ?");
      if (!ok) return;
    }
    try {
      setLoadingId(s.id);
      await onAssign(mission.id, s.id);
      onClose();
    } catch (e: any) {
      alert(e?.message ?? "Erreur d’assignation");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="absolute right-4 top-4 z-50 w-80 rounded-2xl border bg-white shadow-xl p-2">
      {!mayAssign && (
        <div className="px-2 py-2 text-sm text-amber-700 bg-amber-50 rounded-lg mb-2">
          Mission non publiée — assignation indisponible.
        </div>
      )}
      <div className="max-h-80 overflow-auto">
        {sorted.map((s) => (
          <button
            key={s.id}
            onClick={() => handleClick(s)}
            className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 ${
              s.withinRadius ? "" : "opacity-80"
            }`}
            disabled={loadingId === s.id}
            title={s.withinRadius ? "Dans le rayon" : "Hors rayon (dérogation possible)"}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  s.withinRadius ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <div className="font-medium">{s.display_name}</div>
              <div className="text-xs text-gray-500">{s.role}</div>
              {typeof s.distanceKm === "number" && (
                <div className="ml-auto text-xs text-gray-500">
                  {s.distanceKm.toFixed(1)} km
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
      <div className="flex justify-end p-2">
        <button className="btn btn-ghost" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}
