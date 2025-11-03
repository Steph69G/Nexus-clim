import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { fetchMissionPoints, subscribeMissionPoints } from "@/api/missions.geo";
import type { MissionPoint } from "@/api/missions.geo";
import { fetchTechnicians, subscribeTechnicians, upsertMyLocation } from "@/api/people.geo";
import { maskAddress } from "@/lib/addressPrivacy";
import { useToast } from "@/ui/toast/ToastProvider";

function formatMoney(cents: number | null, cur: string | null) {
  if (cents == null) return "—";
  const eur = (cents / 100).toFixed(2);
  return `${eur} ${cur ?? "EUR"}`;
}

const createMyLocationIcon = () => {
  return L.divIcon({
    className: 'my-location-marker',
    html: `<div style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
      <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z"
              fill="#3B82F6" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="16" r="5" fill="white"/>
        <circle cx="16" cy="16" r="3" fill="#3B82F6"/>
      </svg>
    </div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
  });
};

const createMissionIcon = (color: string) => {
  return L.divIcon({
    className: 'mission-marker',
    html: `<div style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
      <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z"
              fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
    </div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
  });
};

const createTechnicianIcon = (color: string) => {
  return L.divIcon({
    className: 'tech-marker',
    html: `<div style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
      <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z"
              fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="16" r="5" fill="white"/>
      </svg>
    </div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
  });
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

export default function TechMapPage() {
  const { push } = useToast();
  const [points, setPoints] = useState<MissionPoint[]>([]);
  const [techs, setTechs] = useState<{ user_id: string; lat: number; lng: number; updated_at: string }[]>([]);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [detailsMission, setDetailsMission] = useState<MissionPoint | null>(null);
  const lastSendRef = useRef<number>(0);

  // Charger les missions
  async function loadMissions() {
    try {
      setPoints(await fetchMissionPoints());
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur chargement carte" });
    } finally {
      setLoading(false);
    }
  }

  // Charger les techniciens
  async function loadTechs() {
    try {
      setTechs(await fetchTechnicians());
    } catch {
      // Silencieux
    }
  }

  useEffect(() => {
    loadMissions();
    loadTechs();
    
    const unsubMissions = subscribeMissionPoints(() => loadMissions());
    const unsubTechs = subscribeTechnicians(() => loadTechs());
    
    return () => {
      unsubMissions();
      unsubTechs();
    };
  }, []);

  // Géolocalisation
  useEffect(() => {
    if (!navigator.geolocation) return;
    
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMe({ lat, lng });
        setLocationEnabled(true);

        // Throttle l'envoi de position
        const now = Date.now();
        if (now - lastSendRef.current > 5000) {
          lastSendRef.current = now;
          try {
            await upsertMyLocation(lat, lng);
          } catch {
            // Pas authentifié ou erreur RLS
          }
        }
      },
      (error) => {
        console.warn("Géolocalisation refusée:", error);
        setLocationEnabled(false);
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Centre de la carte
  const center = useMemo<[number, number]>(() => {
    if (me) return [me.lat, me.lng];
    if (points[0]) return [points[0].lat, points[0].lng];
    return [48.8566, 2.3522]; // Paris par défaut
  }, [me, points]);

  // Statistiques
  const stats = useMemo(() => {
    const total = points.length;
    const available = points.filter(p => p.status === "En cours").length; // Publiées
    const inProgress = points.filter(p => p.status === "Bloqué").length; // En cours
    const completed = points.filter(p => p.status === "Terminé").length;
    
    return { total, available, inProgress, completed };
  }, [points]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Carte des missions</h1>
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded text-xs ${
            locationEnabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
            {locationEnabled ? "📍 Position activée" : "📍 Position désactivée"}
          </div>
          <button 
            onClick={() => {
              loadMissions();
              loadTechs();
            }}
            className="px-3 py-1.5 border rounded hover:bg-gray-50"
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-3">
          <div className="text-lg font-semibold">{stats.total}</div>
          <div className="text-sm text-gray-600">Total missions</div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="text-lg font-semibold text-blue-600">{stats.available}</div>
          <div className="text-sm text-gray-600">Disponibles</div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="text-lg font-semibold text-orange-600">{stats.inProgress}</div>
          <div className="text-sm text-gray-600">En cours</div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="text-lg font-semibold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">Terminées</div>
        </div>
      </div>

      {/* Légende */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-medium mb-3">Légende</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <svg width="20" height="25" viewBox="0 0 32 40">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#3B82F6" stroke="white" stroke-width="2"/>
              <circle cx="16" cy="16" r="3" fill="white"/>
            </svg>
            <span>Ma position</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="20" height="25" viewBox="0 0 32 40">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#6B7280" stroke="white" stroke-width="2"/>
              <circle cx="16" cy="16" r="5" fill="white"/>
            </svg>
            <span>Autres techniciens</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="20" height="25" viewBox="0 0 32 40">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#EF4444" stroke="white" stroke-width="2"/>
              <circle cx="16" cy="16" r="6" fill="white"/>
            </svg>
            <span>Missions disponibles</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="20" height="25" viewBox="0 0 32 40">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#10B981" stroke="white" stroke-width="2"/>
              <circle cx="16" cy="16" r="6" fill="white"/>
            </svg>
            <span>Missions terminées</span>
          </div>
        </div>
      </div>

      {/* Carte */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <MapContainer 
          center={center} 
          zoom={12} 
          style={{ height: "60vh", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Ma position */}
          {me && (
            <Marker
              position={[me.lat, me.lng]}
              icon={createMyLocationIcon()}
            >
              <Popup>
                <div className="text-center">
                  <div className="font-medium">Ma position</div>
                  <div className="text-xs text-gray-600">
                    {me.lat.toFixed(5)}, {me.lng.toFixed(5)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Autres techniciens */}
          {techs.map((tech) => (
            <Marker
              key={tech.user_id}
              position={[tech.lat, tech.lng]}
              icon={createTechnicianIcon('#6B7280')}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="font-medium">Technicien</div>
                  <div className="text-xs text-gray-600">
                    ID: {tech.user_id.substring(0, 8)}...
                  </div>
                  <div className="text-xs text-gray-600">
                    Mis à jour: {new Date(tech.updated_at).toLocaleString()}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Missions */}
          {points.map((point) => {
            const isAvailable = point.status === "En cours";
            const isCompleted = point.status === "Terminé";
            const color = isCompleted ? '#10B981' : isAvailable ? '#EF4444' : '#F59E0B';
            const maskedAddr = maskAddress(point.address, point.city, 'STREET_CITY', false);

            return (
              <Marker
                key={point.id}
                position={[point.lat, point.lng]}
                icon={createMissionIcon(color)}
              >
                <Popup maxWidth={280}>
                  <div className="space-y-3 min-w-[260px]">
                    <div className="font-bold text-lg text-slate-900">{point.title}</div>

                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm font-medium text-slate-700">
                        {point.status === "En cours" ? "Disponible" :
                         point.status === "Bloqué" ? "En cours" :
                         point.status}
                      </span>
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
                          <div className="text-xs font-medium text-slate-600 mb-1">Localisation</div>
                          <div className="text-sm text-slate-800">{maskedAddr}</div>
                          <div className="text-xs text-amber-600 mt-1">
                            🔒 Adresse complète après acceptation
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3">
                      <button
                        onClick={() => setDetailsMission(point)}
                        className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
                      >
                        📋 Voir détails complets
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Ajuster la vue */}
          {points.length > 0 && <FitToPoints points={points} />}
        </MapContainer>
      </div>

      {/* Informations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">💡 Informations</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Votre position est mise à jour automatiquement si vous autorisez la géolocalisation</li>
          <li>• Les missions disponibles apparaissent en rouge sur la carte</li>
          <li>• Cliquez sur un marqueur pour voir les détails de la mission</li>
          <li>• Votre position est partagée avec les autres techniciens pour faciliter la coordination</li>
        </ul>
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
                    style={{
                      backgroundColor: detailsMission.status === "Terminé" ? '#10B981' :
                                     detailsMission.status === "En cours" ? '#EF4444' : '#F59E0B'
                    }}
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {detailsMission.status === "En cours" ? "Disponible" :
                     detailsMission.status === "Bloqué" ? "En cours" :
                     detailsMission.status}
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
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">Rémunération</div>
                    <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
                      <span>💰</span>
                      <span>{formatMoney(detailsMission.price_subcontractor_cents, detailsMission.currency)}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">Localisation</div>
                    <div className="text-base text-slate-900 flex items-start gap-2">
                      <span>📍</span>
                      <div>
                        <div>{maskAddress(detailsMission.address, detailsMission.city, 'STREET_CITY', false)}</div>
                        <div className="text-xs text-amber-600 mt-1">
                          🔒 Adresse complète après acceptation
                        </div>
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

              {detailsMission.assigned_user_id && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-orange-800">
                    <span>✅</span>
                    <span className="font-medium">Mission assignée</span>
                  </div>
                  <div className="text-sm text-slate-700 mt-1">
                    Cette mission a été assignée à un technicien.
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setDetailsMission(null)}
                  className="flex-1 px-6 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 font-medium text-slate-700 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}