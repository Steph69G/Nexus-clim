import { useState, useEffect } from "react";
import { FileText, Search, DollarSign, AlertCircle, CheckCircle, Clock, XCircle, Eye, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/dateUtils";

interface Invoice {
  id: string;
  invoice_number: string;
  mission_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  client_city: string;
  client_zip: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
  }>;
  subtotal_cents: number;
  tax_rate: number;
  tax_cents: number;
  total_cents: number;
  payment_status: string;
  payment_method: string | null;
  paid_amount_cents: number;
  paid_at: string | null;
  due_date: string;
  pdf_url: string | null;
  sent_at: string | null;
  notes: string | null;
  created_at: string;
}

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error("Error loading invoices:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updatePaymentStatus(invoiceId: string, newStatus: string) {
    try {
      const updateData: any = { payment_status: newStatus };

      if (newStatus === "payé") {
        updateData.paid_at = new Date().toISOString();
        updateData.paid_amount_cents = invoices.find(i => i.id === invoiceId)?.total_cents || 0;
      }

      const { error } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", invoiceId);

      if (error) throw error;
      loadInvoices();
    } catch (err) {
      console.error("Error updating payment status:", err);
    }
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesFilter = filter === "all" || invoice.payment_status === filter;
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: invoices.length,
    pending: invoices.filter((i) => i.payment_status === "en_attente").length,
    paid: invoices.filter((i) => i.payment_status === "payé").length,
    overdue: invoices.filter((i) => i.payment_status === "en_retard").length,
    totalAmount: invoices.reduce((sum, i) => sum + i.total_cents, 0) / 100,
    paidAmount: invoices.filter((i) => i.payment_status === "payé").reduce((sum, i) => sum + i.total_cents, 0) / 100,
  };

  const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
    en_attente: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
    payé: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
    en_retard: { bg: "bg-red-100", text: "text-red-700", icon: AlertCircle },
    partiel: { bg: "bg-blue-100", text: "text-blue-700", icon: Clock },
    annulé: { bg: "bg-gray-100", text: "text-gray-700", icon: XCircle },
  };

  const statusLabels: Record<string, string> = {
    en_attente: "En attente",
    payé: "Payé",
    en_retard: "En retard",
    partiel: "Paiement partiel",
    annulé: "Annulé",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement des factures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Gestion des Factures
          </h1>
          <p className="text-slate-600">Suivez vos factures et paiements</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<FileText className="w-6 h-6" />}
            label="Total factures"
            value={stats.total.toString()}
            color="blue"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            label="En attente"
            value={stats.pending.toString()}
            color="yellow"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            label="Payées"
            value={stats.paid.toString()}
            color="green"
          />
          <StatCard
            icon={<AlertCircle className="w-6 h-6" />}
            label="En retard"
            value={stats.overdue.toString()}
            color="red"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Montant total facturé</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalAmount.toFixed(2)} €</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Montant encaissé</p>
              <p className="text-3xl font-bold text-green-600">{stats.paidAmount.toFixed(2)} €</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par numéro ou client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="payé">Payé</option>
              <option value="en_retard">En retard</option>
              <option value="partiel">Paiement partiel</option>
              <option value="annulé">Annulé</option>
            </select>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">Aucune facture trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Numéro</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Client</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Échéance</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Montant</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Statut</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const StatusIcon = statusColors[invoice.payment_status]?.icon || Clock;
                    return (
                      <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900">{invoice.invoice_number}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-slate-900">{invoice.client_name}</p>
                            <p className="text-sm text-slate-500">{invoice.client_city}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{formatDate(invoice.created_at)}</td>
                        <td className="py-3 px-4 text-slate-600">{formatDate(invoice.due_date)}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900">
                            {(invoice.total_cents / 100).toFixed(2)} €
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                              statusColors[invoice.payment_status]?.bg
                            } ${statusColors[invoice.payment_status]?.text}`}
                          >
                            <StatusIcon className="w-4 h-4" />
                            {statusLabels[invoice.payment_status]}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedInvoice(invoice)}
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                              title="Voir détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {invoice.payment_status === "en_attente" && (
                              <button
                                onClick={() => updatePaymentStatus(invoice.id, "payé")}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                              >
                                Marquer payé
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onUpdate={() => {
            loadInvoices();
            setSelectedInvoice(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-slate-600 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function InvoiceDetailModal({ invoice, onClose, onUpdate }: any) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    en_attente: { bg: "bg-yellow-100", text: "text-yellow-700" },
    payé: { bg: "bg-green-100", text: "text-green-700" },
    en_retard: { bg: "bg-red-100", text: "text-red-700" },
    partiel: { bg: "bg-blue-100", text: "text-blue-700" },
    annulé: { bg: "bg-gray-100", text: "text-gray-700" },
  };

  const statusLabels: Record<string, string> = {
    en_attente: "En attente",
    payé: "Payé",
    en_retard: "En retard",
    partiel: "Paiement partiel",
    annulé: "Annulé",
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{invoice.invoice_number}</h2>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                statusColors[invoice.payment_status]?.bg
              } ${statusColors[invoice.payment_status]?.text}`}
            >
              {statusLabels[invoice.payment_status]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Informations client</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-slate-500">Nom :</span> {invoice.client_name}</p>
                <p><span className="text-slate-500">Email :</span> {invoice.client_email}</p>
                <p><span className="text-slate-500">Téléphone :</span> {invoice.client_phone}</p>
                <p><span className="text-slate-500">Adresse :</span> {invoice.client_address}</p>
                <p><span className="text-slate-500">Ville :</span> {invoice.client_zip} {invoice.client_city}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Informations facture</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-slate-500">Date d'émission :</span> {formatDate(invoice.created_at)}</p>
                <p><span className="text-slate-500">Date d'échéance :</span> {formatDate(invoice.due_date)}</p>
                {invoice.paid_at && (
                  <p><span className="text-slate-500">Date de paiement :</span> {formatDate(invoice.paid_at)}</p>
                )}
                {invoice.payment_method && (
                  <p><span className="text-slate-500">Méthode :</span> {invoice.payment_method}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Détail des prestations</h3>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-2 px-4 text-sm font-semibold text-slate-700">Description</th>
                  <th className="text-center py-2 px-4 text-sm font-semibold text-slate-700">Qté</th>
                  <th className="text-right py-2 px-4 text-sm font-semibold text-slate-700">Prix unit.</th>
                  <th className="text-right py-2 px-4 text-sm font-semibold text-slate-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: any, index: number) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="py-3 px-4">{item.description}</td>
                    <td className="py-3 px-4 text-center">{item.quantity}</td>
                    <td className="py-3 px-4 text-right">{(item.unit_price_cents / 100).toFixed(2)} €</td>
                    <td className="py-3 px-4 text-right font-medium">{(item.total_cents / 100).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan={3} className="py-2 px-4 text-right font-medium">Sous-total HT</td>
                  <td className="py-2 px-4 text-right font-medium">{(invoice.subtotal_cents / 100).toFixed(2)} €</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 px-4 text-right font-medium">TVA ({invoice.tax_rate}%)</td>
                  <td className="py-2 px-4 text-right font-medium">{(invoice.tax_cents / 100).toFixed(2)} €</td>
                </tr>
                <tr className="bg-slate-100">
                  <td colSpan={3} className="py-3 px-4 text-right font-bold text-lg">Total TTC</td>
                  <td className="py-3 px-4 text-right font-bold text-lg text-blue-600">
                    {(invoice.total_cents / 100).toFixed(2)} €
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {invoice.notes && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Notes</h3>
              <p className="text-sm text-slate-600">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
