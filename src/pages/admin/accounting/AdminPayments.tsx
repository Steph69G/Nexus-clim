import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Plus, Search, Calendar, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/ui/toast/ToastProvider';
import { BackButton } from '@/components/navigation/BackButton';

type Payment = {
  id: string;
  invoice_id: string;
  amount_cents: number;
  payment_method: string | null;
  payment_date: string;
  reference: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  invoice?: {
    invoice_number: string | null;
    client_name: string;
  };
};

type Stats = {
  today: number;
  week: number;
  month: number;
  pending: number;
};

export default function AdminPayments() {
  const { push } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>({ today: 0, week: 0, month: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadPayments();
    loadStats();
  }, [filterStatus]);

  async function loadPayments() {
    try {
      setLoading(true);

      let query = supabase
        .from('payments')
        .select(`
          *,
          invoice:invoices(invoice_number, client_name)
        `)
        .order('payment_date', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      push({ type: 'error', message: 'Erreur lors du chargement des paiements' });
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: allPayments } = await supabase
        .from('payments')
        .select('amount_cents, payment_date, status')
        .eq('status', 'completed');

      if (!allPayments) return;

      const today = allPayments
        .filter(p => p.payment_date >= startOfDay)
        .reduce((sum, p) => sum + p.amount_cents, 0);

      const week = allPayments
        .filter(p => p.payment_date >= startOfWeek)
        .reduce((sum, p) => sum + p.amount_cents, 0);

      const month = allPayments
        .filter(p => p.payment_date >= startOfMonth)
        .reduce((sum, p) => sum + p.amount_cents, 0);

      const { count: pendingCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats({
        today: today / 100,
        week: week / 100,
        month: month / 100,
        pending: pendingCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

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
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      refunded: 'bg-slate-100 text-slate-700',
    };
    const labels: Record<string, string> = {
      pending: 'En attente',
      completed: 'Validé',
      failed: 'Échoué',
      refunded: 'Remboursé',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-slate-100 text-slate-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getMethodLabel = (method: string | null) => {
    const labels: Record<string, string> = {
      virement: 'Virement',
      cb: 'Carte bancaire',
      especes: 'Espèces',
      cheque: 'Chèque',
      prelevement: 'Prélèvement',
      autre: 'Autre',
    };
    return labels[method || ''] || method || '-';
  };

  const filteredPayments = payments.filter(
    (payment) =>
      payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice?.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <BackButton to="/admin/comptabilite" label="Retour à la Comptabilité" />
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Paiements</h1>
            <p className="text-slate-600 mt-1">Gérez les encaissements et rapprochements bancaires</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Enregistrer un paiement
          </button>
        </header>

        <div className="grid lg:grid-cols-4 gap-6">
          <StatsCard
            icon={<DollarSign className="w-6 h-6 text-blue-600" />}
            label="Aujourd'hui"
            value={new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.today)}
            color="blue"
          />
          <StatsCard
            icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
            label="Cette semaine"
            value={new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.week)}
            color="emerald"
          />
          <StatsCard
            icon={<Calendar className="w-6 h-6 text-violet-600" />}
            label="Ce mois"
            value={new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.month)}
            color="violet"
          />
          <StatsCard
            icon={<FileText className="w-6 h-6 text-orange-600" />}
            label="En attente"
            value={stats.pending.toString()}
            color="orange"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div className="flex-1 relative min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par référence, facture, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2">
              {['all', 'completed', 'pending', 'failed'].map((status) => (
                <button
                  key={status}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  onClick={() => setFilterStatus(status)}
                >
                  {status === 'all' && 'Tous'}
                  {status === 'completed' && 'Validés'}
                  {status === 'pending' && 'En attente'}
                  {status === 'failed' && 'Échoués'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Chargement...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg font-medium">Aucun paiement</p>
              <p className="text-slate-500 text-sm">
                {filterStatus === 'pending'
                  ? 'Aucun paiement en attente'
                  : filterStatus === 'failed'
                  ? 'Aucun paiement échoué'
                  : 'Enregistrez votre premier paiement'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Facture</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Méthode</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Montant</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Référence</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <Link
                          to={`/admin/comptabilite/invoices/${payment.invoice_id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {payment.invoice?.invoice_number || 'N/A'}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900">
                        {payment.invoice?.client_name || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {getMethodLabel(payment.payment_method)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-slate-900">
                        {formatCurrency(payment.amount_cents)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {payment.reference || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(payment.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-sm text-emerald-800">
            💡 <strong>Astuce :</strong> Les paiements sont automatiquement rapprochés avec les factures.
            Utilisez le bouton "Enregistrer un paiement" pour ajouter manuellement un encaissement.
          </p>
        </div>
      </div>

      {showAddModal && (
        <AddPaymentModal onClose={() => setShowAddModal(false)} onSuccess={() => { loadPayments(); loadStats(); }} />
      )}
    </div>
  );
}

function StatsCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'emerald' | 'violet' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    emerald: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    violet: 'bg-violet-100 text-violet-600 border-violet-200',
    orange: 'bg-orange-100 text-orange-600 border-orange-200',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colorClasses[color]} mb-4`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  );
}

function AddPaymentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { push } = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    invoice_id: '',
    amount_cents: '',
    payment_method: 'virement',
    payment_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });

  useEffect(() => {
    loadUnpaidInvoices();
  }, []);

  async function loadUnpaidInvoices() {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, client_name, total_cents')
        .neq('payment_status', 'payee')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.invoice_id || !formData.amount_cents) {
      push({ type: 'error', message: 'Veuillez remplir tous les champs obligatoires' });
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.from('payments').insert({
        invoice_id: formData.invoice_id,
        amount_cents: parseFloat(formData.amount_cents) * 100,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        reference: formData.reference || null,
        notes: formData.notes || null,
        status: 'completed',
      });

      if (error) throw error;

      push({ type: 'success', message: 'Paiement enregistré avec succès' });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving payment:', error);
      push({ type: 'error', message: error.message || 'Erreur lors de l\'enregistrement' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Enregistrer un paiement</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Chargement...</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Facture <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.invoice_id}
                  onChange={(e) => setFormData({ ...formData, invoice_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Sélectionner une facture</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - {invoice.client_name} - {(invoice.total_cents / 100).toFixed(2)} €
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Montant (€) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount_cents}
                    onChange={(e) => setFormData({ ...formData, amount_cents: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Méthode de paiement
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="virement">Virement</option>
                    <option value="cb">Carte bancaire</option>
                    <option value="especes">Espèces</option>
                    <option value="cheque">Chèque</option>
                    <option value="prelevement">Prélèvement</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Date du paiement
                  </label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Référence transaction
                  </label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="Ex: TRX123456"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Notes additionnelles..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
