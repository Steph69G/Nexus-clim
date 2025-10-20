import { useState } from "react";
import { FileText, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { useClientActiveContracts } from "@/hooks/useContracts";
import { useProfile } from "@/hooks/useProfile";

export default function ClientPortal() {
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState<"contracts" | "documents" | "emergency">("contracts");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Espace Client</h1>
        <p className="text-gray-600">
          Gérez vos contrats, consultez vos documents et demandez un dépannage
        </p>
      </div>

      <div className="border-b mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("contracts")}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === "contracts"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Mes Contrats
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === "documents"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Mes Documents
          </button>
          <button
            onClick={() => setActiveTab("emergency")}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === "emergency"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <AlertCircle className="w-5 h-5 inline mr-2" />
            Dépannage Express
          </button>
        </nav>
      </div>

      {activeTab === "contracts" && <ContractsTab />}
      {activeTab === "documents" && <DocumentsTab />}
      {activeTab === "emergency" && <EmergencyTab />}
    </div>
  );
}

function ContractsTab() {
  return (
    <div>
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Contrats de Maintenance</h2>
        <p className="text-gray-600 mb-4">
          Vos contrats de maintenance apparaîtront ici.
        </p>
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-16 h-16 mx-auto mb-4" />
          <p>Aucun contrat actif</p>
        </div>
      </div>
    </div>
  );
}

function DocumentsTab() {
  return (
    <div>
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Mes Documents</h2>
        <p className="text-gray-600 mb-4">
          Retrouvez tous vos devis, factures, attestations et documents.
        </p>
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-16 h-16 mx-auto mb-4" />
          <p>Aucun document disponible</p>
        </div>
      </div>
    </div>
  );
}

function EmergencyTab() {
  return (
    <div>
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-start gap-4 mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-900 mb-1">
              Dépannage Express
            </h3>
            <p className="text-sm text-orange-700">
              Panne ou problème urgent ? Nous intervenons dans les 48h maximum.
            </p>
          </div>
        </div>

        <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
          <AlertCircle className="w-5 h-5 inline mr-2" />
          Demander un dépannage
        </button>

        <div className="mt-8">
          <h3 className="font-semibold mb-4">Mes demandes de dépannage</h3>
          <div className="text-center py-12 text-gray-400">
            <Clock className="w-16 h-16 mx-auto mb-4" />
            <p>Aucune demande en cours</p>
          </div>
        </div>
      </div>
    </div>
  );
}
