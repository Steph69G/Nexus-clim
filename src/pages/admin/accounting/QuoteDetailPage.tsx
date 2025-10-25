import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Mail, CheckCircle, XCircle, FileText, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/ui/toast/ToastProvider';
import SubPageLayout from '@/layouts/SubPageLayout';

type Quote = {
  id: string;
  quote_number: string | null;
  client_id: string;
  total_cents: number;
  currency: string;
  status: string;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type QuoteItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  tax_rate: number;
  sort_order: number;
};

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { push } = useToast();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadQuote();
  }, [id]);

  async function loadQuote() {
    try {
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (quoteError) throw quoteError;
      if (!quoteData) {
        push({ type: 'error', message: 'Devis introuvable' });
        navigate('/admin/comptabilite/quotes');
        return;
      }

      setQuote(quoteData as Quote);

      const { data: itemsData, error: itemsError } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', id)
        .order('sort_order', { ascending: true });

      if (itemsError) throw itemsError;
      setItems((itemsData || []) as QuoteItem[]);
    } catch (error) {
      console.error('Error loading quote:', error);
      push({ type: 'error', message: 'Erreur lors du chargement du devis' });
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: string) {
    if (!quote) return;

    try {
      setUpdating(true);
      const { error } = await supabase
        .from('quotes')
        .update({ status: newStatus })
        .eq('id', quote.id);

      if (error) throw error;

      const statusLabels: Record<string, string> = {
        approved: 'approuvé',
        rejected: 'refusé',
        converted: 'converti',
      };

      push({ type: 'success', message: `Devis ${statusLabels[newStatus] || newStatus}` });
      loadQuote();
    } catch (error: any) {
      console.error('Error updating status:', error);
      push({ type: 'error', message: error.message || 'Erreur lors de la mise à jour' });
    } finally {
      setUpdating(false);
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg">Brouillon</span>;
      case 'awaiting_approval':
        return <span className="px-4 py-2 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-lg">En attente</span>;
      case 'approved':
        return <span className="px-4 py-2 bg-green-100 text-green-700 text-sm font-semibold rounded-lg">Approuvé</span>;
      case 'rejected':
        return <span className="px-4 py-2 bg-red-100 text-red-700 text-sm font-semibold rounded-lg">Refusé</span>;
      case 'converted':
        return <span className="px-4 py-2 bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg">Converti</span>;
      default:
        return <span className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg">{status}</span>;
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price_cents, 0);
  };

  const calculateTax = () => {
    return items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price_cents * (item.tax_rate / 100),
      0
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Devis introuvable</p>
        </div>
      </div>
    );
  }

  const subtotal = calculateSubtotal();
  const tax = calculateTax();
  const total = subtotal + tax;

  return (
    <SubPageLayout fallbackPath="/admin/comptabilite/quotes" className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-200 bg-gradient-to-r from-green-50 to-slate-50">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  Devis {quote.quote_number || 'Brouillon'}
                </h1>
                <p className="text-slate-600">
                  Créé le {formatDate(quote.created_at)}
                </p>
              </div>
              <div>{getStatusBadge(quote.status)}</div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => push({ type: 'info', message: 'Génération PDF à venir' })}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Télécharger PDF
              </button>
              <button
                onClick={() => push({ type: 'info', message: 'Envoi email à venir' })}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Envoyer par email
              </button>
              {(quote.status === 'draft' || quote.status === 'awaiting_approval') && (
                <>
                  <button
                    onClick={() => updateStatus('approved')}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {updating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approuver
                  </button>
                  <button
                    onClick={() => updateStatus('rejected')}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {updating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Refuser
                  </button>
                </>
              )}
              {quote.status === 'approved' && (
                <button
                  onClick={() => push({ type: 'info', message: 'Conversion en mission à venir' })}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Convertir en mission
                </button>
              )}
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Client</h3>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-slate-900">{quote.client_id}</p>
                  <p className="text-sm text-slate-500">ID Client: {quote.client_id}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Valide jusqu'au</p>
                    <p className="font-semibold text-slate-900">{formatDate(quote.valid_until)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Montant total</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(quote.total_cents)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase mb-4">Articles / Services</h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        Description
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                        Quantité
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                        Prix unitaire
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                        TVA
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? (
                      items.map((item) => (
                        <tr key={item.id} className="border-t border-slate-200">
                          <td className="py-3 px-4 text-slate-900">{item.description}</td>
                          <td className="py-3 px-4 text-center text-slate-600">{item.quantity}</td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            {formatCurrency(item.unit_price_cents)}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600">{item.tax_rate}%</td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-900">
                            {formatCurrency(item.quantity * item.unit_price_cents)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          Aucun article
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-3 bg-slate-50 rounded-lg p-6">
                <div className="flex justify-between text-slate-700">
                  <span>Sous-total HT</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>TVA</span>
                  <span className="font-semibold">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-slate-900 pt-3 border-t border-slate-300">
                  <span>Total TTC</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {quote.notes && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Notes / Conditions</h3>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-slate-700 whitespace-pre-wrap">{quote.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SubPageLayout>
  );
}
