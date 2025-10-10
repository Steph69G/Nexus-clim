import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { getAdminMissionsForMap, subscribeAdminMissionsMap } from "@/api/missions.map";
import type { AdminMapMission } from "@/api/missions.map";
import { fetchTechnicians, subscribeTechnicians } from "@/api/people.geo";
import { fetchAvailableSubcontractors, assignMissionToUser } from "@/api/offers.admin";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/ui/toast/ToastProvider";
import { USE_STATUS_V2 } from "@/config/flags";
import StatusControl from "@/components/missions/StatusControl";
import { useNavigate } from "react-router-dom";

// ---------------- Utils ----------------

// Distance Haversine en kilomètres (retourne Infinity si coords manquantes)
function calculateDistance(
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined
): number {
  if (
    lat1 == null || lng1 == null ||
    lat2 == null || lng2 == null ||
    Number.isNaN(lat1) || Number.isNaN(lng1) || Number.isNaN(lat2) || Number.isNaN(lng2)
  ) {
    return Infinity; // pour marquer "hors périmètre" proprement
  }
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


// ---------------- Statuts (UI) ----------------

// --- Normalisation statuts vers l'UI unique ---
type MissionStatus = "Nouveau" | "Publiée" | "Assignée" | "En cours" | "Bloqué" | "Terminé";

function normalizeStatus(input: string | null | undefined): MissionStatus {
  const s = (input ?? "Nouveau")
    .normalize("NFD")                       // enlève les accents
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase();

  switch (s) {
    case "PUBLIEE":
    case "PUBLISHED":
      return "Publiée";

    case "ASSIGNEE":
    case "ASSIGNED":
      return "Assignée";

    case "EN COURS":
    case "IN_PROGRESS":
    case "IN PROGRESS":
      return "En cours";

    case "BLOQUE":
    case "BLOQUEE":
    case "BLOCKED":
      return "Bloqué";

    case "TERMINE":
    case "TERMINEE":
    case "DONE":
    case "COMPLETED":
      return "Terminé";

    case "NOUVEAU":
    case "DRAFT":
    default:
      return "Nouveau";
  }
}

type StatusFilter = "all" | MissionStatus;

const isPublished = (s: string): s is MissionStatus => s === "Publiée";

// Couleurs par statut
const STATUS_COLORS: Record<MissionStatus, string> = {
  "Nouveau":  "#6B7280", // Gris - Brouillon
  "Publiée":  "#3B82F6", // Bleu - Publiée (recherche intervenant)
  "Assignée": "#8B5CF6", // Violet - Assignée
  "En cours": "#F59E0B", // Orange - Intervention en cours
  "Bloqué":   "#F59E0B", // Orange (ou rouge si tu préfères)
  "Terminé":  "#10B981", // Vert - Terminée
};

const STATUS_LABELS: Record<MissionStatus, string> = {
  "Nouveau":  "Brouillon",
  "Publiée":  "Publiée",
  "Assignée": "Assignée",
  "En cours": "En cours",
  "Bloqué":   "En cours",
  "Terminé":  "Terminée",
};

const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background-color:${color};
      border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const createMyLocationIcon = () => {
  return L.divIcon({
    className: "my-location-marker",
    html: `<div style="font-size:28px;text-shadow:0 2px 4px rgba(0,0,0,0.3);">📍</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
};

const createSTIcon = (color: string) => {
  return L.divIcon({
    className: "st-marker",
    html: `<div style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="20" height="20" fill="${color}" stroke="white" stroke-width="2" rx="2"/>
        <circle cx="14" cy="14" r="4" fill="white"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const createSALIcon = (color: string) => {
  return L.divIcon({
    className: "sal-marker",
    html: `<div style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="14" cy="14" r="4" fill="white"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const STATUS_ICONS: Record<MissionStatus, L.DivIcon> = {
  "Nouveau":  createColoredIcon(STATUS_COLORS["Nouveau"]),
  "Publiée":  createColoredIcon(STATUS_COLORS["Publiée"]),
  "Assignée": createColoredIcon(STATUS_COLORS["Assignée"]),
  "En cours": createColoredIcon(STATUS_COLORS["En cours"]),
  "Bloqué":   createColoredIcon(STATUS_COLORS["Bloqué"]),
  "Terminé":  createColoredIcon(STATUS_COLORS["Terminé"]),
};

function FitToPoints({ points }: { points: MissionPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    // @ts-ignore
    map.fitBounds(points.map(p => [p.lat, p.lng]), { padding: [40, 40] });
  }, [points, map]);
  return null;
}

type MissionPoint = AdminMapMission;

function formatMoney(cents: number | null, cur: string | null) {
  if (cents == null) return "—";
  const eur = (cents / 100).toFixed(2);
  return `${eur} ${cur ?? "EUR"}`;
}

// ---------------- Page ----------------
export default function AdminMapPage() {
  const { push } = useToast();
  const { profile } = useProfile();
  const navigate = useNavigate();

  // Data
  const [allPoints, setAllPoints] = useState<AdminMapMission[]>([]);
  const [technicians, setTechnicians] = useState<{ user_id: string; lat: number; lng: number; updated_at: string }[]>([]);
  const [subcontractors, setSubcontractors] = useState<{
    id: string;
    name: string;
    role: string; // "st" | "sal"
    city: string | null;
    phone: string | null;
    radius_km: number | null;
    lat: number | null;
    lng: number | null;
    location_mode: string | null; // "gps_realtime" | "fixed_address"
  }[]>([]);

  // UI state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [detailsMission, setDetailsMission] = useState<AdminMapMission | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  // Charger missions
  async function loadMissions() {
  try {
    setLoading(true);
    const points = await getAdminMissionsForMap();

    // 🔧 normalise les statuts pour toute la carte + compteurs
    const normalized = (points || []).map(p => ({
      ...p,
      status: normalizeStatus((p as any).status), // force l’UI unique
    }));

    setAllPoints(normalized);
  } catch (e: any) {
    push({ type: "error", message: e?.message ?? "Erreur chargement carte" });
  } finally {
    setLoading(false);
  }
}


  // Charger techniciens + ST/SAL
  async function loadTechnicians() {
    try {
      const [techData, subData] = await Promise.all([fetchTechnicians(), fetchAvailableSubcontractors()]);
      setTechnicians(techData);
      setSubcontractors(subData);
    } catch (e: any) {
      console.warn("Erreur chargement techniciens:", e?.message);
    }
  }

  useEffect(() => {
    loadMissions();
    loadTechnicians();
    const unsub = subscribeAdminMissionsMap(() => loadMissions());
    const unsubTech = subscribeTechnicians(() => loadTechnicians());
    return () => {
      unsub();
      unsubTech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtrage
  const filteredPoints = useMemo(() => {
    if (statusFilter === "all") return allPoints;
    return allPoints.filter(p => p.status === statusFilter);
  }, [allPoints, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const counts: Record<StatusFilter | "total", number> = {
      total: allPoints.length,
      "Nouveau": 0,
      "Publiée": 0,
      "Assignée": 0,
      "En cours": 0,
      "Bloqué": 0,
      "Terminé": 0,
      "all": 0,
    };
    allPoints.forEach(p => {
      if (p.status in counts) counts[p.status as MissionStatus]++;
    });
    return counts;
  }, [allPoints]);

  // Centre carte
  const center = useMemo<[number, number]>(() => {
    if (profile?.lat && profile?.lng) return [profile.lat, profile.lng];
    if (filteredPoints[0]) return [filteredPoints[0].lat, filteredPoints[0].lng];
    return [47.9029, 1.9039]; // Orléans par défaut
  }, [profile, filteredPoints]);

  // Mission sélectionnée (objet)
  cconst selectedMissionObj = useMemo(
  () => allPoints.find(p => p.id === selectedMission) ?? null,
  [selectedMission, allPoints]
);
  );

  // Calcule position + éligibilité pour un ST/SAL par rapport à la mission sélectionnée
  function computeStaffGeoForMission(subInfo: {
    id: string; role: string; radius_km: number | null; lat: number | null; lng: number | null; location_mode: string | null;
  }) {
    const locationMode = subInfo.location_mode || "fixed_address";
    const realtimePosition = technicians.find(t => t.user_id === subInfo.id);

    let lat: number | null = null;
    let lng: number | null = null;
    let positionSource = "";

    if (locationMode === "gps_realtime") {
      if (realtimePosition) {
        lat = realtimePosition.lat;
        lng = realtimePosition.lng;
        positionSource = "gps";
      } else {
        lat = subInfo.lat;
        lng = subInfo.lng;
        positionSource = "fallback";
      }
    } else {
      lat = subInfo.lat;
      lng = subInfo.lng;
      positionSource = "fixed";
    }

    let distance = 0;
    let eligible = false;

    if (selectedMissionObj && lat != null && lng != null) {
      distance = calculateDistance(selectedMissionObj.lat, selectedMissionObj.lng, lat, lng);
      const userRadius = subInfo.radius_km || 25;
      eligible = distance <= userRadius;
    }

    return { lat, lng, positionSource, distance, eligible };
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {/* Header */}
        <header className="text-center">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 border border-slate-200 shadow-xl mb-6">
            <span className="text-indigo-600 text-xl">🗺️</span>
            <span className="text-sm font-medium text-slate-700">Administration cartographique</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Carte Administrative</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Visualisez et gérez vos missions sur la carte avec assignation intelligente
          </p>
          <button
            onClick={loadMissions}
            disabled={loading}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-slate-300 rounded-2xl hover:bg-slate-50 disabled:opacity-50 font-semibold transition-all transform hover:scale-105 shadow-xl"
          >
            {loading ? "Chargement…" : "🔄 Rafraîchir"}
          </button>
        </header>

        {/* Statistiques */}
        <section className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard label="Total" value={stats.total} color="#374151" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
          <StatCard label="Brouillons" value={stats["Nouveau"]} color={STATUS_COLORS["Nouveau"]} active={statusFilter === "Nouveau"} onClick={() => setStatusFilter("Nouveau")} />
          <StatCard label="Publiées" value={stats["Publiée"]} color={STATUS_COLORS["Publiée"]} active={statusFilter === "Publiée"} onClick={() => setStatusFilter("Publiée")} />
          <StatCard label="Assignées" value={stats["Assignée"]} color={STATUS_COLORS["Assignée"]} active={statusFilter === "Assignée"} onClick={() => setStatusFilter("Assignée")} />
          <StatCard label="En cours" value={stats["En cours"]} color={STATUS_COLORS["En cours"]} active={statusFilter === "En cours"} onClick={() => setStatusFilter("En cours")} />
          <StatCard label="Terminées" value={stats["Terminé"]} color={STATUS_COLORS["Terminé"]} active={statusFilter === "Terminé"} onClick={() => setStatusFilter("Terminé")} />
        </section>

        {/* Carte + FAB légende */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl">
          <div className="relative">
            {/* FAB ronde “Légende” en haut à droite */}
            <button
              onClick={() => setLegendOpen(true)}
              className="absolute top-4 right-4 z-[1000] w-11 h-11 rounded-full bg-white/95 backdrop-blur border border-slate-200 shadow-lg hover:bg-slate-50 flex items-center justify-center"
              aria-expanded={legendOpen}
              aria-controls="legend-panel"
              title="Afficher la légende"
            >
              <span className="text-base">🛈</span>
            </button>

            <MapContainer center={center} zoom={12} style={{ height: "70vh", width: "100%" }}>
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Position admin */}
              {profile?.lat && profile?.lng && (
                <Marker position={[profile.lat, profile.lng]} icon={createMyLocationIcon()}>
                  <Popup>
                    <div className="text-center">
                      <div className="font-medium">Ma position (Admin)</div>
                      <div className="text-xs text-slate-600">
                        {profile.lat.toFixed(5)}, {profile.lng.toFixed(5)}
                      </div>
                      {profile.full_name && <div className="text-xs text-blue-600">{profile.full_name}</div>}
                      {profile.city && <div className="text-xs text-slate-500">{profile.city}</div>}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Techniciens ST/SAL */}
              {subcontractors.map((subInfo) => {
                const { lat, lng, positionSource, distance, eligible } = computeStaffGeoForMission(subInfo);
                if (lat == null || lng == null) return null;

                // Couleur pastille ST/SAL :
                // - mission sélectionnée : vert si dans rayon, rouge si hors
                // - sinon : gris (neutre)
                const color = selectedMissionObj
                  ? (eligible ? "#10B981" : "#EF4444")
                  : "#9CA3AF";

                const icon = subInfo.role?.toLowerCase?.() === "st" ? createSTIcon(color) : createSALIcon(color);

                // Bouton d'assignation depuis le popup ST/SAL (si une mission PUBLIÉE est sélectionnée)
                const canAssignThis = !!selectedMissionObj && isPublished(selectedMissionObj.status);
                const showAssignButton = !!selectedMissionObj;

                return (
                  <Marker key={subInfo.id} position={[lat, lng]} icon={icon}>
                    <Popup>
                      <div className="space-y-2 min-w-[220px]">
                        <div className="font-medium">{subInfo.name}</div>
                        <div className="text-sm">
                          <div><strong>Rôle:</strong> {subInfo.role?.toUpperCase()}</div>
                          <div><strong>Ville:</strong> {subInfo.city || "Non renseignée"}</div>
                          {subInfo.phone && <div><strong>Tél:</strong> {subInfo.phone}</div>}
                        </div>
                        <div className="text-xs text-slate-500">
                          {positionSource === "gps" ? (
                            <>📍 GPS temps réel</>
                          ) : positionSource === "fallback" ? (
                            <>⚠️ GPS indisponible — Position du profil</>
                          ) : (
                            <>📌 Adresse fixe (profil)</>
                          )}
                        </div>
                        {selectedMissionObj && (
                          <div className={`text-xs ${eligible ? "text-green-600" : "text-red-600"}`}>
                            Distance: {Math.round(distance * 10) / 10} km / {subInfo.radius_km || 25} km
                            {eligible ? " • Dans le périmètre" : " • Hors périmètre"}
                          </div>
                        )}

                        {showAssignButton && (
                          <button
                            onClick={async () => {
                              if (!canAssignThis) {
                                push({ type: "warning", message: "Publie la mission avant d’assigner." });
                                return;
                              }
                              if (!eligible) {
                                const ok = confirm("Ce technicien est hors de son rayon d’action. Confirmer la dérogation ?");
                                if (!ok) return;
                              }
                              try {
                                setAssigning(subInfo.id);
                                await assignMissionToUser(selectedMissionObj!.id, subInfo.id);
                                push({ type: "success", message: "Mission assignée avec succès" });
                                setSelectedMission(null);
                                loadMissions();
                              } catch (e: any) {
                                push({ type: "error", message: e?.message ?? "Erreur assignation" });
                              } finally {
                                setAssigning(null);
                              }
                            }}
                            disabled={assigning === subInfo.id}
                            className="w-full mt-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {assigning === subInfo.id ? "…" : "Assigner la mission sélectionnée"}
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Missions filtrées */}
              {filteredPoints.map((point) => {
                const icon = STATUS_ICONS[(point.status as MissionStatus) || "Nouveau"];
                const statusLabel = STATUS_LABELS[(point.status as MissionStatus) || "Nouveau"];
                const isSelected = selectedMission === point.id;
                const fullAddress = [point.address, point.zip, point.city].filter(Boolean).join(", ");

                return (
                  <Marker
                    key={point.id}
                    position={[point.lat, point.lng]}
                    icon={icon}
                    eventHandlers={{
                      click: () => {
                        // Option A : on sélectionne pour assigner uniquement si Publiée
                        if (!isPublished(point.status)) {
                          setSelectedMission(null);
                          push({ type: "info", message: "Cette mission n’est pas publiée. Publie-la pour pouvoir l’assigner." });
                          return;
                        }
                        setSelectedMission(isSelected ? null : point.id);
                      }
                    }}
                  >
                    <Popup maxWidth={280}>
                      <div className="space-y-3 min-w-[260px]">
                        <div className="font-bold text-lg text-slate-900">
                          {point.title}
                          {isSelected && <span className="ml-2 text-blue-600">🎯</span>}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[(point.status as MissionStatus) || "Nouveau"] }} />
                          <span className="text-sm font-medium text-slate-700">{statusLabel}</span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span>🔧</span>
                            <span className="text-slate-600">{point.type || "Type non spécifié"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>⏱️</span>
                            <span className="text-slate-600">{point.estimated_duration_min || "—"} min</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>💰</span>
                            <span className="font-bold text-emerald-600 text-base">
                              {formatMoney(point.price_subcontractor_cents, point.currency)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>📅</span>
                            <span className="text-slate-600 text-xs">
                              {point.scheduled_start ? new Date(point.scheduled_start).toLocaleString('fr-FR', { dateStyle: "short", timeStyle: "short" }) : "Non planifié"}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-2">
                          <div className="flex items-start gap-2">
                            <span className="text-slate-500">📍</span>
                            <div className="flex-1">
                              <div className="text-xs font-medium text-slate-600 mb-1">Adresse complète (Admin)</div>
                              <div className="text-sm text-slate-800 font-medium">{fullAddress || "Adresse non renseignée"}</div>
                            </div>
                          </div>
                        </div>

                        {point.assigned_user_name && (
                          <div className="border-t border-slate-200 pt-2">
                            <div className="text-xs font-medium text-slate-600 mb-2">Assigné à</div>
                            <div className="flex items-center gap-2">
                              {point.assigned_user_avatar && (
                                <img src={point.assigned_user_avatar} alt={point.assigned_user_name} className="h-8 w-8 rounded-full object-cover" />
                              )}
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-800">{point.assigned_user_name}</div>
                                {point.assigned_user_phone && (
                                  <a href={`tel:${point.assigned_user_phone}`} className="text-xs text-blue-600 hover:underline">{point.assigned_user_phone}</a>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {USE_STATUS_V2 && (
                          <div className="border-t border-slate-200 pt-3">
                            <StatusControl mission={point} onChanged={loadMissions} />
                          </div>
                        )}

                        <div className="border-t border-slate-200 pt-3 flex gap-2">
                          <button
                            onClick={() => setDetailsMission(point)}
                            className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
                          >
                            📋 Voir détails
                          </button>
                          <button
                            onClick={() => navigate(`/admin/missions/${point.id}`)}
                            className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            ✏️ Modifier
                          </button>
                          {point.status !== "Terminé" && !point.assigned_user_id && (
                            <button
                              onClick={() => {
                                if (!isPublished(point.status)) {
                                  push({ type: "info", message: "Cette mission n’est pas publiée. Publie-la pour pouvoir l’assigner." });
                                  return;
                                }
                                setSelectedMission(isSelected ? null : point.id);
                              }}
                              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              {isSelected ? "✕ Fermer" : "👤 Assigner"}
                            </button>
                          )}
                        </div>

                        {isSelected && (
                          <div className="border-t pt-2">
                            <div className="text-sm font-medium mb-2">Techniciens à proximité :</div>
                            <div className="space-y-2">
                              {subcontractors.map((s) => {
                                const g = computeStaffGeoForMission(s);
                                if (g.lat == null || g.lng == null) return null;

                                const badge = (
                                  <span
                                    className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${g.eligible ? "bg-green-500" : "bg-red-500"}`}
                                    title={g.eligible ? "Dans le rayon" : "Hors rayon"}
                                  />
                                );

                                return (
                                  <div key={s.id} className="text-xs p-2 bg-slate-50 rounded border border-slate-200 flex items-center gap-2">
                                    {badge}
                                    <div className="flex-1">
                                      <div className="font-medium">{s.name}</div>
                                      <div className={`mt-0.5 ${g.eligible ? "text-green-700" : "text-red-600"}`}>
                                        {Math.round(g.distance * 10) / 10} km / {s.radius_km || 25} km
                                      </div>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        // Mission doit être Publiée
                                        if (!selectedMissionObj || !isPublished(selectedMissionObj.status)) {
                                          push({ type: "warning", message: "Publie la mission avant d’assigner." });
                                          return;
                                        }
                                        // Confirmation si hors rayon
                                        if (!g.eligible) {
                                          const ok = confirm("Ce technicien est hors de son rayon d’action. Confirmer la dérogation ?");
                                          if (!ok) return;
                                        }
                                        try {
                                          setAssigning(s.id);
                                          await assignMissionToUser(point.id, s.id); // doit poser status "Assignée" côté API
                                          push({ type: "success", message: "Mission assignée avec succès" });
                                          setSelectedMission(null);
                                          loadMissions();
                                        } catch (e: any) {
                                          push({ type: "error", message: e?.message ?? "Erreur assignation" });
                                        } finally {
                                          setAssigning(null);
                                        }
                                      }}
                                      disabled={assigning === s.id}
                                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      {assigning === s.id ? "…" : "Assigner"}
                                    </button>
                                  </div>
                                );
                              }).filter(Boolean)}
                            </div>

                            {/* Si aucun, message neutre */}
                            {subcontractors.length === 0 && (
                              <div className="text-xs text-gray-500 mt-1">Aucun technicien disponible</div>
                            )}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Ajuster la vue aux points filtrés */}
              {filteredPoints.length > 0 && <FitToPoints points={filteredPoints} />}
            </MapContainer>
          </div>
        </div>

        {/* Résumé */}
        <div className="flex items-center justify-between text-sm text-slate-700 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
          <div>
            Affichage de <strong className="text-slate-900 text-base">{filteredPoints.length}</strong> mission(s)
            {statusFilter !== "all" && (
              <span> avec le statut <strong className="text-slate-900 text-base">{STATUS_LABELS[statusFilter as MissionStatus]}</strong></span>
            )}
          </div>
          <div>
            <strong className="text-slate-900 text-base">{technicians.length}</strong> technicien(s) connecté(s)
            {selectedMission && (
              <span className="ml-2 text-blue-600">
                • Mission sélectionnée: {allPoints.find(p => p.id === selectedMission)?.title}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modale de détails */}
      {detailsMission && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setDetailsMission(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 rounded-t-3xl flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Détails de la mission</h2>
              <button
                onClick={() => setDetailsMission(null)}
                className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{detailsMission.title}</h3>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[(detailsMission.status as MissionStatus) || "Nouveau"] }} />
                  <span className="text-sm font-medium text-slate-700">
                    {STATUS_LABELS[(detailsMission.status as MissionStatus) || "Nouveau"]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">Type d'intervention</div>
                    <div className="text-base text-slate-900 flex items-center gap-2">
                      <span>🔧</span>
                      <span>{detailsMission.type || "Non spécifié"}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">Durée estimée</div>
                    <div className="text-base text-slate-900 flex items-center gap-2">
                      <span>⏱️</span>
                      <span>{detailsMission.estimated_duration_min || "—"} minutes</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">Créneau prévu</div>
                    <div className="text-base text-slate-900 flex items-center gap-2">
                      <span>📅</span>
                      <span>
                        {detailsMission.scheduled_start
                          ? new Date(detailsMission.scheduled_start).toLocaleString('fr-FR', { dateStyle: "long", timeStyle: "short" })
                          : "Non planifié"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">Rémunération ST</div>
                    <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
                      <span>💰</span>
                      <span>{formatMoney(detailsMission.price_subcontractor_cents, detailsMission.currency)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">Adresse complète (Admin)</div>
                    <div className="text-base text-slate-900 flex items-start gap-2">
                      <span>📍</span>
                      <div className="font-medium">
                        {[detailsMission.address, detailsMission.zip, detailsMission.city].filter(Boolean).join(", ") || "Adresse non renseignée"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {detailsMission.description && (
                <div className="border-t border-slate-200 pt-6">
                  <div className="text-xs font-medium text-slate-500 uppercase mb-2">Description</div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl p-4">
                    {detailsMission.description}
                  </div>
                </div>
              )}

              {detailsMission.assigned_user_name && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-800 mb-3">
                    <span>✅</span>
                    <span className="font-medium">Mission assignée</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {detailsMission.assigned_user_avatar && (
                      <img
                        src={detailsMission.assigned_user_avatar}
                        alt={detailsMission.assigned_user_name}
                        className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{detailsMission.assigned_user_name}</div>
                      {detailsMission.assigned_user_phone && (
                        <a
                          href={`tel:${detailsMission.assigned_user_phone}`}
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          📞 {detailsMission.assigned_user_phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {USE_STATUS_V2 && (
                <div className="border-t border-slate-200 pt-6">
                  <StatusControl mission={detailsMission} onChanged={() => { loadMissions(); setDetailsMission(null); }} />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setDetailsMission(null)}
                  className="flex-1 px-6 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 font-medium text-slate-700 transition-colors"
                >
                  Fermer
                </button>
                <button
                  onClick={() => navigate(`/admin/missions/${detailsMission.id}`)}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors"
                >
                  ✏️ Modifier
                </button>
                {detailsMission.status !== "Terminé" && !detailsMission.assigned_user_id && (
                  <button
                    onClick={() => {
                      if (!isPublished(detailsMission.status)) {
                        push({ type: "info", message: "Cette mission n’est pas publiée. Publie-la pour pouvoir l’assigner." });
                        return;
                      }
                      setSelectedMission(detailsMission.id);
                      setDetailsMission(null);
                    }}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
                  >
                    👤 Assigner cette mission
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay Légende détaillée */}
      {legendOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setLegendOpen(false)}
        >
          <div
            id="legend-panel"
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Légende de la carte</h3>
              <button
                onClick={() => setLegendOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center"
                aria-label="Fermer la légende"
              >
                ✕
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Statuts */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="font-medium text-slate-800 mb-3">Statuts des missions</div>
                <div className="space-y-2 text-sm">
                  <LegendRow dot={STATUS_COLORS["Nouveau"]} label="Brouillon" desc="Mission non publiée" />
                  <LegendRow dot={STATUS_COLORS["Publiée"]} label="Publiée" desc="Offre visible, en recherche d’intervenant" />
                  <LegendRow dot={STATUS_COLORS["Assignée"]} label="Assignée" desc="Technicien affecté" />
                  <LegendRow dot={STATUS_COLORS["En cours"]} label="En cours" desc="Intervention démarrée" />
                  <LegendRow dot={STATUS_COLORS["Terminé"]} label="Terminée" desc="Mission clôturée" />
                </div>
              </div>

              {/* Rôles & périmètre */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="font-medium text-slate-800 mb-3">Rôles & périmètre</div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 28 28"><rect x="4" y="4" width="20" height="20" fill="#9CA3AF" rx="2"/></svg>
                    <span className="text-slate-700">Sous-traitant (carré)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 28 28"><circle cx="14" cy="14" r="10" fill="#9CA3AF"/></svg>
                    <span className="text-slate-700">Salarié (rond)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow" />
                    <span className="text-slate-700">Dans le rayon / éligible</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow" />
                    <span className="text-slate-700">Hors rayon</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📍</span>
                    <span className="text-slate-700">Votre position (admin)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setLegendOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Sub components ----------------

function StatCard({
  label,
  value,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-3xl border-2 text-left transition-all transform hover:scale-105 ${
        active
          ? "border-slate-400 bg-gradient-to-r from-slate-100 to-blue-100 shadow-2xl"
          : "border-slate-200 bg-white hover:bg-slate-50 shadow-xl"
      }`}
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="w-6 h-6 rounded-full shadow-lg border-2 border-white" style={{ backgroundColor: color }} />
        <div className="text-sm text-slate-700 font-semibold">{label}</div>
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
    </button>
  );
}

function LegendRow({ dot, label, desc }: { dot: string; label: string; desc?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow" style={{ backgroundColor: dot }} />
      <div>
        <div className="font-medium text-slate-800">{label}</div>
        {desc && <div className="text-slate-600 text-xs">{desc}</div>}
      </div>
    </div>
  );
}
