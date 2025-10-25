import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Download, Mail, CheckCircle, Calendar, CreditCard, FileText, Printer, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/ui/toast/ToastProvider';
import SubPageLayout from '@/layouts/SubPageLayout';

type Invoice = {
  id: string;
  invoice_number: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  client_city: string;
  client_zip: string;
  items: any[];
  subtotal_cents: number;
  tax_rate: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  payment_status: string;
  payment_method: string | null;
  paid_amount_cents: number;
  issue_date: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  mission_id: string;
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { push } = useToast();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadInvoice();
  }, [id]);

  async function loadInvoice() {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        push({ type: 'error', message: 'Facture introuvable' });
        navigate('/admin/comptabilite/invoices');
        return;
      }

      setInvoice(data as Invoice);
    } catch (error) {
      console.error('Error loading invoice:', error);
      push({ type: 'error', message: 'Erreur lors du chargement de la facture' });
    } finally {
      setLoading(false);
    }
  }

  async function markAsPaid() {
    if (!invoice) return;

    try {
      setMarking(true);
      const { error } = await supabase
        .from('invoices')
        .update({
          payment_status: 'payee',
          paid_amount_cents: invoice.total_cents,
          payment_method: 'virement',
        })
        .eq('id', invoice.id);

      if (error) throw error;

      push({ type: 'success', message: 'Facture marquée comme payée' });
      loadInvoice();
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      push({ type: 'error', message: error.message || 'Erreur lors de la mise à jour' });
    } finally {
      setMarking(false);
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
      case 'payee':
        return <span className="px-4 py-2 bg-green-100 text-green-700 text-sm font-semibold rounded-lg">Payée</span>;
      case 'en_attente':
        return <span className="px-4 py-2 bg-orange-100 text-orange-700 text-sm font-semibold rounded-lg">En attente</span>;
      case 'overdue':
        return <span className="px-4 py-2 bg-red-100 text-red-700 text-sm font-semibold rounded-lg">En retard</span>;
      case 'cancelled':
        return <span className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg">Annulée</span>;
      default:
        return <span className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement de la facture...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Facture introuvable</p>
        </div>
      </div>
    );
  }

  return (
    <SubPageLayout fallbackPath="/admin/comptabilite/invoices" className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  Facture {invoice.invoice_number || 'Brouillon'}
                </h1>
                <p className="text-slate-600">
                  Émise le {formatDate(invoice.issue_date || invoice.created_at)}
                </p>
              </div>
              <div>{getStatusBadge(invoice.payment_status)}</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => push({ type: 'info', message: 'Génération PDF à venir' })}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
              {invoice.payment_status !== 'payee' && (
                <button
                  onClick={markAsPaid}
                  disabled={marking}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {marking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Marquer comme payée
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Client</h3>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-slate-900">{invoice.client_name}</p>
                  <p className="text-slate-600">{invoice.client_address}</p>
                  <p className="text-slate-600">
                    {invoice.client_zip} {invoice.client_city}
                  </p>
                  <p className="text-slate-600">{invoice.client_email}</p>
                  <p className="text-slate-600">{invoice.client_phone}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Date d'échéance</p>
                    <p className="font-semibold text-slate-900">{formatDate(invoice.due_date)}</p>
                  </div>
                </div>
                {invoice.payment_method && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                    <CreditCard className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Moyen de paiement</p>
                      <p className="font-semibold text-slate-900">{invoice.payment_method}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Mission liée</p>
                    <Link
                      to={`/admin/missions/${invoice.mission_id}`}
                      className="font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Voir la mission →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase mb-4">Articles</h3>
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
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item: any, index: number) => (
                        <tr key={index} className="border-t border-slate-200">
                          <td className="py-3 px-4 text-slate-900">{item.description || item.label || 'Article'}</td>
                          <td className="py-3 px-4 text-center text-slate-600">{item.quantity || 1}</td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            {formatCurrency((item.unit_price_cents || item.price_cents || 0))}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-900">
                            {formatCurrency((item.quantity || 1) * (item.unit_price_cents || item.price_cents || 0))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
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
                  <span className="font-semibold">{formatCurrency(invoice.subtotal_cents)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>TVA ({invoice.tax_rate}%)</span>
                  <span className="font-semibold">{formatCurrency(invoice.tax_cents)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-slate-900 pt-3 border-t border-slate-300">
                  <span>Total TTC</span>
                  <span>{formatCurrency(invoice.total_cents)}</span>
                </div>
                {invoice.paid_amount_cents > 0 && (
                  <div className="flex justify-between text-green-700 pt-2 border-t border-slate-300">
                    <span>Montant payé</span>
                    <span className="font-semibold">{formatCurrency(invoice.paid_amount_cents)}</span>
                  </div>
                )}
              </div>
            </div>

            {invoice.notes && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Notes</h3>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SubPageLayout>
  );
}
