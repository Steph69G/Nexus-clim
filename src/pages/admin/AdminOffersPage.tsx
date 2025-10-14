import { useEffect, useState } from "react";
import { fetchAdminOffers, assignMissionToUser, fetchAvailableSubcontractors, subscribeAdminOffers, type AdminOffer } from "@/api/offers.admin";
import { useToast } from "@/ui/toast/ToastProvider";
import SubcontractorHistoryModal from "@/components/SubcontractorHistoryModal";
import {
  Users,
  Target,
  CheckCircle,
  MapPin,
  Clock,
  Euro,
  User,
  Phone,
  Building2,
  Zap,
  ArrowRight,
  Calendar,
  Wrench,
  Info
} from "lucide-react";

function formatMoney(cents: number | null, cur: string | null) {
  if (cents == null) return "—";
  const eur = (cents / 100).toFixed(2);
  return `${eur} ${cur ?? "EUR"}`;
}

export default function AdminOffersPage() {
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'available' | 'assigned' | 'subcontractors'>('all');
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState<string | null>(null);

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

  const availableOffers = offers.filter(o => o.is_available);
  const assignedOffers = offers.filter(o => !o.is_available && o.assigned_user_id);

  const filteredOffers = activeFilter === 'available'
    ? availableOffers
    : activeFilter === 'assigned'
    ? assignedOffers
    : activeFilter === 'subcontractors'
    ? []
    : offers;

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
        {/* Header */}
        <header className="text-center">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 border border-blue-200 shadow-xl mb-6">
            <Target className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Gestion des offres</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Offres publiées
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Supervisez et assignez les missions à vos équipes disponibles
          </p>
          
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 rounded-2xl hover:bg-white transition-all text-slate-700 font-medium shadow-lg transform hover:scale-105 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                Chargement...
              </>
            ) : (
              <>
                🔄 Actualiser
              </>
            )}
          </button>
        </header>

        {/* Statistiques - Filtres cliquables */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={<Target className="w-8 h-8 text-blue-600" />}
            title="Offres disponibles"
            value={availableOffers.length}
            description="En attente d'assignation"
            color="blue"
            isActive={activeFilter === 'available'}
            onClick={() => setActiveFilter(activeFilter === 'available' ? 'all' : 'available')}
          />
          <StatCard
            icon={<CheckCircle className="w-8 h-8 text-orange-600" />}
            title="Missions assignées"
            value={assignedOffers.length}
            description="Prises en charge"
            color="orange"
            isActive={activeFilter === 'assigned'}
            onClick={() => setActiveFilter(activeFilter === 'assigned' ? 'all' : 'assigned')}
          />
          <StatCard
            icon={<Users className="w-8 h-8 text-emerald-600" />}
            title="ST/SAL disponibles"
            value={subcontractors.length}
            description="Équipes actives"
            color="emerald"
            isActive={activeFilter === 'subcontractors'}
            onClick={() => setActiveFilter(activeFilter === 'subcontractors' ? 'all' : 'subcontractors')}
          />
        </section>

        {/* Résultats filtrés */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                {activeFilter === 'assigned' ? (
                  <CheckCircle className="w-6 h-6 text-orange-600" />
                ) : activeFilter === 'subcontractors' ? (
                  <Users className="w-6 h-6 text-emerald-600" />
                ) : (
                  <Target className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {activeFilter === 'available' && `Offres à assigner (${availableOffers.length})`}
                  {activeFilter === 'assigned' && `Missions assignées (${assignedOffers.length})`}
                  {activeFilter === 'subcontractors' && `ST/SAL disponibles (${subcontractors.length})`}
                  {activeFilter === 'all' && `Toutes les offres (${offers.length})`}
                </h2>
                <p className="text-slate-600">
                  {activeFilter === 'available' && 'Missions en attente d\'attribution'}
                  {activeFilter === 'assigned' && 'Missions prises en charge par vos équipes'}
                  {activeFilter === 'subcontractors' && 'Équipes disponibles pour vos missions'}
                  {activeFilter === 'all' && 'Vue complète de toutes les missions'}
                </p>
              </div>
            </div>
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all"
              >
                Voir tout
              </button>
            )}
          </div>

          {activeFilter === 'subcontractors' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subcontractors.map((sub) => (
                <SubcontractorCard
                  key={sub.id}
                  subcontractor={sub}
                  onViewDetails={() => setSelectedSubcontractorId(sub.id)}
                />
              ))}
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xl">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3">Aucune offre</h3>
              <p className="text-slate-600 max-w-md mx-auto">
                {activeFilter === 'available' && 'Aucune offre en attente d\'assignation pour le moment.'}
                {activeFilter === 'assigned' && 'Aucune mission n\'a encore été assignée.'}
                {activeFilter === 'all' && 'Aucune offre disponible.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOffers.map((offer) => {
                const isAvailable = offer.is_available;
                const assignedUser = subcontractors.find(s => s.id === offer.assigned_user_id);
                return (
                  <OfferCard
                    key={offer.offer_id}
                    offer={offer}
                    subcontractors={subcontractors}
                    isAssigning={assigning === offer.mission_id}
                    onAssign={(userId) => handleAssign(offer.mission_id, userId)}
                    showAssignButton={isAvailable}
                    assignedUser={assignedUser}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Modal d'historique */}
        {selectedSubcontractorId && (
          <SubcontractorHistoryModal
            userId={selectedSubcontractorId}
            userName={subcontractors.find(s => s.id === selectedSubcontractorId)?.name || "Utilisateur"}
            onClose={() => setSelectedSubcontractorId(null)}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  description,
  color,
  isActive,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  description: string;
  color: 'blue' | 'orange' | 'emerald';
  isActive: boolean;
  onClick: () => void;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-200',
    orange: 'from-orange-500 to-orange-600 shadow-orange-200',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-200'
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white border rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 ${
        isActive ? 'border-blue-500 ring-4 ring-blue-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center gap-6">
        <div className={`w-16 h-16 bg-gradient-to-br ${colorClasses[color]} rounded-2xl flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-4xl font-bold text-slate-900 mb-1">{value}</div>
          <div className="text-lg font-semibold text-slate-700 mb-1">{title}</div>
          <div className="text-sm text-slate-500">{description}</div>
        </div>
      </div>
    </button>
  );
}

function OfferCard({
  offer,
  subcontractors,
  isAssigning,
  onAssign,
  showAssignButton,
  assignedUser,
}: {
  offer: AdminOffer;
  subcontractors: { id: string; name: string; role: string; city: string | null; phone: string | null; }[];
  isAssigning: boolean;
  onAssign: (userId: string) => void;
  showAssignButton: boolean;
  assignedUser?: { id: string; name: string; role: string; city: string | null; phone: string | null; };
}) {
  const [showAssignModal, setShowAssignModal] = useState(false);

  const mapsUrl = offer.masked_lat && offer.masked_lng
    ? `https://www.google.com/maps/search/?api=1&query=${offer.masked_lat},${offer.masked_lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(offer.masked_address)}`;

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case "DEP": return { icon: "🔧", color: "text-amber-600 bg-amber-50" };
      case "ENTR": return { icon: "⚙️", color: "text-emerald-600 bg-emerald-50" };
      case "POSE": return { icon: "🔨", color: "text-violet-600 bg-violet-50" };
      case "AUDIT": return { icon: "🔍", color: "text-slate-600 bg-slate-50" };
      case "DEVIS": return { icon: "📋", color: "text-orange-600 bg-orange-50" };
      case "INST": return { icon: "🏗️", color: "text-blue-600 bg-blue-50" };
      case "PACS": return { icon: "❄️", color: "text-cyan-600 bg-cyan-50" };
      case "CHAUDIERE": return { icon: "🔥", color: "text-red-600 bg-red-50" };
      case "PLOMBERIE": return { icon: "💧", color: "text-sky-600 bg-sky-50" };
      case "EVAC": return { icon: "🚰", color: "text-pink-600 bg-pink-50" };
      default: return { icon: "🔧", color: "text-slate-600 bg-slate-50" };
    }
  };

  const typeInfo = getTypeIcon(offer.type);

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          {/* Contenu principal */}
          <div className="flex-1 space-y-6">
            {/* Header avec titre et statut */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${typeInfo.color}`}>
                  {typeInfo.icon}
                </div>
                <h3 className="text-2xl font-semibold text-slate-900">{offer.title || "Mission"}</h3>
              </div>
              
              {assignedUser ? (
                <span className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-full shadow-lg">
                  ✅ Assignée
                </span>
              ) : (
                <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-full shadow-lg animate-pulse">
                  🎯 Disponible
                </span>
              )}
            </div>

            {/* Informations de la mission */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <InfoItem
                  icon={<Wrench className="w-5 h-5 text-slate-500" />}
                  label="Type"
                  value={offer.type || "Non spécifié"}
                />
                <InfoItem
                  icon={<MapPin className="w-5 h-5 text-slate-500" />}
                  label="Ville"
                  value={offer.city || "Non spécifiée"}
                />
                <InfoItem
                  icon={<User className="w-5 h-5 text-slate-500" />}
                  label="Candidat"
                  value={offer.user_name || "Utilisateur"}
                  tooltip={`<p class='font-semibold mb-1'>Nombre d'offres automatiques reçues</p><p class='text-slate-300'>Indique combien de techniciens ont reçu une offre pour cette mission via le système automatique de géolocalisation.</p><p class='text-slate-300 mt-2'><strong>Pour assigner manuellement</strong>, utilisez le bouton "Assigner" ci-dessous.</p>`}
                />
              </div>
              
              <div className="space-y-4">
                <InfoItem
                  icon={<Euro className="w-5 h-5 text-emerald-600" />}
                  label="Rémunération"
                  value={formatMoney(offer.price_subcontractor_cents, offer.currency)}
                  highlight={true}
                />
                <InfoItem
                  icon={<Clock className="w-5 h-5 text-slate-500" />}
                  label="Durée estimée"
                  value={`${offer.estimated_duration_min || "—"} min`}
                />
                <InfoItem
                  icon={<Calendar className="w-5 h-5 text-slate-500" />}
                  label="Créneau"
                  value={offer.scheduled_start ? new Date(offer.scheduled_start).toLocaleString() : "Non planifié"}
                />
              </div>
            </div>

            {/* Informations temporelles */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {offer.created_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-700 mb-1">Créée le</div>
                      <div className="text-sm text-slate-600">
                        {new Date(offer.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                )}
                {offer.accepted_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-700 mb-1">Acceptée le</div>
                      <div className="text-sm text-slate-600">
                        {new Date(offer.accepted_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Utilisateur assigné */}
            {assignedUser && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-orange-900 mb-1">
                      Assignée à {assignedUser.name}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-orange-700">
                      <span className="px-3 py-1 bg-blue-200 rounded-full font-medium">
                        {assignedUser.role.toUpperCase()}
                      </span>
                      {assignedUser.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {assignedUser.city}
                        </span>
                      )}
                      {assignedUser.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {assignedUser.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-4 lg:w-48">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-3 px-6 py-4 border-2 border-slate-300 rounded-2xl hover:bg-slate-50 font-semibold transition-all transform hover:scale-105 shadow-lg text-slate-700"
            >
              <MapPin className="w-5 h-5" />
              Voir sur carte
            </a>

            {showAssignButton && (
              <button
                onClick={() => setShowAssignModal(true)}
                disabled={isAssigning}
                className="inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all transform hover:scale-105 shadow-xl"
              >
                {isAssigning ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Assignation...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    Assigner
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'assignation */}
      {showAssignModal && (
        <AssignmentModal
          offer={offer}
          subcontractors={subcontractors}
          isAssigning={isAssigning}
          onAssign={(userId) => {
            onAssign(userId);
            setShowAssignModal(false);
          }}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </>
  );
}

function InfoItem({
  icon,
  label,
  value,
  highlight = false,
  tooltip
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-slate-600">{label}</div>
          {tooltip && (
            <div className="group relative">
              <Info className="w-4 h-4 text-slate-400 hover:text-blue-600 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-80 pointer-events-none">
                <div className="bg-slate-900 text-white text-xs rounded-lg p-3 shadow-xl">
                  <div dangerouslySetInnerHTML={{ __html: tooltip }} />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                    <div className="w-2 h-2 bg-slate-900 rotate-45"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={`font-semibold ${highlight ? 'text-emerald-600 text-lg' : 'text-slate-900'}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function AssignmentModal({
  offer,
  subcontractors,
  isAssigning,
  onAssign,
  onClose,
}: {
  offer: AdminOffer;
  subcontractors: { id: string; name: string; role: string; city: string | null; phone: string | null; }[];
  isAssigning: boolean;
  onAssign: (userId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header du modal */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold">Assigner la mission</h3>
                <p className="text-blue-100">Choisissez un technicien disponible</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all flex items-center justify-center text-white font-semibold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Détails de la mission */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900 text-lg">{offer.title}</div>
              <div className="text-slate-600 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {offer.masked_address}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600">
                {formatMoney(offer.price_subcontractor_cents, offer.currency)}
              </div>
              <div className="text-sm text-slate-500">Rémunération</div>
            </div>
          </div>
        </div>

        {/* Liste des techniciens */}
        <div className="p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">
            Techniciens disponibles ({subcontractors.length})
          </h4>
          
          {subcontractors.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">Aucun technicien disponible</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {subcontractors.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => onAssign(sub.id)}
                  disabled={isAssigning}
                  className="w-full text-left p-6 border-2 border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 transition-all transform hover:scale-[1.02] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center group-hover:from-blue-100 group-hover:to-blue-200 transition-all">
                      <User className="w-6 h-6 text-slate-600 group-hover:text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 text-lg group-hover:text-blue-900">
                        {sub.name}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 group-hover:text-blue-700">
                        <span className="px-3 py-1 bg-slate-100 rounded-full font-medium group-hover:bg-blue-100">
                          {sub.role.toUpperCase()}
                        </span>
                        {sub.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {sub.city}
                          </span>
                        )}
                        {sub.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {sub.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer du modal */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 border-2 border-slate-300 rounded-2xl hover:bg-white transition-all font-semibold text-slate-700"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

function SubcontractorCard({
  subcontractor,
  onViewDetails,
}: {
  subcontractor: { id: string; name: string; role: string; city: string | null; phone: string | null; };
  onViewDetails: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center flex-shrink-0">
          <User className="w-7 h-7 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-slate-900 mb-1 truncate">{subcontractor.name}</h3>
          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
            {subcontractor.role.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {subcontractor.city && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>{subcontractor.city}</span>
          </div>
        )}
        {subcontractor.phone && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>{subcontractor.phone}</span>
          </div>
        )}
      </div>

      <button
        onClick={onViewDetails}
        className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium flex items-center justify-center gap-2 group"
      >
        Plus de détails
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}