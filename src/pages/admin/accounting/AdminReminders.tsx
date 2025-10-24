import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Send, Clock, CheckCircle, XCircle, Filter, Mail, Calendar, Euro } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { supabase } from '@/supabase';

type Reminder = {
  id: string;
  invoice_id: string;
  reminder_number: number;
  sent_at: string;
  status: 'pending' | 'sent' | 'failed';
  next_reminder_date: string | null;
  invoice: {
    invoice_number: string;
    total_amount: number;
    due_date: string;
    client: {
      company_name: string;
      email: string;
    };
  };
};

type Invoice = {
  id: string;
  invoice_number: string;
  total_amount: number;
  due_date: string;
  payment_status: string;
  days_overdue: number;
  client: {
    company_name: string;
    email: string;
  };
};

export default function AdminReminders() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('all');
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: remindersData } = await supabase
        .from('payment_reminders')
        .select(`
          *,
          invoice:invoices(
            invoice_number,
            total_amount,
            due_date,
            client:user_clients(company_name, email)
          )
        `)
        .order('sent_at', { ascending: false });

      const { data: overdueData } = await supabase
        .from('invoices')
        .select(`
          *,
          client:user_clients(company_name, email)
        `)
        .eq('payment_status', 'unpaid')
        .lt('due_date', new Date().toISOString());

      const overdueWithDays = (overdueData || []).map(inv => ({
        ...inv,
        days_overdue: Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
      })).sort((a, b) => b.days_overdue - a.days_overdue);

      setReminders(remindersData || []);
      setOverdueInvoices(overdueWithDays);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (invoiceId: string) => {
    setSendingReminder(invoiceId);
    try {
      const invoice = overdueInvoices.find(i => i.id === invoiceId);
      if (!invoice) return;

      const existingReminders = await supabase
        .from('payment_reminders')
        .select('reminder_number')
        .eq('invoice_id', invoiceId)
        .order('reminder_number', { ascending: false })
        .limit(1);

      const nextNumber = (existingReminders.data?.[0]?.reminder_number || 0) + 1;

      const { error } = await supabase
        .from('payment_reminders')
        .insert({
          invoice_id: invoiceId,
          reminder_number: nextNumber,
          sent_at: new Date().toISOString(),
          status: 'sent',
          next_reminder_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (error) throw error;

      alert(`Relance #${nextNumber} envoyée à ${invoice.client.company_name}`);
      loadData();
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Erreur lors de l\'envoi de la relance');
    } finally {
      setSendingReminder(null);
    }
  };

  const scheduleAutomaticReminder = async (invoiceId: string, daysDelay: number) => {
    try {
      const invoice = overdueInvoices.find(i => i.id === invoiceId);
      if (!invoice) return;

      const existingReminders = await supabase
        .from('payment_reminders')
        .select('reminder_number')
        .eq('invoice_id', invoiceId)
        .order('reminder_number', { ascending: false })
        .limit(1);

      const nextNumber = (existingReminders.data?.[0]?.reminder_number || 0) + 1;

      const { error } = await supabase
        .from('payment_reminders')
        .insert({
          invoice_id: invoiceId,
          reminder_number: nextNumber,
          status: 'pending',
          next_reminder_date: new Date(Date.now() + daysDelay * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (error) throw error;

      alert(`Relance programmée pour dans ${daysDelay} jours`);
      loadData();
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      alert('Erreur lors de la programmation');
    }
  };

  const filteredReminders = reminders.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const stats = {
    total: reminders.length,
    pending: reminders.filter(r => r.status === 'pending').length,
    sent: reminders.filter(r => r.status === 'sent').length,
    overdueInvoices: overdueInvoices.length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="w-8 h-8 text-orange-600" />
            Relances de Paiement
          </h1>
          <p className="mt-2 text-gray-600">
            Gérez et automatisez les relances pour les factures impayées
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total relances</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Programmées</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Envoyées</p>
                <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Factures en retard</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdueInvoices}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {overdueInvoices.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Factures en retard ({overdueInvoices.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facture</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date limite</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retard</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {overdueInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.client.company_name}</div>
                        <div className="text-sm text-gray-500">{invoice.client.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.total_amount.toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {invoice.days_overdue} jours
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => sendReminder(invoice.id)}
                            disabled={sendingReminder === invoice.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                            {sendingReminder === invoice.id ? 'Envoi...' : 'Envoyer'}
                          </button>
                          <button
                            onClick={() => scheduleAutomaticReminder(invoice.id, 7)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            <Calendar className="w-4 h-4" />
                            Dans 7j
                          </button>
                          <button
                            onClick={() => navigate(`/admin/comptabilite/invoices/${invoice.id}`)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Voir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Historique des relances</h2>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">Toutes</option>
                <option value="pending">Programmées</option>
                <option value="sent">Envoyées</option>
              </select>
            </div>
          </div>

          {filteredReminders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucune relance trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facture</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relance #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Envoyée le</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prochaine</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReminders.map((reminder) => (
                    <tr key={reminder.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {reminder.invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {reminder.invoice.client.company_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Relance #{reminder.reminder_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {reminder.status === 'sent' && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Envoyée
                          </span>
                        )}
                        {reminder.status === 'pending' && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Programmée
                          </span>
                        )}
                        {reminder.status === 'failed' && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Échec
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reminder.sent_at ? new Date(reminder.sent_at).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reminder.next_reminder_date
                          ? new Date(reminder.next_reminder_date).toLocaleDateString('fr-FR')
                          : '-'
                        }
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
