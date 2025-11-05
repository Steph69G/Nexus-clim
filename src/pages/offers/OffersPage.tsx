import { useEffect, useMemo, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/ui/toast/ToastProvider";
import { useNavigate } from "react-router-dom";

import { fetchMyOffers, acceptOffer, getMissionDetails, type OfferInboxRow, type AcceptedMissionDetails } from "@/api/offers.inbox";
import { fetchAdminOffers, assignMissionToUser, fetchAvailableSubcontractors, subscribeAdminOffers, type AdminOffer } from "@/api/offers.admin";
import { confirmMissionAppointment } from "@/api/missions.confirm";
import MissionAcceptedModal from "@/components/MissionAcceptedModal";
import { BackButton } from "@/components/navigation/BackButton";
import { ROUTES } from "@/lib/routes";

function formatMoney(cents: number | null, cur: string | null) {
  if (cents == null) return "—";
  const eur = (cents / 100).toFixed(2);
  return `${eur} ${cur ?? "EUR"}`;
}

export default function OffersPage() {
  const { profile } = useProfile();
  const { push } = useToast();

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
    return <AdminOffersView />;
  } else {
    return <SubcontractorOffersView />;
  }
}

// Composant pour les admins
function AdminOffersView() {
  const { push } = useToast();
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [subcontractors, setSubcontractors] = useState<{
    id: string;
    name: string;
    role: string;
    city: string | null;
    phone: string | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [offersData, subcontractorsData] = await Promise.all([
        fetchAdminOffers(),
        fetchAvailableSubcontractors()
      ]);
      setOffers(offersData);
      setSubcontractors(subcontractorsData);
    } catch (e: any) {
      push({ type: "error", message: e.message || "Erreur chargement offres" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const unsub = subscribeAdminOffers(() => load());
    return () => unsub();
  }, []);

  async function handleAssign(missionId: string, userId: string) {
    try {
      setAssigning(missionId);
      await assignMissionToUser(missionId, userId);
      push({ type: "success", message: "Mission assignée avec succès ! 🎯" });
      await load();
    } catch (e: any) {
      push({ type: "error", message: e.message || "Erreur assignation" });
    } finally {
      setAssigning(null);
    }
  }

  const { availableOffers, assignedOffers } = useMemo(() => {
    const available = offers.filter(o => o.is_available);
    const assigned = offers.filter(o => !o.is_available && o.assigned_user_id);
    return { availableOffers: available, assignedOffers: assigned };
  }, [offers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement des offres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        <BackButton to={ROUTES.operationalCenter} label="Centre Opérationnel" />
        <header className="text-center">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 border border-slate-200 shadow-xl mb-6">
            <span className="text-orange-600 text-xl">🎯</span>
            <span className="text-sm font-medium text-slate-700">Gestion des offres</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Gestion des offres</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Supervisez et assignez les missions à vos équipes disponibles
          </p>
        </header>

        {/* Statistiques */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">📋</span>
              </div>
              <div className="flex-1">
                <div className="text-4xl font-bold text-blue-600 mb-1">{availableOffers.length}</div>
                <div className="text-lg font-semibold text-slate-700 mb-1">Offres disponibles</div>
                <div className="text-sm text-slate-500">En attente d'assignation</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">🎯</span>
              </div>
              <div className="flex-1">
                <div className="text-4xl font-bold text-orange-600 mb-1">{assignedOffers.length}</div>
                <div className="text-lg font-semibold text-slate-700 mb-1">Missions assignées</div>
                <div className="text-sm text-slate-500">Prises en charge</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">👥</span>
              </div>
              <div className="flex-1">
                <div className="text-4xl font-bold text-emerald-600 mb-1">{subcontractors.length}</div>
                <div className="text-lg font-semibold text-slate-700 mb-1">ST/SAL disponibles</div>
                <div className="text-sm text-slate-500">Équipes actives</div>
              </div>
            </div>
          </div>
        </section>

        {/* Offres disponibles */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <span className="text-blue-600 text-xl">🎯</span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Offres à assigner ({availableOffers.length})
              </h2>
              <p className="text-slate-600">Missions en attente d'attribution</p>
            </div>
          </div>
          
          {availableOffers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-xl">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-blue-600 text-4xl">📭</span>
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3">Aucune offre disponible</h3>
              <p className="text-slate-600 max-w-md mx-auto">
                Aucune offre en attente d'assignation pour le moment. 
                Créez de nouvelles missions pour voir des offres apparaître ici.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {availableOffers.map((offer) => (
                <AdminOfferCard
                  key={offer.offer_id}
                  offer={offer}
                  subcontractors={subcontractors}
                  isAssigning={assigning === offer.mission_id}
                  onAssign={(userId) => handleAssign(offer.mission_id, userId)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Missions assignées */}
        {assignedOffers.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                <span className="text-orange-600 text-xl">✅</span>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  Missions assignées ({assignedOffers.length})
                </h2>
                <p className="text-slate-600">Missions prises en charge par vos équipes</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {assignedOffers.map((offer) => {
                const assignedUser = subcontractors.find(s => s.id === offer.assigned_user_id);
                return (
                  <AdminOfferCard
                    key={offer.offer_id}
                    offer={offer}
                    subcontractors={subcontractors}
                    isAssigning={false}
                    onAssign={() => {}}
                    assignedUser={assignedUser}
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SubcontractorOffersView() {
  const { profile } = useProfile();
  const { push } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<OfferInboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [acceptedMission, setAcceptedMission] = useState<AcceptedMissionDetails | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchMyOffers();
      setRows(data);
    } catch (e: any) {
      push({ type: "error", message: e.message || "Erreur chargement offres" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const nowIso = useMemo(() => new Date().toISOString(), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement des offres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <BackButton to="/app/subcontractor" label="Tableau de bord" />
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Offres reçues</h1>
          <p className="text-xl text-slate-600">Découvrez les nouvelles opportunités de missions</p>
        </header>

        {rows.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xl">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune offre</h3>
            <p className="text-slate-600">Aucune offre disponible pour l'instant.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => {
              const isExpired = r.expired || (r.expires_at ? new Date(r.expires_at) < new Date() : false);
              const canAccept =
                !isExpired && !r.accepted_at && !r.refused_at && (r.status === "PUBLIÉE" || r.status === "Nouveau");

              return (
                <div key={r.offer_id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-slate-900">{r.title ?? "Mission"}</h3>
                        {isExpired ? (
                          <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">Expirée</span>
                        ) : r.accepted_at ? (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-medium rounded-full">Acceptée</span>
                        ) : r.refused_at ? (
                          <span className="px-3 py-1 bg-slate-100 text-slate-800 text-sm font-medium rounded-full">Refusée</span>
                        ) : r.expires_at ? (
                          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
                            Expire le {new Date(r.expires_at).toLocaleString()}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                            Disponible
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <div><span className="font-medium text-slate-700">Type :</span> <span className="text-slate-600">{r.type ?? "?"}</span></div>
                          <div><span className="font-medium text-slate-700">Ville :</span> <span className="text-slate-600">{r.city ?? "?"}</span></div>
                        </div>
                        <div className="space-y-1">
                          <div><span className="font-medium text-slate-700">Part ST :</span> 
                            <span className="font-bold text-emerald-600 ml-1">
                              {formatMoney(r.price_subcontractor_cents, r.currency)}
                            </span>
                          </div>
                          <div><span className="font-medium text-slate-700">Durée :</span> <span className="text-slate-600">{r.estimated_duration_min ?? "—"} min</span></div>
                        </div>
                      </div>
                      <div className="text-sm text-slate-500">
                        Créneau: {r.scheduled_start ? new Date(r.scheduled_start).toLocaleString() : "—"}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg"
                        disabled={!canAccept || accepting === r.mission_id}
                        onClick={async () => {
                          try {
                            setAccepting(r.mission_id);
                            const res = await acceptOffer(r.mission_id);
                            if (res === "OK") {
                              const details = await getMissionDetails(r.mission_id);
                              if (details) {
                                setAcceptedMission(details);
                              } else {
                                push({ type: "success", message: "Mission acceptée !" });
                                await load();
                              }
                            } else if (res === "ALREADY_TAKEN") {
                              push({ type: "warning", message: "Mission déjà prise." });
                              await load();
                            } else if (res === "OFFER_NOT_FOUND_OR_EXPIRED") {
                              push({ type: "warning", message: "Offre expirée ou invalide." });
                              await load();
                            } else {
                              push({ type: "error", message: res });
                              await load();
                            }
                          } catch (e: any) {
                            push({ type: "error", message: e.message || "Erreur acceptation" });
                          } finally {
                            setAccepting(null);
                          }
                        }}
                      >
                        {accepting === r.mission_id ? "⏳ Acceptation..." : "✅ Accepter"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {acceptedMission && profile && (
          <MissionAcceptedModal
            mission={acceptedMission}
            userRole={profile.role === "st" ? "st" : "sal"}
            onClose={async () => {
              setAcceptedMission(null);
              await load();
              navigate("/app/missions/my");
            }}
            onConfirmAppointment={async () => {
              try {
                await confirmMissionAppointment(acceptedMission.mission_id);
                push({ type: "success", message: "Rendez-vous confirmé !" });
                setAcceptedMission(null);
                await load();
                navigate("/app/missions/my");
              } catch (e: any) {
                push({ type: "error", message: e.message || "Erreur confirmation" });
              }
            }}
            onProposeNewDate={() => {
              setAcceptedMission(null);
              navigate(`/app/missions/${acceptedMission.mission_id}`);
            }}
            onCallClient={() => {
              if (acceptedMission.client_phone) {
                window.location.href = `tel:${acceptedMission.client_phone}`;
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

// Composant pour les cartes d'offres admin
function AdminOfferCard({
  offer,
  subcontractors,
  isAssigning,
  onAssign,
  assignedUser,
}: {
  offer: AdminOffer;
  subcontractors: { id: string; name: string; role: string; city: string | null; phone: string | null; }[];
  isAssigning: boolean;
  onAssign: (userId: string) => void;
  assignedUser?: { id: string; name: string; role: string; city: string | null; phone: string | null; };
}) {
  const [showAssignModal, setShowAssignModal] = useState(false);

  const mapsUrl = offer.masked_lat && offer.masked_lng
    ? `https://www.google.com/maps/search/?api=1&query=${offer.masked_lat},${offer.masked_lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(offer.masked_address)}`;

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold text-slate-900">{offer.title || "Mission"}</h3>
              {assignedUser ? (
                <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                  Assignée
                </span>
              ) : (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  Disponible
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-2">
                <div><span className="font-medium text-slate-700">Type :</span> <span className="text-slate-600">{offer.type || "Non spécifié"}</span></div>
                <div><span className="font-medium text-slate-700">Ville :</span> <span className="text-slate-600">{offer.city || "Non spécifiée"}</span></div>
                <div><span className="font-medium text-slate-700">Candidat :</span> <span className="text-slate-600">{offer.user_name || "Utilisateur"}</span></div>
              </div>
              <div className="space-y-2">
                <div><span className="font-medium text-slate-700">Rémunération :</span> 
                  <span className="font-bold text-emerald-600 ml-1">
                    {formatMoney(offer.price_subcontractor_cents, offer.currency)}
                  </span>
                </div>
                <div><span className="font-medium text-slate-700">Durée :</span> <span className="text-slate-600">{offer.estimated_duration_min || "—"} min</span></div>
                <div><span className="font-medium text-slate-700">Créneau :</span> 
                  <span className="text-slate-600">{offer.scheduled_start ? new Date(offer.scheduled_start).toLocaleString() : "—"}</span>
                </div>
              </div>
            </div>

            {assignedUser && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="text-sm">
                  <span className="font-medium text-orange-800">Assignée à :</span>
                  <span className="ml-2 text-slate-700">{assignedUser.name} ({assignedUser.role.toUpperCase()})</span>
                  {assignedUser.city && <span className="ml-2 text-slate-500">• {assignedUser.city}</span>}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-sm text-center font-medium transition-all"
            >
              📍 Carte
            </a>

            {!assignedUser && (
              <button
                onClick={() => setShowAssignModal(true)}
                disabled={isAssigning}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-all transform hover:scale-105 shadow-lg"
              >
                {isAssigning ? "⏳ Assignation..." : "👤 Assigner"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'assignation */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[500px] max-w-[95vw] rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Assigner la mission</h3>
              <button 
                onClick={() => setShowAssignModal(false)} 
                className="rounded-xl px-3 py-2 text-sm hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
              <div className="font-medium text-slate-900">{offer.title}</div>
              <div className="text-sm text-slate-600">{offer.masked_address}</div>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {subcontractors.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => {
                    onAssign(sub.id);
                    setShowAssignModal(false);
                  }}
                  disabled={isAssigning}
                  className="w-full text-left p-4 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all"
                >
                  <div className="font-medium text-slate-900">{sub.name}</div>
                  <div className="text-sm text-slate-600">
                    {sub.role.toUpperCase()} • {sub.city || "Ville non renseignée"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}