// src/components/assign/AssignToUserPopover.tsx
// ⚠️ Ne calcule PAS la distance : on prend ton flag existant depuis la source qui alimente la carte.
type StaffLite = {
  id: string;
  display_name: string;
  role: "ST" | "SAL";
  // flag déjà calculé chez toi (même logique que la carte) :
  withinRadius: boolean;   // vert/rouge comme la légende
  distanceKm?: number;     // si tu l’as déjà, sinon optionnel
};

export default function AssignToUserPopover({
  mission, currentUser, trigger, fetchStaffForMission, onAssigned
}: {
  mission: { id: string; status: "BROUILLON"|"PUBLIEE"|"ASSIGNEE" };
  currentUser: { id: string; role: "ADMIN"|"ST"|"SAL" };
  trigger: React.ReactNode;
  // 👇 Adaptateur : tu me fournis EXACTEMENT la même liste que la carte (avec withinRadius+distance)
  fetchStaffForMission: (missionId: string) => Promise<StaffLite[]>;
  onAssigned?: (assignee: StaffLite) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<StaffLite[]>([]);

  const mayAssign = currentUser.role === "ADMIN" && mission.status === "PUBLIEE";

  useEffect(() => {
    if (!open) return;
    (async () => setStaff(await fetchStaffForMission(mission.id)))();
  }, [open, mission.id, fetchStaffForMission]);

  async function handleAssign(s: StaffLite) {
    if (!mayAssign) return alert("Publie la mission avant d’assigner.");
    if (!s.withinRadius) {
      const ok = confirm("Ce technicien est hors de son rayon d’action. Confirmer la dérogation ?");
      if (!ok) return;
    }
    try {
      setLoading(true);
      // ⚠️ on garde TON flux d’affectation existant (ex: update ou RPC)
      await assignMissionToUser(mission.id, s.id); 
      onAssigned?.(s);
      setOpen(false);
    } catch (e:any) {
      alert(e.message ?? "Erreur d’assignation");
    } finally {
      setLoading(false);
    }
  }

  const sorted = [...staff].sort((a,b) => {
    const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
    return da - db;
  });

  return (
    <div className="relative inline-block">
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border bg-white shadow-xl p-2">
          {!mayAssign && (
            <div className="px-2 py-2 text-sm text-amber-700 bg-amber-50 rounded-lg mb-2">
              Mission non publiée — assignation indisponible.
            </div>
          )}
          <div className="max-h-72 overflow-auto">
            {sorted.map(s => (
              <button
                key={s.id}
                onClick={() => handleAssign(s)}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50
                  ${s.withinRadius ? "" : "opacity-80"}`}
                title={s.withinRadius ? "Dans le rayon" : "Hors rayon (dérogation possible)"}
                disabled={!mayAssign || loading}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${s.withinRadius ? "bg-green-500" : "bg-red-500"}`} />
                  <div className="font-medium">{s.display_name}</div>
                  {typeof s.distanceKm === "number" && (
                    <div className="ml-auto text-xs text-gray-500">
                      {s.distanceKm.toFixed(1)} km
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500">{s.role}</div>
              </button>
            ))}
          </div>
          <div className="flex justify-end p-2">
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
