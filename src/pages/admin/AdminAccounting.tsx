import { FileText, CreditCard, AlertCircle } from "lucide-react";

export default function AdminAccounting() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Comptabilité</h1>
          </div>
          <p className="text-slate-600 ml-15">
            Gérez vos factures, paiements et relances depuis votre espace centralisé
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<FileText className="w-8 h-8 text-blue-600" />}
            title="Factures"
            description="Créez et suivez vos factures clients"
            status="À venir"
          />
          <FeatureCard
            icon={<CreditCard className="w-8 h-8 text-green-600" />}
            title="Paiements"
            description="Gérez les encaissements et historiques"
            status="À venir"
          />
          <FeatureCard
            icon={<AlertCircle className="w-8 h-8 text-orange-600" />}
            title="Relances"
            description="Automatisez les relances de paiement"
            status="À venir"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  status
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 mb-3">{description}</p>
      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
        {status}
      </span>
    </div>
  );
}
