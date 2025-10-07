import { useEffect, useMemo, useState } from "react";
import { fetchMyMissions, subscribeMyMissions, type MyMission } from "@/api/missions.my";
import { useToast } from "@/ui/toast/ToastProvider";

function cents(c: number | null, cur: string | null) {
  if (c == null) return "—";
  return `${(c / 100).toFixed(2)} ${cur ?? "EUR"}`;
}

export default function TechMissionsPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<MyMission[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setRows(await fetchMyMissions());
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur chargement missions" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const unsub = subscribeMyMissions(() => load());
    return () => unsub();
  }, []);

  const { upcoming, inProgress, completed, unscheduled } = useMemo(() => {
    const now = new Date();
    const upcoming = rows.filter(m => 
      m.scheduled_start && 
      new Date(m.scheduled_start) > now &&
      m.status !== "Terminé"
    ).sort((a, b) => new Date(a.scheduled_start!).getTime() - new Date(b.scheduled_start!).getTime());
    
    const inProgress = rows.filter(m => 
      m.status === "Bloqué" || // En cours de traitement
      (m.scheduled_start && new Date(m.scheduled_start) <= now && m.status !== "Terminé")
    );
    
    const completed = rows.filter(m => m.status === "Terminé");
    
    const unscheduled = rows.filter(m => 
      !m.scheduled_start && 
      m.status !== "Terminé"
    );

    return { upcoming, inProgress, completed, unscheduled };
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Chargement des missions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mes missions</h1>
        <button
          onClick={load}
          className="px-3 py-1.5 border rounded hover:bg-gray-50"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-semibold text-blue-600">{upcoming.length}</div>
          <div className="text-sm text-gray-600">À venir</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-semibold text-orange-600">{inProgress.length}</div>
          <div className="text-sm text-gray-600">En cours</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-semibold text-green-600">{completed.length}</div>
          <div className="text-sm text-gray-600">Terminées</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-semibold text-gray-600">{unscheduled.length}</div>
          <div className="text-sm text-gray-600">Non planifiées</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center">
          <div className="text-4xl mb-3">🔧</div>
          <h3 className="font-medium text-gray-900 mb-2">Aucune mission</h3>
          <p className="text-gray-600 text-sm">
            Vous n'avez pas encore de missions assignées. Consultez les offres disponibles pour en accepter.
          </p>
        </div>
      ) : (
        <>
          {/* Missions à venir */}
          {upcoming.length > 0 && (
            <MissionSection
              title="🕒 Missions à venir"
              missions={upcoming}
              emptyMessage="Aucune mission programmée"
            />
          )}

          {/* Missions en cours */}
          {inProgress.length > 0 && (
            <MissionSection
              title="🔧 Missions en cours"
              missions={inProgress}
              emptyMessage="Aucune mission en cours"
            />
          )}

          {/* Missions non planifiées */}
          {unscheduled.length > 0 && (
            <MissionSection
              title="📋 Missions non planifiées"
              missions={unscheduled}
              emptyMessage="Aucune mission non planifiée"
            />
          )}

          {/* Missions terminées */}
          {completed.length > 0 && (
            <MissionSection
              title="✅ Missions terminées"
              missions={completed}
              emptyMessage="Aucune mission terminée"
              collapsed={true}
            />
          )}
        </>
      )}
    </div>
  );
}

function MissionSection({ 
  title, 
  missions, 
  emptyMessage, 
  collapsed = false 
}: { 
  title: string; 
  missions: MyMission[]; 
  emptyMessage: string;
  collapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  return (
    <section className="bg-white border rounded-lg">
      <div 
        className="p-4 border-b cursor-pointer hover:bg-gray-50"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{title} ({missions.length})</h2>
          <span className="text-gray-400">
            {isCollapsed ? "▶" : "▼"}
          </span>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="p-4">
          {missions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">{emptyMessage}</p>
          ) : (
            <div className="space-y-3">
              {missions.map((mission) => (
                <MissionCard key={mission.id} mission={mission} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function MissionCard({ mission }: { mission: MyMission }) {
  const mapsUrl = mission.lat && mission.lng
    ? `https://www.google.com/maps/search/?api=1&query=${mission.lat},${mission.lng}`
    : mission.address 
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${mission.address} ${mission.city ?? ""}`)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mission.city ?? "")}`;

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Terminé": return "text-green-600 bg-green-50";
      case "Bloqué": return "text-orange-600 bg-orange-50";
      case "En cours": return "text-blue-600 bg-blue-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="font-medium">{mission.title ?? "Mission"}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(mission.status)}`}>
              {mission.status ?? "—"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="space-y-1">
              <div><span className="font-medium">Type :</span> {mission.type ?? "—"}</div>
              <div><span className="font-medium">Client :</span> {mission.client_name ?? "—"}</div>
              <div><span className="font-medium">Ville :</span> {mission.city ?? "—"}</div>
            </div>
            <div className="space-y-1">
              <div><span className="font-medium">Durée :</span> {mission.estimated_duration_min ?? "—"} min</div>
              <div><span className="font-medium">Rémunération :</span> 
                <span className="font-semibold text-green-600 ml-1">
                  {cents(mission.price_subcontractor_cents, mission.currency)}
                </span>
              </div>
              <div><span className="font-medium">Créneau :</span> 
                {mission.scheduled_start ? new Date(mission.scheduled_start).toLocaleString() : "Non planifié"}
              </div>
            </div>
          </div>

          {mission.address && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Adresse :</span>
              <span className="ml-1">{mission.address} {mission.zip ? `(${mission.zip})` : ""}</span>
              <div className="text-green-600 text-xs mt-1">
                ✅ Adresse complète révélée car vous avez accepté cette mission
              </div>
            </div>
          )}

          {mission.description && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Description :</span>
              <p className="mt-1 text-gray-600">{mission.description}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 border rounded hover:bg-gray-50 text-sm text-center"
            title="Ouvrir l'itinéraire"
          >
            🗺️ Itinéraire
          </a>
          
          {mission.status !== "Terminé" && (
            <button
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              title="Démarrer la mission"
            >
              ▶️ Démarrer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}