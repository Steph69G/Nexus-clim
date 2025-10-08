import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { getAdminMissionsForMap } from "@/api/missions.map";
import type { AdminMapMission } from "@/api/missions.map";
import { fetchTechnicians, subscribeTechnicians } from "@/api/people.geo";
import { fetchAvailableSubcontractors, assignMissionToUser } from "@/api/offers.admin";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/ui/toast/ToastProvider";
import { USE_STATUS_V2 } from "@/config/flags";
import StatusControl from "@/components/missions/StatusControl";
import { useNavigate } from "react-router-dom";

// Fonction pour calculer la distance entre deux points (formule de Haversine)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Couleurs par statut
const STATUS_COLORS = {
  "Nouveau": "#6B7280",      // Gris - Brouillon
  "En cours": "#3B82F6",     // Bleu - Publiée
  "Bloqué": "#F59E0B",       // Orange - En cours de traitement
  "Terminé": "#10B981",      // Vert - Terminée
  "Assignée": "#8B5CF6",     // Violet - Assignée
} as const;

const STATUS_LABELS = {
  "Nouveau": "Brouillon",
  "En cours": "Publiée (non assignée)",
  "Bloqué": "En cours",
  "Terminé": "Terminée",
  "Assignée": "Assignée",
} as const;

// Créer des icônes colorées pour chaque statut
const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: ${color};
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Créer une icône de drapeau pour "Ma position"
const createMyLocationIcon = () => {
  return L.divIcon({
    className: 'my-location-marker',
    html: `<div style="font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">📍</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
};

// Créer une icône pour les ST (carré) avec couleur
const createSTIcon = (color: string) => {
  return L.divIcon({
    className: 'st-marker',
    html: `<div style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="20" height="20" fill="${color}" stroke="white" strokeWidth="2" rx="2"/>
        <circle cx="14" cy="14" r="4" fill="white"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Créer une icône pour les SAL (rond) avec couleur
const createSALIcon = (color: string) => {
  return L.divIcon({
    className: 'sal-marker',
    html: `<div style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="10" fill="${color}" stroke="white" strokeWidth="2"/>
        <circle cx="14" cy="14" r="4" fill="white"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const STATUS_ICONS = {
  "Nouveau": createColoredIcon(STATUS_COLORS["Nouveau"]),
  "En cours": createColoredIcon(STATUS_COLORS["En cours"]),
  "Bloqué": createColoredIcon(STATUS_COLORS["Bloqué"]),
  "Terminé": createColoredIcon(STATUS_COLORS["Terminé"]),
  "Assignée": createColoredIcon(STATUS_COLORS["Assignée"]),
};

function FitToPoints({ points }: { points: Pick<AdminMapMission, "lat"|"lng">[] }) {
  const map = useMap();
  useEffect(() => {
    const coords = points
      .filter(p => typeof p.lat === "number" && typeof p.lng === "number")
      .map(p => [p.lat as number, p.lng as number]);
    if (coords.length === 0) return;
    // @ts-ignore leaflet types
    map.fitBounds(coords, { padding: [40, 40] });
  }, [points, map]);
  return null;
}

type StatusFilter = "all" | "Nouveau" | "En cours" | "Bloqué" | "Terminé" | "Assignée";

function formatMoney(cents: number | null, cur: string | null) {
  if (cents == null) return "—";
  const eur = (cents / 100).toFixed(2);
  return `${eur} ${cur ?? "EUR"}`;
}

export default function AdminMapPage() {
  const { push } = useToast();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [allPoints, setAllPoints] = useState<AdminMapMission[]>([]);
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [detailsMission, setDetailsMission] = useState<AdminMapMission | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  // Charger les missions
  async function loadMissions() {
    try {
      setLoading(true);
      const points = await getAdminMissionsForMap();
      setAllPoints(points);
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur chargement carte" });
    } finally {
      setLoading(false);
    }
  }

  // Charger les techniciens
  async function loadTechnicians() {
    try {
      const [techData, subData] = await Promise.all([
        fetchTechnicians(),
        fetchAvailableSubcontractors()
      ]);
      setTechnicians(techData);
      setSubcontractors(subData);
    } catch (e: any) {
      console.warn("Erreur chargement techniciens:", e.message);
    }
  }

  useEffect(() => {
    loadMissions();
    loadTechnicians();
    const unsubTech = subscribeTechnicians(() => loadTechnicians());
    return () => {
      unsubTech();
    };
  }, []);

  // Filtrer les points selon le statut sélectionné
  const filteredPoints = useMemo(() => {
    if (statusFilter === "all") return allPoints;
    if (statusFilter === "Assignée") {
      return allPoints.filter(p => p.assigned_user_id != null);
    }
    if (statusFilter === "En cours") {
      // Publiées = statut "En cours" MAIS non assignées (pour éviter les doublons)
      return allPoints.filter(p => p.status === "En cours" && p.assigned_user_id == null);
    }
    return allPoints.filter(p => p.status === statusFilter);
  }, [allPoints, statusFilter]);

  // Statistiques par statut
  const stats = useMemo(() => {
    const counts = {
      total: allPoints.length,
      "Nouveau": 0,
      "En cours": 0,
      "Bloqué": 0,
      "Terminé": 0,
      "Assignée": 0,
    };

    allPoints.forEach(p => {
      // Compter par statut
      if (p.status === "Nouveau") counts["Nouveau"]++;
      if (p.status === "En cours" && !p.assigned_user_id) counts["En cours"]++;  // Publiées non assignées
      if (p.status === "Bloqué") counts["Bloqué"]++;
      if (p.status === "Terminé") counts["Terminé"]++;

      // Compter les assignées séparément
      if (p.assigned_user_id) {
        counts["Assignée"]++;
      }
    });

    return counts;
  }, [allPoints]);

  // Centre par défaut
  const center = useMemo<[number, number]>(() => {
    // Priorité à la position du profil admin
    if (profile?.lat && profile?.lng) return [profile.lat, profile.lng];
    if (filteredPoints[0]) return [filteredPoints[0].lat, filteredPoints[0].lng];
    return [47.9029, 1.9039]; // Orléans par défaut
  }, [profile, filteredPoints]);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
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
          <StatCard
            label="Total"
            value={stats.total}
            color="#374151"
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          <StatCard
            label="Brouillons"
            value={stats["Nouveau"]}
            color={STATUS_COLORS["Nouveau"]}
            active={statusFilter === "Nouveau"}
            onClick={() => setStatusFilter("Nouveau")}
          />
          <StatCard
            label="Publiées"
            value={stats["En cours"]}
            color={STATUS_COLORS["En cours"]}
            active={statusFilter === "En cours"}
            onClick={() => setStatusFilter("En cours")}
          />
          <StatCard
            label="Assignées"
            value={stats["Assignée"]}
            color={STATUS_COLORS["Assignée"]}
            active={statusFilter === "Assignée"}
            onClick={() => setStatusFilter("Assignée")}
          />
          <StatCard
            label="En cours"
            value={stats["Bloqué"]}
            color={STATUS_COLORS["Bloqué"]}
            active={statusFilter === "Bloqué"}
            onClick={() => setStatusFilter("Bloqué")}
          />
          <StatCard
            label="Terminées"
            value={stats["Terminé"]}
            color={STATUS_COLORS["Terminé"]}
            active={statusFilter === "Terminé"}
            onClick={() => setStatusFilter("Terminé")}
          />
        </section>

        {/* Légende */}
        <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
              <span className="text-indigo-600 text-lg">🏷️</span>
            </div>
            <h3 className="text-2xl font-semibold text-slate-900">Légende</h3>
          </div>
          <div className="flex flex-wrap gap-8">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <span className="text-2xl">📍</span>
              <span className="text-sm font-semibold text-slate-700">Ma position (Admin)</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="20" height="20" fill="#6B7280" stroke="white" strokeWidth="2" rx="2"/>
                <circle cx="14" cy="14" r="4" fill="white"/>
              </svg>
              <span className="text-sm font-semibold text-slate-700">Sous-traitant (Carré)</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                <circle cx="14" cy="14" r="10" fill="#6B7280" stroke="white" strokeWidth="2"/>
                <circle cx="14" cy="14" r="4" fill="white"/>
              </svg>
              <span className="text-sm font-semibold text-slate-700">Salarié (Rond)</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white shadow-lg"></div>
              <span className="text-sm font-semibold text-slate-700">Dans le rayon (Vert)</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow-lg"></div>
              <span className="text-sm font-semibold text-slate-700">Hors rayon (Rouge)</span>
            </div>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <div
                  className="w-6 h-6 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-semibold text-slate-700">{STATUS_LABELS[status as keyof typeof STATUS_LABELS]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Carte */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl">
          <MapContainer 
            center={center} 
            zoom={12} 
            style={{ height: "70vh", width: "100%" }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Position de l'admin */}
            {profile?.lat && profile?.lng && (
              <Marker
                position={[profile.lat, profile.lng]}
                icon={createMyLocationIcon()}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-medium">Ma position (Admin)</div>
                    <div className="text-xs text-slate-600">
                      {profile.lat.toFixed(5)}, {profile.lng.toFixed(5)}
                    </div>
                    {profile.full_name && (
                      <div className="text-xs text-blue-600">{profile.full_name}</div>
                    )}
                    {profile.city && (
                      <div className="text-xs text-slate-500">{profile.city}</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Techniciens ST/SAL */}
            {subcontractors.map((subInfo) => {
              // Déterminer la position selon le mode de localisation
              const locationMode = subInfo.location_mode || 'fixed_address';
              const realtimePosition = technicians.find(t => t.user_id === subInfo.id);

              let lat: number | null = null;
              let lng: number | null = null;
              let positionSource = '';

              if (locationMode === 'gps_realtime') {
                // Mode GPS temps réel : utiliser position GPS si disponible, sinon adresse fixe
                if (realtimePosition) {
                  lat = realtimePosition.lat;
                  lng = realtimePosition.lng;
                  positionSource = 'gps';
                } else {
                  lat = subInfo.lat;
                  lng = subInfo.lng;
                  positionSource = 'fallback';
                }
              } else {
                // Mode adresse fixe : toujours utiliser l'adresse du profil
                lat = subInfo.lat;
                lng = subInfo.lng;
                positionSource = 'fixed';
              }

              // Ne pas afficher si aucune position disponible
              if (!lat || !lng) return null;

              // Calculer si éligible pour la mission sélectionnée
              let isEligible = false;
              let distance = 0;
              if (selectedMission) {
                const mission = allPoints.find(p => p.id === selectedMission);
                if (mission) {
                  distance = calculateDistance(mission.lat, mission.lng, lat, lng);
                  const userRadius = subInfo.radius_km || 25;
                  isEligible = distance <= userRadius;
                }
              }

              // Couleur : toujours vert si éligible, rouge sinon (quand une mission est sélectionnée)
              // Si pas de mission sélectionnée, vert par défaut
              const color = selectedMission
                ? (isEligible ? '#10B981' : '#EF4444')
                : '#10B981';

              // Choisir l'icône selon le rôle
              const icon = subInfo.role === 'st'
                ? createSTIcon(color)
                : createSALIcon(color);

              return (
                <Marker
                  key={subInfo.id}
                  position={[lat, lng]}
                  icon={icon}
                >
                  <Popup>
                    <div className="space-y-2 min-w-[200px]">
                      <div className="font-medium">{subInfo.name}</div>
                      <div className="text-sm">
                        <div><strong>Rôle:</strong> {subInfo.role.toUpperCase()}</div>
                        <div><strong>Ville:</strong> {subInfo.city || "Non renseignée"}</div>
                        {subInfo.phone && <div><strong>Tél:</strong> {subInfo.phone}</div>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {positionSource === 'gps' ? (
                          <>📍 GPS temps réel - Mis à jour: {realtimePosition ? new Date(realtimePosition.updated_at).toLocaleString() : ''}</>
                        ) : positionSource === 'fallback' ? (
                          <>⚠️ GPS non disponible - Position du profil utilisée</>
                        ) : (
                          <>📌 Adresse fixe (profil)</>
                        )}
                      </div>
                      <div className="text-xs text-blue-600">
                        Mode: {locationMode === 'gps_realtime' ? 'GPS temps réel' : 'Adresse fixe'}
                      </div>
                      {selectedMission && (
                        <div className="text-xs">
                          <div className={`font-medium ${isEligible ? 'text-green-600' : 'text-red-600'}`}>
                            Distance: {Math.round(distance * 10) / 10} km / {subInfo.radius_km || 25} km
                            {isEligible ? ' ✅ Dans le périmètre' : ' ❌ Hors périmètre'}
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Missions filtrées */}
            {filteredPoints.map((point) => {
              // Si la mission est assignée, TOUJOURS afficher l'icône violette (peu importe le filtre)
              const isAssigned = point.assigned_user_id != null;

              const icon = isAssigned
                ? STATUS_ICONS["Assignée"]
                : (STATUS_ICONS[point.status as keyof typeof STATUS_ICONS] || STATUS_ICONS["Nouveau"]);

              const statusLabel = isAssigned
                ? "Assignée"
                : (STATUS_LABELS[point.status as keyof typeof STATUS_LABELS] || point.status);

              const statusColor = isAssigned
                ? STATUS_COLORS["Assignée"]
                : (STATUS_COLORS[point.status as keyof typeof STATUS_COLORS] || "#64748B");

              const isSelected = selectedMission === point.id;
              const fullAddress = [point.address, point.zip, point.city].filter(Boolean).join(", ");

              return (
                <Marker
                  key={point.id}
                  position={[point.lat, point.lng]}
                  icon={icon}
                  eventHandlers={{
                    click: () => {
                      setSelectedMission(selectedMission === point.id ? null : point.id);
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
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: statusColor }}
                        />
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
                            {point.scheduled_start ? new Date(point.scheduled_start).toLocaleString('fr-FR', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            }) : "Non planifié"}
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
                        {point.status === "En cours" && !point.assigned_user_id && (
                          <button
                            onClick={() => setSelectedMission(isSelected ? null : point.id)}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            {isSelected ? "✕ Fermer" : "👤 Assigner"}
                          </button>
                        )}
                      </div>

                      {isSelected && (
                        <div className="border-t pt-2">
                          <div className="text-sm font-medium mb-2">Techniciens éligibles:</div>
                          {technicians
                            .map(tech => {
                              const subInfo = subcontractors.find(s => s.id === tech.user_id);
                              if (!subInfo) return null;

                              const distance = calculateDistance(point.lat, point.lng, tech.lat, tech.lng);
                              const userRadius = subInfo.radius_km || 25;
                              const isEligible = distance <= userRadius;

                              if (!isEligible) return null;

                              return (
                                <div key={tech.user_id} className="text-xs p-2 bg-blue-50 rounded mb-1">
                                  <div className="font-medium">{subInfo.name}</div>
                                  <div>Distance: {Math.round(distance * 10) / 10} km</div>
                                  <button
                                    onClick={async () => {
                                      setAssigning(tech.user_id);
                                      try {
                                        await assignMissionToUser(point.id, tech.user_id);
                                        push({ type: "success", message: "Mission assignée avec succès" });
                                        setSelectedMission(null);
                                        loadMissions();
                                      } catch (e: any) {
                                        push({ type: "error", message: e?.message ?? "Erreur assignation" });
                                      } finally {
                                        setAssigning(null);
                                      }
                                    }}
                                    disabled={assigning === tech.user_id}
                                    className="mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50"
                                  >
                                    {assigning === tech.user_id ? "..." : "Assigner"}
                                  </button>
                                </div>
                              );
                            })
                            .filter(Boolean).length === 0 && (
                            <div className="text-xs text-gray-500">Aucun technicien éligible dans le périmètre</div>
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

        {/* Résumé */}
        <div className="flex items-center justify-between text-sm text-slate-700 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
          <div>
            Affichage de <strong className="text-slate-900 text-base">{filteredPoints.length}</strong> mission(s)
            {statusFilter !== "all" && (
              <span> avec le statut <strong className="text-slate-900 text-base">{STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS]}</strong></span>
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
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[detailsMission.status as keyof typeof STATUS_COLORS] || "#64748B" }}
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {STATUS_LABELS[detailsMission.status as keyof typeof STATUS_LABELS] || detailsMission.status}
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
                          ? new Date(detailsMission.scheduled_start).toLocaleString('fr-FR', {
                              dateStyle: 'long',
                              timeStyle: 'short'
                            })
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
                {detailsMission.status === "En cours" && !detailsMission.assigned_user_id && (
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
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  color, 
  active, 
  onClick 
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
        <div 
          className="w-6 h-6 rounded-full shadow-lg border-2 border-white"
          style={{ backgroundColor: color }}
        />
        <div className="text-sm text-slate-700 font-semibold">{label}</div>
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
    </button>
  );
}
