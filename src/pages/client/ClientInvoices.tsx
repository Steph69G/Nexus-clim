import { DollarSign, Download, Eye, FileText } from "lucide-react";

export default function ClientInvoices() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mes factures</h1>
          <p className="text-slate-600">
            Consultez et téléchargez vos factures
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            label="Factures en attente"
            value="0"
            color="orange"
          />
          <StatCard
            label="Factures payées"
            value="0"
            color="green"
          />
          <StatCard
            label="Total TTC"
            value="0,00 €"
            color="blue"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Historique des factures
            </h2>
            <div className="flex gap-2">
              <select className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Toutes les factures</option>
                <option>En attente</option>
                <option>Payées</option>
              </select>
            </div>
          </div>

          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Aucune facture pour le moment
            </h3>
            <p className="text-slate-600">
              Vos factures apparaîtront ici une fois vos demandes traitées
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "green" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600 border-blue-200",
    green: "bg-green-100 text-green-600 border-green-200",
    orange: "bg-orange-100 text-orange-600 border-orange-200",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colorClasses[color]} mb-4`}>
        <DollarSign className="w-6 h-6" />
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  );
}
