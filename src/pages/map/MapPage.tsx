import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useProfile } from "@/hooks/useProfile";
import { fetchMissionPoints, subscribeMissionPoints } from "@/api/missions.geo";
import type { MissionPoint } from "@/api/missions.geo";
import { fetchTechnicians, subscribeTechnicians, upsertMyLocation } from "@/api/people.geo";
import { maskAddress } from "@/lib/addressPrivacy";
import { acceptSubcontractorOffer } from "@/api/offers.subcontractor";
import AdminMapPage from "./AdminMapPage";
import { getMissionColorForRole, getTechnicianColor, MY_LOCATION_COLOR } from "@/lib/mapColors";
import { createMissionIcon, createTechnicianIcon } from "@/components/map/MapIcons";
import MapStatsCards from "@/components/map/MapStatsCards";

function formatMoney(cents: number | null, cur: string | null) {
  if (cents == null) return "—";
  const eur = (cents / 100).toFixed(2);
  return `${eur} ${cur ?? "EUR"}`;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const createMyLocationIcon = () => {
  return L.divIcon({
    className: 'my-location-marker',
    html: `<div style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
      <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z"
              fill="${MY_LOCATION_COLOR}" stroke="white" strokeWidth="2"/>
        <circle cx="16" cy="16" r="5" fill="white"/>
        <circle cx="16" cy="16" r="3" fill="${MY_LOCATION_COLOR}"/>
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
    // @ts-ignore - fitBounds accepte un tableau [lat,lng][]
    map.fitBounds(points.map(p => [p.lat, p.lng]), { padding: [40, 40] });
  }, [points, map]);
  return null;
}

export default function MapPage() {
  const { profile } = useProfile();

  // Affichage conditionnel selon le rôle
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (profile.role === "admin") {
    return <AdminMapPage />;
  }

  return <SubcontractorMapView />;
}

function SubcontractorMapView() {
  const [points, setPoints] = useState<MissionPoint[]>([]);
  const [techs, setTechs] = useState<{ user_id: string; lat: number; lng: number; updated_at: string }[]>([]);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [detailsMission, setDetailsMission] = useState<MissionPoint | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const { profile } = useProfile();
  const lastSendRef = useRef<number>(0);

  // --- Missions ---
  async function loadMissions() {
    try {
      setErr(null);
      setPoints(await fetchMissionPoints(profile?.role, profile?.id));
    } catch (e: any) {
      setErr(e?.message ?? "Erreur chargement carte");
    }
  }

  useEffect(() => {
    loadMissions();
    const unsub = subscribeMissionPoints(() => loadMissions());
    return () => unsub();
  }, []);

  // --- Techniciens ---
  async function loadTechs() {
    try {
      setTechs(await fetchTechnicians());
    } catch {
      // silencieux au début
    }
  }

  useEffect(() => {
    loadTechs();
    const unsub = subscribeTechnicians(() => loadTechs());
    return () => unsub();
  }, []);

  // --- Géolocalisation + upsert ma position (auth requise) ---
  useEffect(() => {
    // D'abord, essayer de récupérer la position depuis le profil
    if (profile?.lat && profile?.lng) {
      setMe({ lat: profile.lat, lng: profile.lng });
    }

    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMe({ lat, lng });

        const now = Date.now();
        if (now - lastSendRef.current > 5000) {
          lastSendRef.current = now;
          try {
            await upsertMyLocation(lat, lng);
          } catch {
            // pas authentifié ou RLS → on ignore côté UI
          }
        }
      },
      () => {
        // refus utilisateur / erreur → on laisse juste la carte s'afficher
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [profile]);

  // --- Centre par défaut ---
  const center = useMemo<[number, number]>(() => {
    if (me) return [me.lat, me.lng];
    if (points[0]) return [points[0].lat, points[0].lng];
    return [48.8566, 2.3522]; // Paris
  }, [me, points]);

  const handleAcceptMission = async () => {
    if (!detailsMission) return;

    setIsAccepting(true);
    setAcceptError(null);
    setAcceptSuccess(false);

    try {
      await acceptSubcontractorOffer(detailsMission.id);
      setAcceptSuccess(true);

      setTimeout(() => {
        setDetailsMission(null);
        setAcceptSuccess(false);
        loadMissions();
      }, 2000);
    } catch (error: any) {
      setAcceptError(error.message || "Erreur lors de l'acceptation");
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        <header className="text-center">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full px-6 py-3 shadow-lg mb-6">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-sm font-semibold">Carte des missions</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Missions disponibles</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Visualisez vos missions et optimisez vos déplacements en temps réel
          </p>
        </header>
        
        {err && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-lg">⚠️</span>
              </div>
              <div>
                <div className="font-semibold text-red-800">Erreur de chargement</div>
                <div className="text-red-700">{err}</div>
              </div>
            </div>
          </div>
        )}

        {/* Statistiques */}
        <MapStatsCards
          missions={points}
          role={profile?.role || "st"}
          userId={profile?.id}
        />

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg relative">
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
            {/* Position de l'utilisateur */}
            {profile?.lat && profile?.lng && (
              <Marker
                position={[profile.lat, profile.lng]}
                icon={createMyLocationIcon()}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-medium">Ma position</div>
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

            {/* Techniciens (positions partagées) */}
            {techs.map((t) => (
              <Marker
                key={t.user_id}
                position={[t.lat, t.lng]}
                icon={createTechnicianIcon(getTechnicianColor(false, false))}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="font-medium">Technicien</div>
                    <div className="text-xs text-slate-600">
                      ID: {t.user_id.substring(0, 8)}...
                    </div>
                    <div className="text-xs text-slate-600">
                      Mis à jour: {new Date(t.updated_at).toLocaleString()}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Missions */}
            {points.map((p) => {
              const isAssignedToMe = p.assigned_user_id === profile?.id;
              const maskedAddr = isAssignedToMe
                ? p.address || p.city || "Adresse non disponible"
                : maskAddress(p.address, p.city, 'STREET_CITY', false);

              const myLat = profile?.lat ?? me?.lat;
              const myLng = profile?.lng ?? me?.lng;
              const radiusKm = profile?.radius_km ?? null;

              let distance: number | null = null;
              let isOutOfRadius = false;

              if (myLat && myLng) {
                distance = calculateDistance(myLat, myLng, p.lat, p.lng);
                if (radiusKm && distance > radiusKm) {
                  isOutOfRadius = true;
                }
              }

              const missionColor = getMissionColorForRole(p.status, "st", isOutOfRadius);

              return (
                <Marker key={p.id} position={[p.lat, p.lng]} icon={createMissionIcon(missionColor)}>
                  <Popup maxWidth={280}>
                    <div className="space-y-3 min-w-[260px]">
                      <div className="font-bold text-lg text-slate-900">{p.title}</div>

                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: missionColor }}
                        />
                        <span className="text-sm font-medium text-slate-700">
                          {isOutOfRadius ? "Hors rayon" :
                           p.status === "En cours" ? "Disponible" :
                           p.status === "Bloqué" ? "En cours" :
                           p.status}
                        </span>
                      </div>

                      {distance !== null && (
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span className={`text-sm font-medium ${isOutOfRadius ? 'text-slate-500' : 'text-blue-600'}`}>
                            {distance.toFixed(1)} km
                          </span>
                        </div>
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span>🔧</span>
                          <span className="text-slate-600">{p.type || "Type non spécifié"}</span>
                          {profile?.preferred_types && profile.preferred_types.length > 0 && p.type && !profile.preferred_types.includes(p.type) && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">Hors préférences</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span>⏱️</span>
                          <span className="text-slate-600">{p.estimated_duration_min || "—"} min</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span>💰</span>
                          <span className="font-bold text-emerald-600 text-base">
                            {formatMoney(p.price_subcontractor_cents, p.currency)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span className="text-slate-600 text-xs">
                            {p.scheduled_start ? new Date(p.scheduled_start).toLocaleString('fr-FR', {
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
                            {!isAssignedToMe && (
                              <div className="text-xs text-amber-600 mt-1">
                                🔒 Adresse complète après acceptation
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-3">
                        <button
                          onClick={() => setDetailsMission(p)}
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

            {/* Ajuste la vue si missions présentes */}
            {points.length > 0 && <FitToPoints points={points} />}
          </MapContainer>
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
                        backgroundColor: detailsMission.status === "En cours" ? "#3B82F6" :
                                       detailsMission.status === "Bloqué" ? "#F59E0B" :
                                       detailsMission.status === "Terminé" ? "#10B981" : "#64748B"
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

                {acceptError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <span>⚠️</span>
                      <span className="font-medium">Erreur</span>
                    </div>
                    <div className="text-sm text-red-700 mt-1">{acceptError}</div>
                  </div>
                )}

                {acceptSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <span>✅</span>
                      <span className="font-medium">Mission acceptée avec succès</span>
                    </div>
                    <div className="text-sm text-green-700 mt-1">
                      Vous allez être redirigé vers vos missions...
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  {!detailsMission.assigned_user_id && !acceptSuccess && (
                    <button
                      onClick={handleAcceptMission}
                      disabled={isAccepting}
                      className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {isAccepting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Acceptation...</span>
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          <span>Accepter la mission</span>
                        </>
                      )}
                    </button>
                  )}
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
                    <LegendRow icon="📍" color="#6366F1" label="Publiée (disponible)" />
                    <LegendRow icon="📍" color="#22C55E" label="Acceptée (à moi)" />
                    <LegendRow icon="📍" color="#3B82F6" label="En cours" />
                    <LegendRow icon="📍" color="#F87171" label="Bloquée" />
                    <LegendRow icon="📍" color="#10B981" label="Terminée" />
                    <LegendRow icon="📍" color="#9CA3AF" label="Hors rayon" />
                  </div>
                </div>

                {/* Positions */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="font-medium text-slate-800 mb-3">Positions</div>
                  <div className="space-y-3 text-sm">
                    <LegendRow icon="📍" color="#8B5CF6" label="Ma position" />
                    <LegendRow icon="📍" color="#1E40AF" label="Techniciens" />
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
    </div>
  );
}

function LegendRow({ icon, color, label }: { icon: string; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="20" height="25" viewBox="0 0 32 40">
        <path
          d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z"
          fill={color}
          stroke="white"
          strokeWidth="2"
        />
        <circle cx="16" cy="16" r="6" fill="white" />
      </svg>
      <span className="text-slate-700">{label}</span>
    </div>
  );
}