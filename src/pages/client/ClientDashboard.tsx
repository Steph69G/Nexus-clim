import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { FileText, Package, DollarSign, User } from "lucide-react";

export default function ClientDashboard() {
  const { profile } = useProfile();
  const [clientData, setClientData] = useState<any>(null);
  const [stats, setStats] = useState({ requests: 0, inProgress: 0, invoices: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientData();
    loadStats();
  }, [profile]);

  async function loadClientData() {
    if (!profile?.user_id) return;

    try {
      const { data, error } = await supabase
        .from("user_clients")
        .select("*")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      if (error) throw error;
      setClientData(data);
    } catch (err) {
      console.error("Error loading client data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    if (!profile?.id) return;

    try {
      const { count: requestsCount, error: requestsError } = await supabase
        .from("client_requests")
        .select("client_accounts!inner(auth_user_id)", { count: "exact", head: true })
        .eq("client_accounts.auth_user_id", profile.id);

      const { count: inProgressCount, error: inProgressError } = await supabase
        .from("client_requests")
        .select("client_accounts!inner(auth_user_id)", { count: "exact", head: true })
        .eq("client_accounts.auth_user_id", profile.id)
        .in("status", ["en_cours", "accepte", "planifie"]);

      const { count: invoicesCount, error: invoicesError } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("client_account_id", profile.id);

      if (!requestsError && requestsCount !== null) {
        setStats((prev) => ({ ...prev, requests: requestsCount }));
      }
      if (!inProgressError && inProgressCount !== null) {
        setStats((prev) => ({ ...prev, inProgress: inProgressCount }));
      }
      if (!invoicesError && invoicesCount !== null) {
        setStats((prev) => ({ ...prev, invoices: invoicesCount }));
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Bienvenue, {profile?.full_name || "Client"}
          </h1>
          <p className="text-slate-600">
            Gérez vos demandes et consultez vos factures
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<User className="w-6 h-6" />}
            title="Type de compte"
            value={clientData?.client_type === "professionnel" ? "Professionnel" : "Particulier"}
            color="blue"
          />
          <StatCard
            icon={<FileText className="w-6 h-6" />}
            title="Demandes"
            value={stats.requests.toString()}
            color="green"
          />
          <StatCard
            icon={<Package className="w-6 h-6" />}
            title="En cours"
            value={stats.inProgress.toString()}
            color="orange"
          />
          <StatCard
            icon={<DollarSign className="w-6 h-6" />}
            title="Factures"
            value={stats.invoices.toString()}
            color="purple"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Mes informations
            </h2>
            <div className="space-y-3">
              <InfoRow label="Nom" value={profile?.full_name || "-"} />
              <InfoRow label="Email" value={profile?.email || "-"} />
              <InfoRow label="Téléphone" value={profile?.phone || "-"} />
              {clientData?.client_type === "professionnel" && (
                <>
                  <InfoRow label="Entreprise" value={clientData?.company_name || "-"} />
                  <InfoRow label="SIRET" value={clientData?.siret || "-"} />
                </>
              )}
            </div>
            <Link
              to="/account/profile"
              className="mt-4 block text-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
            >
              Modifier mon profil
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Actions rapides
            </h2>
            <div className="space-y-3">
              <ActionButton
                to="/client/requests"
                icon={<FileText className="w-5 h-5" />}
                title="Faire une nouvelle demande"
                description="Demandez un devis ou un rendez-vous"
              />
              <ActionButton
                to="/client/requests"
                icon={<Package className="w-5 h-5" />}
                title="Suivre mes demandes"
                description="Consultez l'état de vos demandes"
              />
              <ActionButton
                to="/client/invoices"
                icon={<DollarSign className="w-5 h-5" />}
                title="Voir mes factures"
                description="Téléchargez vos factures"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-900 mb-2">
            Besoin d'aide ?
          </h3>
          <p className="text-slate-600 mb-4">
            Notre équipe est disponible pour répondre à vos questions et vous accompagner.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="tel:+33123456789"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Nous appeler
            </a>
            <a
              href="mailto:contact@nexusclim.fr"
              className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Nous écrire
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: string;
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600 border-blue-200",
    green: "bg-green-100 text-green-600 border-green-200",
    orange: "bg-orange-100 text-orange-600 border-orange-200",
    purple: "bg-purple-100 text-purple-600 border-purple-200",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colorClasses[color as keyof typeof colorClasses]} mb-4`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm text-slate-600">{title}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function ActionButton({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
          {title}
        </div>
        <div className="text-sm text-slate-600">{description}</div>
      </div>
    </Link>
  );
}
