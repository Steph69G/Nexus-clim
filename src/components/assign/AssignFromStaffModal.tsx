// src/components/assign/AssignFromStaffModal.tsx
type MissionLite = {
  id: string;
  title: string|null;
  status: "BROUILLON"|"PUBLIEE"|"ASSIGNEE"|"EN_COURS"|"TERMINEE";
  distanceKm?: number;
  withinRadius: boolean; // même flag que la carte, mais calculé ici pour CE staff
};

export default function AssignFromStaffModal({
  staffId, open, onClose, fetchPublishedMissionsForStaff, onAssigned
}: {
  staffId: string;
  open: boolean;
  onClose: () => void;
  // 👇 Adaptateur : renvoie les missions publiées à portée + hors portée (avec withinRadius+distance)
  fetchPublishedMissionsForStaff: (staffId: string) => Promise<MissionLite[]>;
  onAssigned?: (mission: MissionLite) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [missions, setMissions] = useState<MissionLite[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => setMissions(await fetchPublishedMissionsForStaff(staffId)))();
  }, [open, staffId, fetchPublishedMissionsForStaff]);

  async function handlePick(m: MissionLite) {
    if (m.status !== "PUBLIEE") return; // cohérence Option A
    if (!m.withinRadius) {
      const ok = confirm("Cette mission est hors du rayon de ce technicien. Confirmer la dérogation ?");
      if (!ok) return;
    }
    try {
      setLoading(true);
      await assignMissionToUser(m.id, staffId); // on garde ton flux existant
      onAssigned?.(m);
      onClose();
    } catch (e:any) {
      alert(e.message ?? "Erreur d’assignation");
    } finally {
      setLoading(false);
    }
  }

  const sorted = [...missions].sort((a,b) => {
    const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
    return da - db;
  });

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-4">
        <div className="text-lg font-semibold mb-2">Assigner une mission à ce technicien</div>
        <div className="text-xs text-gray-500 mb-3">Seules les missions <b>publiées</b> sont éligibles.</div>
        <div className="max-h-[60vh] overflow-auto divide-y">
          {sorted.map(m => (
            <button
              key={m.id}
              onClick={() => handlePick(m)}
              className="w-full text-left py-3 hover:bg-gray-50 px-2 rounded-lg"
              disabled={loading || m.status !== "PUBLIEE"}
              title={
                m.status !== "PUBLIEE" ? "Mission non publiée" :
                m.withinRadius ? "Dans le rayon" : "Hors rayon (dérogation possible)"
              }
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${m.withinRadius ? "bg-green-500" : "bg-red-500"}`} />
                <div className="font-medium truncate">{m.title ?? "Mission"}</div>
                {typeof m.distanceKm === "number" && (
                  <div className="ml-auto text-xs text-gray-500">{m.distanceKm.toFixed(1)} km</div>
                )}
              </div>
              <div className="text-xs text-gray-500">Statut : {m.status}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
