import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import { useProfile } from "@/hooks/useProfile";
import { fetchMissionPoints, subscribeMissionPoints } from "@/api/missions.geo";
import type { MissionPoint } from "@/api/missions.geo";
import { fetchTechnicians, subscribeTechnicians, upsertMyLocation } from "@/api/people.geo";
import { maskAddress } from "@/lib/addressPrivacy";
import { acceptSubcontractorOffer } from "@/api/offers.subcontractor";
import AdminMapPage from "./AdminMapPage";

function formatMoney(cents: number | null, cur: string | null) {
  if (cents == null) return "—";
  const eur = (cents / 100).toFixed(2);
  return `${eur} ${cur ?? "EUR"}`;
}

const createMyLocationIcon = () => {
  return L.divIcon({
    className: 'my-location-marker',
    html: `<div style="font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">📍</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
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
  const { profile } = useProfile();
  const lastSendRef = useRef<number>(0);

  // --- Missions ---
  async function loadMissions() {
    try {
      setErr(null);
      setPoints(await fetchMissionPoints());
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
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 border border-slate-200 shadow-xl mb-6">
            <span className="text-green-600 text-xl">🗺️</span>
            <span className="text-sm font-medium text-slate-700">Géolocalisation</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Carte des missions</h1>
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

        {/* Légende */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center">
              <span className="text-purple-600 text-lg">🏷️</span>
            </div>
            <h3 className="text-2xl font-semibold text-slate-900">Légende</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <span className="text-2xl">📍</span>
              <span className="text-slate-700 font-semibold">Ma position</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="w-6 h-6 bg-slate-500 rounded-full shadow-lg border-2 border-white"></div>
              <span className="text-slate-700 font-semibold">Autres techniciens</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="w-6 h-6 bg-red-500 rounded-full shadow-lg border-2 border-white"></div>
              <span className="text-slate-700 font-semibold">Missions disponibles</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="w-6 h-6 bg-emerald-500 rounded-full shadow-lg border-2 border-white"></div>
              <span className="text-slate-700 font-semibold">Missions terminées</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl">
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
              <CircleMarker 
                key={t.user_id} 
                center={[t.lat, t.lng]} 
                radius={6}
                pathOptions={{ color: '#64748B', fillColor: '#64748B', fillOpacity: 0.6 }}
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
              </CircleMarker>
            ))}

            {/* Missions */}
            {points.map((p) => {
              const maskedAddr = maskAddress(p.address, p.city, 'STREET_CITY', false);

              return (
                <Marker key={p.id} position={[p.lat, p.lng]}>
                  <Popup maxWidth={280}>
                    <div className="space-y-3 min-w-[260px]">
                      <div className="font-bold text-lg text-slate-900">{p.title}</div>

                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: p.status === "En cours" ? "#3B82F6" :
                                           p.status === "Bloqué" ? "#F59E0B" :
                                           p.status === "Terminé" ? "#10B981" : "#64748B"
                          }}
                        />
                        <span className="text-sm font-medium text-slate-700">
                          {p.status === "En cours" ? "Disponible" :
                           p.status === "Bloqué" ? "En cours" :
                           p.status}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span>🔧</span>
                          <span className="text-slate-600">{p.type || "Type non spécifié"}</span>
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
                            <div className="text-xs text-amber-600 mt-1">
                              🔒 Adresse complète après acceptation
                            </div>
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
      </div>
    </div>
  );
}