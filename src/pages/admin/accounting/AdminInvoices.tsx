import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@/lib/useQuery';
import { normInvoiceStatus, normSort } from '@/lib/querySchemas';
import { MAP_INVOICE_UI2DB, toDbArray } from '@/lib/statusMaps';
import { BackButton } from '@/components/navigation/BackButton';

type Invoice = {
  id: string;
  invoice_number: string | null;
  client_id: string | null;
  total_cents: number;
  currency: string;
  status: string;
  payment_status: string;
  due_date: string | null;
  created_at: string;
};

export default function AdminInvoices() {
  const { get, set } = useQuery();
  const [statusUI, setStatusUI] = useState(() => normInvoiceStatus(get('status')) ?? 'open');
  const [sort, setSort] = useState(() => normSort(get('sort')));
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    set({ status: statusUI, sort });
  }, [statusUI, sort]);

  useEffect(() => {
    loadInvoices();
  }, [statusUI, sort]);

  async function loadInvoices() {
    try {
      setLoading(true);
      const dbStatuses = toDbArray(MAP_INVOICE_UI2DB, statusUI, 'open');

      let query = supabase.from('invoices').select('*').in('payment_status', dbStatuses);

      if (sort === 'created_desc') {
        query = query.order('created_at', { ascending: false });
      } else if (sort === 'date_asc') {
        query = query.order('due_date', { ascending: true, nullsFirst: false });
      } else {
        query = query.order('updated_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredInvoices = invoices.filter(
    (inv) => inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  const getStatusBadge = (paymentStatus: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      sent: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
    };
    return colors[paymentStatus] || 'bg-slate-100 text-slate-700';
  };

  const getStatusLabel = (paymentStatus: string) => {
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      sent: 'Envoyée',
      paid: 'Payée',
      overdue: 'Impayée',
    };
    return labels[paymentStatus] || paymentStatus;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <BackButton to="/admin/comptabilite" label="Retour à la Comptabilité" />
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Factures</h1>
            <p className="text-slate-600 mt-1">Gérez vos factures clients</p>
          </div>
          <Link
            to="/admin/comptabilite/invoices/create"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouvelle facture
          </Link>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div className="flex gap-2">
              {['open', 'overdue', 'closed'].map((s) => (
                <button
                  key={s}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusUI === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  onClick={() => setStatusUI(s)}
                >
                  {s === 'open' && 'Ouvertes'}
                  {s === 'overdue' && 'Impayées'}
                  {s === 'closed' && 'Payées'}
                </button>
              ))}
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="updated_desc">Plus récentes</option>
              <option value="created_desc">Créées récemment</option>
              <option value="date_asc">Date échéance ↑</option>
            </select>

            <div className="flex-1 relative min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par numéro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Chargement...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg font-medium">Aucune facture</p>
              <p className="text-slate-500 text-sm">
                {statusUI === 'overdue'
                  ? 'Aucune facture impayée'
                  : statusUI === 'closed'
                  ? 'Aucune facture payée'
                  : 'Créez votre première facture depuis une mission'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Numéro
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Client
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                      Montant
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Échéance
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Statut
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">
                        {invoice.invoice_number || 'Brouillon'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {invoice.client_id || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900 text-right font-semibold">
                        {(invoice.total_cents / 100).toFixed(2)} {invoice.currency}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {invoice.due_date
                          ? new Date(invoice.due_date).toLocaleDateString('fr-FR')
                          : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                            invoice.payment_status
                          )}`}
                        >
                          {getStatusLabel(invoice.payment_status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/admin/comptabilite/invoices/${invoice.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Voir →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {statusUI === 'overdue' && filteredInvoices.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              ⚠️ <strong>{filteredInvoices.length} facture(s) impayée(s)</strong>. Envoyez des
              relances ou contactez les clients directement.
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Astuce :</strong> Les factures sont générées automatiquement depuis les
            missions terminées. Consultez le statut de paiement et envoyez des relances
            directement depuis cette interface.
          </p>
        </div>
      </div>
    </div>
  );
}
