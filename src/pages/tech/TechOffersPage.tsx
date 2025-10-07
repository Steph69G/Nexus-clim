import { useEffect, useState } from "react";
import { fetchSubcontractorOffers, acceptSubcontractorOffer, subscribeSubcontractorOffers, type SubcontractorOffer } from "@/api/offers.subcontractor";
import { useToast } from "@/ui/toast/ToastProvider";

function formatMoney(cents: number | null, cur: string | null) {
  if (cents == null) return "—";
  const eur = (cents / 100).toFixed(2);
  return `${eur} ${cur ?? "EUR"}`;
}

export default function TechOffersPage() {
  const { push } = useToast();
  const [offers, setOffers] = useState<SubcontractorOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchSubcontractorOffers();
      setOffers(data);
    } catch (e: any) {
      push({ type: "error", message: e.message || "Erreur chargement offres" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const unsub = subscribeSubcontractorOffers(() => load());
    return () => unsub();
  }, []);

  const availableOffers = offers.filter(o => !o.is_mine);
  const myOffers = offers.filter(o => o.is_mine);

  async function handleAccept(missionId: string) {
    try {
      setAccepting(missionId);
      const result = await acceptSubcontractorOffer(missionId);
      
      if (result === "OK") {
        push({ type: "success", message: "Mission acceptée avec succès ! 🎉" });
      } else if (result === "ALREADY_TAKEN") {
        push({ type: "warning", message: "Mission déjà prise par quelqu'un d'autre." });
      } else if (result === "OFFER_NOT_FOUND_OR_EXPIRED") {
        push({ type: "warning", message: "Offre expirée ou non trouvée." });
      } else {
        push({ type: "error", message: result });
      }
      
      await load();
    } catch (e: any) {
      push({ type: "error", message: e.message || "Erreur lors de l'acceptation" });
    } finally {
      setAccepting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Chargement des offres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Offres disponibles</h1>
        <button
          onClick={load}
          className="px-3 py-1.5 border rounded hover:bg-gray-50"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-lg">📋</span>
            </div>
            <div>
              <div className="text-2xl font-semibold">{availableOffers.length}</div>
              <div className="text-sm text-gray-600">Offres disponibles</div>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-lg">✅</span>
            </div>
            <div>
              <div className="text-2xl font-semibold">{myOffers.length}</div>
              <div className="text-sm text-gray-600">Mes missions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Offres disponibles */}
      <section>
        <h2 className="text-lg font-medium mb-4">Nouvelles offres ({availableOffers.length})</h2>
        
        {availableOffers.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <h3 className="font-medium text-gray-900 mb-2">Aucune offre disponible</h3>
            <p className="text-gray-600 text-sm">
              Aucune nouvelle offre pour le moment. Revenez plus tard ou vérifiez vos paramètres de profil.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableOffers.map((offer) => (
              <OfferCard
                key={offer.offer_id}
                offer={offer}
                onAccept={() => handleAccept(offer.mission_id)}
                isAccepting={accepting === offer.mission_id}
                showAcceptButton={true}
              />
            ))}
          </div>
        )}
      </section>

      {/* Mes missions acceptées */}
      {myOffers.length > 0 && (
        <section>
          <h2 className="text-lg font-medium mb-4">Mes missions acceptées ({myOffers.length})</h2>
          <div className="space-y-3">
            {myOffers.map((offer) => (
              <OfferCard
                key={offer.offer_id}
                offer={offer}
                onAccept={() => {}}
                isAccepting={false}
                showAcceptButton={false}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OfferCard({
  offer,
  onAccept,
  isAccepting,
  showAcceptButton,
}: {
  offer: SubcontractorOffer;
  onAccept: () => void;
  isAccepting: boolean;
  showAcceptButton: boolean;
}) {
  const isExpired = offer.expired || (offer.expires_at ? new Date(offer.expires_at) < new Date() : false);
  const canAccept = showAcceptButton && !isExpired && !offer.accepted_at && !offer.refused_at;

  const mapsUrl = offer.masked_lat && offer.masked_lng
    ? `https://www.google.com/maps/search/?api=1&query=${offer.masked_lat},${offer.masked_lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(offer.masked_address)}`;

  return (
    <div className={`bg-white border rounded-lg p-4 ${offer.is_mine ? 'border-green-200 bg-green-50' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-lg">{offer.title || "Mission"}</h3>
            {offer.is_mine && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Ma mission
              </span>
            )}
            {isExpired && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                Expirée
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div><span className="font-medium">Type :</span> {offer.type || "Non spécifié"}</div>
              <div><span className="font-medium">Ville :</span> {offer.city || "Non spécifiée"}</div>
              <div><span className="font-medium">Adresse :</span> {offer.masked_address}</div>
            </div>
            <div className="space-y-1">
              <div><span className="font-medium">Rémunération :</span> 
                <span className="font-semibold text-green-600 ml-1">
                  {formatMoney(offer.price_subcontractor_cents, offer.currency)}
                </span>
              </div>
              <div><span className="font-medium">Durée :</span> {offer.estimated_duration_min || "—"} min</div>
              <div><span className="font-medium">Créneau :</span> 
                {offer.scheduled_start ? new Date(offer.scheduled_start).toLocaleString() : "—"}
              </div>
            </div>
          </div>

          {offer.expires_at && !isExpired && (
            <div className="text-xs text-amber-600">
              ⏰ Expire le {new Date(offer.expires_at).toLocaleString()}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 border rounded hover:bg-gray-50 text-sm text-center"
          >
            📍 Carte
          </a>

          {canAccept && (
            <button
              onClick={onAccept}
              disabled={isAccepting}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {isAccepting ? "⏳ Acceptation..." : "✅ Accepter"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}