import { DollarSign, Download, Eye, FileText, Calendar, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/supabase";

type Invoice = {
  id: string;
  invoice_number: string;
  mission_id: string;
  total_cents: number;
  payment_status: string;
  issue_date: string;
  due_date: string;
  created_at: string;
};

export default function ClientInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    paid: 0,
    total: 0,
  });
  useEffect(() => {
    if (!user) return;

    async function fetchInvoices() {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profile) return;

        const { data: userClient } = await supabase
          .from('user_clients')
          .select('client_account_id')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (!userClient?.client_account_id) return;

        const { data, error } = await supabase
          .from('invoices')
          .select('id, invoice_number, mission_id, total_cents, payment_status, issue_date, due_date, created_at')
          .eq('client_id', userClient.client_account_id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setInvoices(data || []);

        const pending = data?.filter(inv => inv.payment_status === 'en_attente' || inv.payment_status === 'overdue').length || 0;
        const paid = data?.filter(inv => inv.payment_status === 'payee').length || 0;
        const total = data?.reduce((sum, inv) => sum + (inv.total_cents || 0), 0) || 0;

        setStats({ pending, paid, total: total / 100 });
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, [user]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'payee':
        return <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">Payée</span>;
      case 'en_attente':
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded-full">En attente</span>;
      case 'overdue':
        return <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">En retard</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full">Annulée</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full">{status}</span>;
    }
  };

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
            value={stats.pending.toString()}
            color="orange"
          />
          <StatCard
            label="Factures payées"
            value={stats.paid.toString()}
            color="green"
          />
          <StatCard
            label="Total TTC"
            value={new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.total)}
            color="blue"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Historique des factures
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600">Chargement...</p>
            </div>
          ) : invoices.length === 0 ? (
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Numéro</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Échéance</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Montant</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-900">{invoice.invoice_number || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {invoice.issue_date ? formatDate(invoice.issue_date) : formatDate(invoice.created_at)}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-semibold text-slate-900">{formatCurrency(invoice.total_cents)}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {getStatusBadge(invoice.payment_status)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Voir la facture"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Télécharger"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
