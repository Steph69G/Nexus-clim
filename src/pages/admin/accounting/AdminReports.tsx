import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Filter, TrendingUp, Euro, FileSpreadsheet, Mail } from 'lucide-react';
import { BackButton } from '@/components/navigation/BackButton';
import { supabase } from '@/supabase';

type ReportType = 'invoices' | 'quotes' | 'payments' | 'revenue' | 'clients' | 'taxes';

type Report = {
  id: string;
  type: ReportType;
  name: string;
  description: string;
  icon: any;
  color: string;
};

export default function AdminReports() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [exporting, setExporting] = useState<ReportType | null>(null);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    totalPaid: 0,
    totalUnpaid: 0,
  });

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  const loadStats = async () => {
    try {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, payment_status')
        .gte('issue_date', dateRange.start)
        .lte('issue_date', dateRange.end);

      if (invoices) {
        const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
        const totalPaid = invoices
          .filter(inv => inv.payment_status === 'paid')
          .reduce((sum, inv) => sum + inv.total_amount, 0);
        const totalUnpaid = invoices
          .filter(inv => inv.payment_status === 'unpaid')
          .reduce((sum, inv) => sum + inv.total_amount, 0);

        setStats({
          totalInvoices: invoices.length,
          totalRevenue,
          totalPaid,
          totalUnpaid,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const reports: Report[] = [
    {
      id: 'invoices',
      type: 'invoices',
      name: 'Factures',
      description: 'Export de toutes les factures avec détails clients',
      icon: FileText,
      color: 'blue',
    },
    {
      id: 'quotes',
      type: 'quotes',
      name: 'Devis',
      description: 'Liste complète des devis émis',
      icon: FileSpreadsheet,
      color: 'green',
    },
    {
      id: 'payments',
      type: 'payments',
      name: 'Paiements',
      description: 'Historique détaillé des encaissements',
      icon: Euro,
      color: 'emerald',
    },
    {
      id: 'revenue',
      type: 'revenue',
      name: 'Chiffre d\'affaires',
      description: 'Analyse mensuelle du CA et marges',
      icon: TrendingUp,
      color: 'purple',
    },
    {
      id: 'clients',
      type: 'clients',
      name: 'Clients',
      description: 'Base clients avec historique facturation',
      icon: Mail,
      color: 'orange',
    },
    {
      id: 'taxes',
      type: 'taxes',
      name: 'TVA',
      description: 'Déclaration de TVA collectée et déductible',
      icon: FileText,
      color: 'red',
    },
  ];

  const exportReport = async (reportType: ReportType) => {
    setExporting(reportType);

    try {
      let data: any[] = [];
      let filename = '';

      switch (reportType) {
        case 'invoices':
          const { data: invoices } = await supabase
            .from('invoices')
            .select(`
              *,
              client:user_clients(company_name, email, phone),
              mission:missions(title, scheduled_date)
            `)
            .gte('issue_date', dateRange.start)
            .lte('issue_date', dateRange.end)
            .order('issue_date', { ascending: false });

          data = (invoices || []).map(inv => ({
            'Numéro': inv.invoice_number,
            'Date': new Date(inv.issue_date).toLocaleDateString('fr-FR'),
            'Client': inv.client?.company_name || '-',
            'Email': inv.client?.email || '-',
            'Mission': inv.mission?.title || '-',
            'Montant HT': inv.subtotal?.toFixed(2) || '0.00',
            'TVA': inv.tax_amount?.toFixed(2) || '0.00',
            'Total TTC': inv.total_amount.toFixed(2),
            'Statut': inv.payment_status === 'paid' ? 'Payée' : 'Impayée',
            'Date limite': new Date(inv.due_date).toLocaleDateString('fr-FR'),
          }));
          filename = `factures_${dateRange.start}_${dateRange.end}.csv`;
          break;

        case 'quotes':
          const { data: quotes } = await supabase
            .from('quotes')
            .select(`
              *,
              client:user_clients(company_name, email)
            `)
            .gte('issue_date', dateRange.start)
            .lte('issue_date', dateRange.end)
            .order('issue_date', { ascending: false });

          data = (quotes || []).map(q => ({
            'Numéro': q.quote_number,
            'Date': new Date(q.issue_date).toLocaleDateString('fr-FR'),
            'Client': q.client?.company_name || '-',
            'Email': q.client?.email || '-',
            'Montant HT': q.subtotal?.toFixed(2) || '0.00',
            'TVA': q.tax_amount?.toFixed(2) || '0.00',
            'Total TTC': q.total_amount.toFixed(2),
            'Statut': q.status === 'accepted' ? 'Accepté' : q.status === 'rejected' ? 'Refusé' : 'En attente',
            'Validité': new Date(q.valid_until).toLocaleDateString('fr-FR'),
          }));
          filename = `devis_${dateRange.start}_${dateRange.end}.csv`;
          break;

        case 'payments':
          const { data: payments } = await supabase
            .from('payments')
            .select(`
              *,
              invoice:invoices(invoice_number, client:user_clients(company_name))
            `)
            .gte('payment_date', dateRange.start)
            .lte('payment_date', dateRange.end)
            .order('payment_date', { ascending: false });

          data = (payments || []).map(p => ({
            'Date': new Date(p.payment_date).toLocaleDateString('fr-FR'),
            'Facture': p.invoice?.invoice_number || '-',
            'Client': p.invoice?.client?.company_name || '-',
            'Montant': p.amount.toFixed(2),
            'Méthode': p.payment_method === 'card' ? 'Carte' : p.payment_method === 'bank_transfer' ? 'Virement' : p.payment_method === 'check' ? 'Chèque' : 'Espèces',
            'Référence': p.transaction_reference || '-',
          }));
          filename = `paiements_${dateRange.start}_${dateRange.end}.csv`;
          break;

        case 'revenue':
          const { data: revenueData } = await supabase
            .from('invoices')
            .select('issue_date, total_amount, payment_status, subtotal, tax_amount')
            .gte('issue_date', dateRange.start)
            .lte('issue_date', dateRange.end)
            .order('issue_date', { ascending: true });

          const monthlyRevenue = (revenueData || []).reduce((acc: any, inv) => {
            const month = new Date(inv.issue_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
            if (!acc[month]) {
              acc[month] = { month, totalHT: 0, totalTVA: 0, totalTTC: 0, paid: 0, unpaid: 0 };
            }
            acc[month].totalHT += inv.subtotal || 0;
            acc[month].totalTVA += inv.tax_amount || 0;
            acc[month].totalTTC += inv.total_amount;
            if (inv.payment_status === 'paid') {
              acc[month].paid += inv.total_amount;
            } else {
              acc[month].unpaid += inv.total_amount;
            }
            return acc;
          }, {});

          data = Object.values(monthlyRevenue).map((m: any) => ({
            'Mois': m.month,
            'CA HT': m.totalHT.toFixed(2),
            'TVA': m.totalTVA.toFixed(2),
            'CA TTC': m.totalTTC.toFixed(2),
            'Encaissé': m.paid.toFixed(2),
            'En attente': m.unpaid.toFixed(2),
          }));
          filename = `chiffre_affaires_${dateRange.start}_${dateRange.end}.csv`;
          break;

        case 'clients':
          const { data: clients } = await supabase
            .from('user_clients')
            .select(`
              *,
              invoices(total_amount, payment_status)
            `);

          data = (clients || []).map(client => {
            const totalInvoiced = client.invoices?.reduce((sum: number, inv: any) => sum + inv.total_amount, 0) || 0;
            const totalPaid = client.invoices?.filter((inv: any) => inv.payment_status === 'paid').reduce((sum: number, inv: any) => sum + inv.total_amount, 0) || 0;
            const totalUnpaid = client.invoices?.filter((inv: any) => inv.payment_status === 'unpaid').reduce((sum: number, inv: any) => sum + inv.total_amount, 0) || 0;

            return {
              'Entreprise': client.company_name,
              'Email': client.email,
              'Téléphone': client.phone || '-',
              'Adresse': client.billing_address || '-',
              'Nb factures': client.invoices?.length || 0,
              'Total facturé': totalInvoiced.toFixed(2),
              'Total payé': totalPaid.toFixed(2),
              'En attente': totalUnpaid.toFixed(2),
            };
          });
          filename = `clients_${dateRange.start}_${dateRange.end}.csv`;
          break;

        case 'taxes':
          const { data: taxData } = await supabase
            .from('invoices')
            .select('issue_date, invoice_number, subtotal, tax_amount, total_amount, payment_status')
            .gte('issue_date', dateRange.start)
            .lte('issue_date', dateRange.end)
            .order('issue_date', { ascending: true });

          data = (taxData || []).map(inv => ({
            'Date': new Date(inv.issue_date).toLocaleDateString('fr-FR'),
            'Facture': inv.invoice_number,
            'Base HT': inv.subtotal?.toFixed(2) || '0.00',
            'TVA collectée': inv.tax_amount?.toFixed(2) || '0.00',
            'Total TTC': inv.total_amount.toFixed(2),
            'Statut': inv.payment_status === 'paid' ? 'Encaissé' : 'Non encaissé',
          }));
          filename = `tva_${dateRange.start}_${dateRange.end}.csv`;
          break;
      }

      if (data.length === 0) {
        alert('Aucune donnée à exporter pour cette période');
        return;
      }

      const csv = convertToCSV(data);
      downloadCSV(csv, filename);
      alert(`Export réussi : ${data.length} lignes`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Erreur lors de l\'export');
    } finally {
      setExporting(null);
    }
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton to="/admin/comptabilite" label="Retour à la Comptabilité" />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Rapports Comptables
          </h1>
          <p className="mt-2 text-gray-600">
            Exportez vos données comptables au format CSV pour Excel ou votre logiciel de comptabilité
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Calendar className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Période d'export</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Factures émises</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">CA total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue.toFixed(0)} €</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Encaissé</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalPaid.toFixed(0)} €</p>
              </div>
              <Euro className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-orange-600">{stats.totalUnpaid.toFixed(0)} €</p>
              </div>
              <Euro className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => {
            const Icon = report.icon;
            const isExporting = exporting === report.type;

            return (
              <div key={report.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 bg-${report.color}-100 rounded-lg`}>
                      <Icon className={`w-6 h-6 text-${report.color}-600`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">
                    {report.description}
                  </p>
                  <button
                    onClick={() => exportReport(report.type)}
                    disabled={isExporting}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 bg-${report.color}-600 text-white rounded-lg hover:bg-${report.color}-700 transition-colors disabled:opacity-50`}
                  >
                    <Download className="w-4 h-4" />
                    {isExporting ? 'Export en cours...' : 'Exporter CSV'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
