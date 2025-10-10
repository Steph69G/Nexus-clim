// src/pages/map/AdminMapPage.tsx
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

/* ---------------- Utils ---------------- */

// Distance Haversine en kilomètres (Infinity si coords manquantes)
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
    return Infinity;
  }
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad((lat2 as number) - (lat1 as number));
  const dLng = toRad((lng2 as number) - (lng1 as number));
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1 as number)) * Math.cos(toRad(lat2 as number)) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Normalisation statuts → UI unique
type MissionStatus = "Nouveau" | "Publiée" | "Assignée" | "En cours" | "Bloqué" | "Terminé";
function normalizeStatus(input: string | null | undefined): MissionStatus {
  const s = (input ?? "Nouveau")
    .normalize("NFD")
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

// Couleurs par statut
const STATUS_COLORS: Record<MissionStatus, string> = {
  "Nouveau":  "#6B7280",
  "Publiée":  "#3B82F6",
  "Assignée": "#8B5CF6",
  "En cours": "#F59E0B",
  "Bloqué":   "#F59E0B",
  "Terminé":  "#10B981",
};
const STATUS_LABELS: Record<MissionStatus, string> = {
  "Nouveau":  "Brouillon",
  "Publiée":  "Publiée",
  "Assignée": "Assignée",
  "En cours": "En cours",
  "Bloqué":   "En cours",
  "Terminé":  "Terminée",
};

const createColoredIcon = (color: string) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="width:20px;height:20px;border-radius:50%;
      background-color:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

const createMyLocationIcon = () =>
  L.divIcon({
    className: "my-location-marker",
    html: `<div style="font-size:28px;text-shadow:0 2px 4px rgba(0,0,0,0.3);">📍</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });

const createSTIcon = (color: string) =>
  L.divIcon({
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

const createSALIcon = (color: string) =>
  L.divIcon({
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

const STATUS_ICONS: Record<MissionStatus, L.DivIcon> = {
  "Nouveau":  createColoredIcon(STATUS_COLORS["Nouveau"]),
  "Publiée":  createColoredIcon(STATUS_COLORS["Publiée"]),
  "Assignée": createColoredIcon(STATUS_COLORS["Assignée"]),
  "En cours": createColoredIcon(STATUS_COLORS["En cours"]),
  "Bloqué":   createColoredIcon(STATUS_COLORS["Bloqué"]),
  "Terminé":  createColoredIcon(STATUS_COLORS["Terminé"]),
};

// Helper position intervenant (GPS si dispo, sinon profil)
function getSubLocation(
  sub: {
    id: string;
    lat: number | null;
    lng: number | null;
    location_mode: string | null;
  },
  technicians: { user_id: string; lat: number; lng: number }[]
): { lat: number | null; lng: number | null; source: "gps" | "fallback" | "fixed" | "none" } {
  const mode = sub.location_mode || "fixed_address";
  if (mode === "gps_realtime") {
    const rt = technicians.find(t => t.user_id === sub.id);
    if (rt) return { lat: rt.lat, lng: rt.lng, source: "gps" };
    return { lat: sub.lat, lng: sub.lng, source: "fallback" };
  }
  if (sub.lat != null && sub.lng != null) {
    return { lat: sub.lat, lng: sub.lng, source: "fixed" };
  }
  return { lat: null, lng: null, source: "none" };
}

function FitToPoints({ points }: { points: MissionPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    // @ts-ignore
    map.fitBounds(points.map(p => [p.lat, p.lng]), { padding: [40, 40] });
  }, [points, map]);
  return null;
}

type StatusFilter = "all" | MissionStatus;
type MissionPoint = AdminMapMission & { status: MissionStatus };

function formatMoney(cents: number | null, cur: string | null) {
  if (cents == null) return "—";
  const eur = (cents / 100).toFixed(2);
  return `${eur} ${cur ?? "EUR"}`;
}

/* ---------------- Page ---------------- */
export default function AdminMapPage() {
  const { push } = useToast();
  const { profile } = useProfile();
  const navigate = useNavigate();

  // Data
  const [allPoints, setAllPoints] = useState<MissionPoint[]>([]);
  const [technicians, setTechnicians] = useState<{ user_id: string; lat: number; lng: number; updated_at: string }[]>([]);
  const [subcontractors, setSubcontractors] = useState<{
    id: string;
    name: string;
    role: string;
    city: string | null;
    phone: string | null;
    radius_km: number | null;
    lat: number | null;
    lng: number | null;
    location_mode: string | null;
  }[]>([]);

  // UI state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);

  // Sélections bilatérales
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  // Détails & autres
  const [detailsMission, setDetailsMission] = useState<MissionPoint | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  // Objets sélectionnés
  const selectedMissionObj = useMemo(
    () => allPoints.find(p => p.id === selectedMission) ?? null,
    [selectedMission, allPoints]
  );
  const selectedSub = useMemo(
    () => subcontractors.find(s => s.id === selectedSubId) ?? null,
    [selectedSubId, subcontractors]
  );

  // Charger missions + techniciens
  async function loadMissions() {
    try {
      setLoading(true);
      const points = await getAdminMissionsForMap();
      const normalized: MissionPoint[] = (points || []).map(p => ({
        ...p,
        status: normalizeStatus((p as any).status),
      }));
      setAllPoints(normalized);
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur chargement carte" });
    } finally {
      setLoading(false);
    }
  }
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

  // Filtrage par statut
  const filteredPoints = useMemo(() => {
    if (statusFilter === "all") return allPoints;
    return allPoints.filter(p => p.status === statusFilter);
  }, [allPoints, statusFilter]);

  // Stats
  theStats: {
  }
  const stats = useMemo(() => {
    const counts = {
      total: allPoints.length,
      "Nouveau": 0,
      "Publiée": 0,
      "Assignée": 0,
      "En cours": 0,
      "Bloqué": 0,
      "Terminé": 0,
    } as Record<MissionStatus | "total", number>;
    allPoints.forEach(p => { counts[p.status]++; });
    return counts;
  }, [allPoints]);

  // Centre carte
  const center = useMemo<[number, number]>(() => {
    if (profile?.lat && profile?.lng) return [profile.lat, profile.lng];
    if (filteredPoints[0]) return [filteredPoints[0].lat, filteredPoints[0].lng];
    return [47.9029, 1.9039]; // Orléans par défaut
  }, [profile, filteredPoints]);

  // Missions assignables pour l’intervenant sélectionné
  const missionsAssignablePourSub = useMemo(() => {
    if (!selectedSub) return [];
    const loc = getSubLocation(selectedSub, technicians);
    if (loc.lat == null || loc.lng == null) return [];
    const r = selectedSub.radius_km || 25;
    return allPoints
      .filter(p => p.status !== "Terminé" && !p.assigned_user_id) // non terminées et non assignées
      .map(p => ({ p, d: calculateDistance(p.lat, p.lng, loc.lat!, loc.lng!) }))
      .filter(({ d }) => d <= r)
      .sort((a, b) => a.d - b.d)
      .map(({ p }) => p);
  }, [selectedSub, technicians, allPoints]);

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
            onClick={() => { setSelectedMission(null); setSelectedSubId(null); loadMissions(); }}
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
            {/* Chips sélection */}
            {(selectedMissionObj || selectedSub) && (
              <div className="absolute top-4 left-4 z-[1000] space-y-2">
                {selectedMissionObj && (
                  <div className="bg-white/95 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 shadow-lg flex items-center gap-3">
                    <span className="text-xs text-slate-600">Mission :</span>
                    <strong className="text-xs text-slate-900">{selectedMissionObj.title || "Sans titre"}</strong>
                    <button
                      onClick={() => setSelectedMission(null)}
                      className="ml-1 text-slate-500 hover:text-slate-800"
                      title="Effacer mission"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {selectedSub && (
                  <div className="bg-white/95 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 shadow-lg flex items-center gap-3">
                    <span className="text-xs text-slate-600">Intervenant :</span>
                    <strong className="text-xs text-slate-900">{selectedSub.name || "—"}</strong>
                    <button
                      onClick={() => setSelectedSubId(null)}
                      className="ml-1 text-slate-500 hover:text-slate-800"
                      title="Effacer intervenant"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* FAB légende */}
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

              {/* Intervenants ST/SAL */}
              {subcontractors.map((subInfo) => {
                const locationMode = subInfo.location_mode || "fixed_address";
                const realtimePosition = technicians.find(t => t.user_id === subInfo.id);

                let lat: number | null = null;
                let lng: number | null = null;
                let positionSource: "gps" | "fallback" | "fixed" | "none" = "none";

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
                if (!lat || !lng) return null;

                // Si mission sélectionnée → colorer selon éligibilité
                let isEligibleForSelectedMission = false;
                let distanceToSelected = 0;
                if (selectedMissionObj) {
                  distanceToSelected = calculateDistance(selectedMissionObj.lat, selectedMissionObj.lng, lat, lng);
                  const userRadius = subInfo.radius_km || 25;
                  isEligibleForSelectedMission = distanceToSelected <= userRadius;
                }
                const baseColor = selectedMissionObj
                  ? (isEligibleForSelectedMission ? "#10B981" : "#EF4444")
                  : "#10B981";
                const icon = subInfo.role?.toLowerCase() === "st" ? createSTIcon(baseColor) : createSALIcon(baseColor);

                return (
                  <Marker
                    key={subInfo.id}
                    position={[lat, lng]}
                    icon={icon}
                    eventHandlers={{
                      click: () => {
                        setSelectedSubId(subInfo.id);
                      },
                    }}
                  >
                    <Popup>
                      <div className="space-y-2 min-w-[260px]">
                        <div className="font-medium">{subInfo.name}</div>
                        <div className="text-sm">
                          <div><strong>Rôle:</strong> {(subInfo.role || "").toUpperCase()}</div>
                          <div><strong>Ville:</strong> {subInfo.city || "Non renseignée"}</div>
                          {subInfo.phone && <div><strong>Tél:</strong> {subInfo.phone}</div>}
                        </div>
                        <div className="text-xs text-slate-500">
                          {positionSource === "gps" ? "📍 GPS temps réel"
                            : positionSource === "fallback" ? "⚠️ GPS non dispo — Position du profil"
                            : "📌 Adresse fixe (profil)"}
                        </div>

                        {/* Si une mission est déjà sélectionnée → assignation directe */}
                        {selectedMissionObj ? (
                          <>
                            <div className="text-xs mt-1">
                              <div className="font-medium">
                                Mission : <span className="text-slate-800">{selectedMissionObj.title || "Sans titre"}</span>
                              </div>
                              <div className={`${isEligibleForSelectedMission ? "text-green-600" : "text-red-600"}`}>
                                Distance: {Math.round(distanceToSelected * 10) / 10} km / {subInfo.radius_km || 25} km
                                {isEligibleForSelectedMission ? " ✅ Dans le périmètre" : " ❌ Hors périmètre"}
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                if (!isEligibleForSelectedMission) {
                                  const ok = confirm("Cet intervenant est hors de son rayon d’action. Continuer quand même ?");
                                  if (!ok) return;
                                }
                                try {
                                  setAssigning(subInfo.id);
                                  await assignMissionToUser(selectedMissionObj.id, subInfo.id);
                                  push({ type: "success", message: "Mission assignée avec succès" });
                                  setSelectedMission(null);
                                  setSelectedSubId(null);
                                  loadMissions();
                                } catch (e: any) {
                                  push({ type: "error", message: e?.message ?? "Erreur assignation" });
                                } finally {
                                  setAssigning(null);
                                }
                              }}
                              disabled={assigning === subInfo.id}
                              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {assigning === subInfo.id ? "…" : "Assigner cette mission"}
                            </button>
                          </>
                        ) : (
                          /* Sinon : missions assignables POUR cet intervenant (dans son rayon) */
                          <div className="mt-2">
                            <div className="text-sm font-medium mb-1">Missions assignables :</div>
                            <div className="max-h-40 overflow-auto space-y-1">
                              {missionsAssignablePourSub.length === 0 ? (
                                <div className="text-xs text-slate-500">Aucune mission dans le périmètre</div>
                              ) : (
                                missionsAssignablePourSub.slice(0, 8).map(m => {
                                  const d = calculateDistance(m.lat, m.lng, lat!, lng!);
                                  return (
                                    <div key={m.id} className="text-xs p-2 bg-blue-50 rounded">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="font-medium truncate">{m.title || "Sans titre"}</div>
                                          <div className="text-slate-600">{Math.round(d * 10) / 10} km · {m.city || "—"}</div>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            try {
                                              setAssigning(m.id);
                                              await assignMissionToUser(m.id, subInfo.id);
                                              push({ type: "success", message: "Mission assignée avec succès" });
                                              setSelectedSubId(null);
                                              loadMissions();
                                            } catch (e: any) {
                                              push({ type: "error", message: e?.message ?? "Erreur assignation" });
                                            } finally {
                                              setAssigning(null);
                                            }
                                          }}
                                          disabled={assigning === m.id}
                                          className="shrink-0 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                        >
                                          {assigning === m.id ? "…" : "Assigner"}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                            {missionsAssignablePourSub.length > 8 && (
                              <div className="text-[11px] text-slate-500 mt-1">
                                +{missionsAssignablePourSub.length - 8} autres (zoomez/filtrez)
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Missions */}
              {filteredPoints.map((point) => {
                const st: MissionStatus = point.status;
                const icon = STATUS_ICONS[st] || STATUS_ICONS["Nouveau"];
                const isSelected = selectedMission === point.id;
                const fullAddress = [point.address, point.zip, point.city].filter(Boolean).join(", ");

                return (
                  <Marker
                    key={`${point.id}:${st}`}
                    position={[point.lat, point.lng]}
                    icon={icon}
                    eventHandlers={{
                      click: () => setSelectedMission(point.id),
                    }}
                  >
                    <Popup maxWidth={280}>
                      <div className="space-y-3 min-w-[260px]">
                        <div className="font-bold text-lg text-slate-900">
                          {point.title}
                          {isSelected && <span className="ml-2 text-blue-600">🎯</span>}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[st] }} />
                          <span className="text-sm font-medium text-slate-700">{STATUS_LABELS[st]}</span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2"><span>🔧</span><span className="text-slate-600">{point.type || "Type non spécifié"}</span></div>
                          <div className="flex items-center gap-2"><span>⏱️</span><span className="text-slate-600">{point.estimated_duration_min || "—"} min</span></div>
                          <div className="flex items-center gap-2"><span>💰</span><span className="font-bold text-emerald-600 text-base">{formatMoney(point.price_subcontractor_cents, point.currency)}</span></div>
                          <div className="flex items-center gap-2"><span>📅</span><span className="text-slate-600 text-xs">
                            {point.scheduled_start ? new Date(point.scheduled_start).toLocaleString('fr-FR', { dateStyle: "short", timeStyle: "short" }) : "Non planifié"}
                          </span></div>
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
                                <img src={point.assigned_user_avatar} alt={point.assigned_user_name || "Avatar"} className="h-8 w-8 rounded-full object-cover" />
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
                              onClick={() => setSelectedMission(point.id)}
                              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              {isSelected ? "✕ Fermer" : "👤 Assigner"}
                            </button>
                          )}
                        </div>

                        {/* Intervenants proches (éligibles + hors rayon) */}
                        {isSelected && (
                          <div className="border-t pt-2">
                            <div className="text-sm font-medium mb-2">Intervenants proches :</div>
                            {(() => {
                              const list = subcontractors
                                .map(sub => {
                                  const loc = getSubLocation(sub, technicians);
                                  if (loc.lat == null || loc.lng == null) return null;
                                  const d = calculateDistance(point.lat, point.lng, loc.lat, loc.lng);
                                  const radius = sub.radius_km ?? 25;
                                  return { sub, d, radius, eligible: d <= radius };
                                })
                                .filter(Boolean as unknown as (x: any) => x)
                                .sort((a: any, b: any) => a.d - b.d);

                              if (list.length === 0) {
                                return (
                                  <div className="text-xs text-gray-500">
                                    Aucun intervenant localisé. Vérifie les coordonnées (lat/lng) dans leurs profils.
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-1 max-h-60 overflow-auto">
                                  {list.slice(0, 12).map(({ sub, d, eligible }: any) => (
                                    <div key={sub.id} className={`text-xs p-2 rounded mb-1 ${eligible ? "bg-blue-50" : "bg-slate-50"}`}>
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="font-medium truncate">{sub.name || "Intervenant"}</div>
                                          <div className="text-slate-600">
                                            {Math.round(d * 10) / 10} km · rayon {sub.radius_km ?? 25} km • {String(sub.role || "").toUpperCase()}
                                          </div>
                                          {!eligible && <div className="text-[11px] text-red-600 mt-0.5">❌ Hors périmètre</div>}
                                        </div>
                                        <button
                                          onClick={async () => {
                                            if (!eligible) {
                                              const ok = confirm("Cet intervenant est hors de son rayon d’action. Continuer quand même ?");
                                              if (!ok) return;
                                            }
                                            try {
                                              setAssigning(sub.id);
                                              await assignMissionToUser(point.id, sub.id);
                                              push({ type: "success", message: "Mission assignée avec succès" });
                                              setSelectedMission(null);
                                              setSelectedSubId(null);
                                              loadMissions();
                                            } catch (e: any) {
                                              push({ type: "error", message: e?.message ?? "Erreur assignation" });
                                            } finally {
                                              setAssigning(null);
                                            }
                                          }}
                                          disabled={assigning === sub.id}
                                          className={`shrink-0 px-2 py-1 rounded text-white ${eligible ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-500 hover:bg-slate-600"} disabled:opacity-50`}
                                        >
                                          {assigning === sub.id ? "…" : "Assigner"}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {list.length > 12 && (
                                    <div className="text-[11px] text-slate-500">+{list.length - 12} autres (zoomez/filtrez)</div>
                                  )}
                                </div>
                              );
                            })()}
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
            {selectedMissionObj && (
              <span className="ml-2 text-blue-600">• Mission sélectionnée: {selectedMissionObj.title}</span>
            )}
            {selectedSub && (
              <span className="ml-2 text-emerald-600">• Intervenant sélectionné: {selectedSub.name}</span>
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
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[detailsMission.status] }} />
                  <span className="text-sm font-medium text-slate-700">
                    {STATUS_LABELS[detailsMission.status]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <InfoRow label="Type d'intervention" value={detailsMission.type || "Non spécifié"} icon="🔧" />
                  <InfoRow label="Durée estimée" value={`${detailsMission.estimated_duration_min || "—"} minutes`} icon="⏱️" />
                  <InfoRow
                    label="Créneau prévu"
                    value={
                      detailsMission.scheduled_start
                        ? new Date(detailsMission.scheduled_start).toLocaleString('fr-FR', { dateStyle: "long", timeStyle: "short" })
                        : "Non planifié"
                    }
                    icon="📅"
                  />
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
                        alt={detailsMission.assigned_user_name || "Intervenant"}
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

      {/* Overlay Légende */}
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
                  <LegendRow dot={STATUS_COLORS["Publiée"]} label="Publiée" desc="Offre visible, en attente d’assignation" />
                  <LegendRow dot={STATUS_COLORS["Assignée"]} label="Assignée" desc="Technicien affecté" />
                  <LegendRow dot={STATUS_COLORS["En cours"]} label="En cours" desc="Intervention en traitement" />
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

/* ---------------- Sub components ---------------- */

function StatCard({
  label, value, color, active, onClick,
}: { label: string; value: number; color: string; active: boolean; onClick: () => void; }) {
  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-3xl border-2 text-left transition-all transform hover:scale-105 ${
        active ? "border-slate-400 bg-gradient-to-r from-slate-100 to-blue-100 shadow-2xl"
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

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 uppercase mb-1">{label}</div>
      <div className="text-base text-slate-900 flex items-center gap-2">
        {icon && <span>{icon}</span>}
        <span>{value}</span>
      </div>
    </div>
  );
}
