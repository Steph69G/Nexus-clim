import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, DollarSign, FileText, Package, AlertCircle } from "lucide-react";
import { useContract } from "@/hooks/useContracts";
import { formatDate } from "@/lib/dateUtils";

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contract, equipment, loading, error } = useContract(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Chargement du contrat...</div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Erreur</h3>
            <p className="text-red-700">{error || "Contrat introuvable"}</p>
            <button
              onClick={() => navigate("/admin/contracts")}
              className="mt-4 text-sm text-red-600 hover:underline"
            >
              Retour aux contrats
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    suspended: "bg-yellow-100 text-yellow-800",
    expired: "bg-red-100 text-red-800",
    cancelled: "bg-red-100 text-red-800",
    renewed: "bg-blue-100 text-blue-800",
  };

  const statusLabels: Record<string, string> = {
    draft: "Brouillon",
    active: "Actif",
    suspended: "Suspendu",
    expired: "Expiré",
    cancelled: "Annulé",
    renewed: "Renouvelé",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Retour
      </button>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Contrat {contract.contract_number}
            </h1>
            <p className="text-gray-600">
              Créé le {formatDate(contract.created_at)}
            </p>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              statusColors[contract.status] || statusColors.draft
            }`}
          >
            {statusLabels[contract.status] || contract.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <InfoCard
            icon={<Calendar className="w-5 h-5" />}
            label="Date de début"
            value={formatDate(contract.start_date)}
          />
          <InfoCard
            icon={<Calendar className="w-5 h-5" />}
            label="Date de fin"
            value={formatDate(contract.end_date)}
          />
          <InfoCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Prix annuel HT"
            value={`${contract.annual_price_ht}€`}
          />
          <InfoCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Prix annuel TTC"
            value={`${contract.annual_price_ttc}€`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Informations
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Durée</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {contract.duration_years} an{contract.duration_years > 1 ? "s" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Type d'origine</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {contract.origin_type === "new_installation"
                  ? "Nouvelle installation"
                  : "Équipement existant"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Mode de paiement</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {contract.payment_mode === "annual_debit"
                  ? "Prélèvement annuel"
                  : "Paiement unique"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Statut paiement</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {contract.payment_status === "paid"
                  ? "Payé"
                  : contract.payment_status === "pending"
                  ? "En attente"
                  : contract.payment_status}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Renouvellement auto</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {contract.auto_renewal ? "Oui" : "Non"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Détails financiers
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total HT</dt>
              <dd className="text-lg font-semibold text-gray-900 mt-1">
                {contract.total_price_ht}€
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total TTC</dt>
              <dd className="text-lg font-semibold text-gray-900 mt-1">
                {contract.total_price_ttc}€
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Taux TVA</dt>
              <dd className="text-sm text-gray-900 mt-1">{contract.vat_rate}%</dd>
            </div>
            {contract.discounted_total_ttc && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Prix réduit TTC</dt>
                <dd className="text-lg font-semibold text-green-600 mt-1">
                  {contract.discounted_total_ttc}€
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Équipements ({equipment.length})
          </h2>
        </div>

        {equipment.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Aucun équipement associé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {equipment.map((eq) => (
              <div
                key={eq.id}
                className="border rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{eq.equipment_type}</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  {eq.equipment_brand && (
                    <p>
                      <span className="font-medium">Marque:</span> {eq.equipment_brand}
                    </p>
                  )}
                  {eq.equipment_model && (
                    <p>
                      <span className="font-medium">Modèle:</span> {eq.equipment_model}
                    </p>
                  )}
                  {eq.equipment_location && (
                    <p>
                      <span className="font-medium">Emplacement:</span>{" "}
                      {eq.equipment_location}
                    </p>
                  )}
                  {eq.equipment_serial_number && (
                    <p>
                      <span className="font-medium">N° série:</span>{" "}
                      {eq.equipment_serial_number}
                    </p>
                  )}
                  {eq.annual_price_ttc && (
                    <p className="text-blue-600 font-semibold mt-2">
                      {eq.annual_price_ttc}€ TTC/an
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {contract.internal_notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-gray-900 mb-2">Notes internes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{contract.internal_notes}</p>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-blue-50 rounded-lg text-blue-600">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase font-medium">{label}</p>
        <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  );
}
