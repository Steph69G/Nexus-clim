import { useState } from "react";
import { Plus, Search, FileText, Calendar, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useContracts } from "@/hooks/useContracts";
import { formatDate } from "@/lib/dateUtils";
import { CreateContractModal } from "@/components/contracts/CreateContractModal";
import { BackButton } from "@/components/navigation/BackButton";

export default function AdminContracts() {
  const { contracts, loading, refresh } = useContracts();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tileFilter, setTileFilter] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      searchQuery === "" ||
      contract.contract_number.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;

    let matchesTile = true;
    if (tileFilter === "active") {
      matchesTile = contract.status === "active";
    } else if (tileFilter === "expiring") {
      const diffDays = Math.floor(
        (new Date(contract.end_date).getTime() - new Date().getTime()) / 86400000
      );
      matchesTile = contract.status === "active" && diffDays <= 60 && diffDays > 0;
    } else if (tileFilter === "cancelled") {
      matchesTile = contract.status === "cancelled";
    }

    return matchesSearch && matchesStatus && matchesTile;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <BackButton to="/admin/clients" label="Retour aux Clients & Contrats" />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Contrats de Maintenance
          </h1>
          <p className="text-gray-600">
            Gérez les contrats maintenance de vos clients
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouveau Contrat
        </button>
      </div>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro de contrat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="active">Actif</option>
            <option value="suspended">Suspendu</option>
            <option value="expired">Expiré</option>
            <option value="cancelled">Annulé</option>
          </select>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total"
            value={contracts.length}
            icon={<FileText className="w-5 h-5" />}
            color="gray"
            active={tileFilter === null}
            onClick={() => {
              setTileFilter(null);
              setStatusFilter("all");
            }}
          />
          <StatCard
            label="Actifs"
            value={contracts.filter((c) => c.status === "active").length}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
            active={tileFilter === "active"}
            onClick={() => setTileFilter(tileFilter === "active" ? null : "active")}
          />
          <StatCard
            label="Expiration < 60j"
            value={contracts.filter((c) => {
              if (c.status !== "active") return false;
              const diffDays = Math.floor(
                (new Date(c.end_date).getTime() - new Date().getTime()) / 86400000
              );
              return diffDays <= 60 && diffDays > 0;
            }).length}
            icon={<Calendar className="w-5 h-5" />}
            color="orange"
            active={tileFilter === "expiring"}
            onClick={() => setTileFilter(tileFilter === "expiring" ? null : "expiring")}
          />
          <StatCard
            label="Annulés"
            value={contracts.filter((c) => c.status === "cancelled").length}
            icon={<XCircle className="w-5 h-5" />}
            color="red"
            active={tileFilter === "cancelled"}
            onClick={() => setTileFilter(tileFilter === "cancelled" ? null : "cancelled")}
          />
        </div>
      </div>

      {filteredContracts.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-4">
            {searchQuery || statusFilter !== "all"
              ? "Aucun contrat trouvé"
              : "Aucun contrat créé"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Numéro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Durée
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Montant annuel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-sm">
                    <Link
                      to={`/admin/contracts/${contract.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {contract.contract_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {contract.client_name || "Client inconnu"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {contract.duration_years} an{contract.duration_years > 1 ? "s" : ""}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(contract.start_date)} →{" "}
                    {formatDate(contract.end_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {contract.annual_price_ttc.toFixed(2)} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={contract.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateContractModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refresh()}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const colorClasses = {
    gray: "bg-gray-50 text-gray-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
  }[color];

  const activeClasses = {
    gray: "ring-2 ring-gray-400 bg-gray-100",
    green: "ring-2 ring-green-500 bg-green-100",
    orange: "ring-2 ring-orange-500 bg-orange-100",
    red: "ring-2 ring-red-500 bg-red-100",
  }[color];

  return (
    <div
      onClick={onClick}
      className={`p-4 border rounded-lg transition-all cursor-pointer hover:shadow-md ${
        active ? activeClasses : "hover:border-gray-400"
      }`}
    >
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colorClasses}`}>{icon}</div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    draft: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
    active: { label: "Actif", color: "bg-green-100 text-green-700" },
    suspended: { label: "Suspendu", color: "bg-yellow-100 text-yellow-700" },
    expired: { label: "Expiré", color: "bg-red-100 text-red-700" },
    cancelled: { label: "Annulé", color: "bg-gray-100 text-gray-700" },
    renewed: { label: "Renouvelé", color: "bg-blue-100 text-blue-700" },
  }[status] || { label: status, color: "bg-gray-100 text-gray-700" };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
