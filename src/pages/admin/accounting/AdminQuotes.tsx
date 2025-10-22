import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FileText, Plus, Search, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Quote = {
  id: string;
  quote_number: string | null;
  client_id: string | null;
  total_cents: number;
  currency: string;
  status: string;
  valid_until: string | null;
  created_at: string;
};

export default function AdminQuotes() {
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadQuotes();
  }, [statusFilter]);

  async function loadQuotes() {
    try {
      setLoading(true);
      let query = supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredQuotes = quotes.filter(quote =>
    (quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      awaiting_approval: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      converted: 'bg-blue-100 text-blue-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      awaiting_approval: 'En attente',
      approved: 'Approuvé',
      rejected: 'Refusé',
      converted: 'Converti',
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Devis</h1>
            <p className="text-slate-600 mt-1">
              Gérez vos devis et propositions commerciales
              {statusFilter && (
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
                  Filtre: {getStatusLabel(statusFilter)}
                </span>
              )}
            </p>
          </div>
          <Link
            to="/admin/comptabilite?action=new_quote"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouveau devis
          </Link>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par numéro de devis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter className="w-5 h-5" />
              Filtres
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Chargement...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg font-medium">Aucun devis</p>
              <p className="text-slate-500 text-sm">
                {statusFilter
                  ? `Aucun devis avec le statut "${getStatusLabel(statusFilter)}"`
                  : 'Créez votre premier devis'}
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
                      Validité
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
                  {filteredQuotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">
                        {quote.quote_number || 'Brouillon'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {quote.client_id || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900 text-right font-semibold">
                        {(quote.total_cents / 100).toFixed(2)} {quote.currency}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {quote.valid_until
                          ? new Date(quote.valid_until).toLocaleDateString('fr-FR')
                          : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                            quote.status
                          )}`}
                        >
                          {getStatusLabel(quote.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/admin/quotes/${quote.id}`}
                          className="text-green-600 hover:text-green-700 text-sm font-medium"
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

        {statusFilter === 'awaiting_approval' && filteredQuotes.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>{filteredQuotes.length} devis en attente</strong> de validation.
              Approuvez ou refusez ces devis pour débloquer la conversion en mission.
            </p>
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            💡 <strong>Astuce :</strong> Les devis approuvés peuvent être convertis en missions.
            Le système génère automatiquement les documents PDF avec vos mentions légales.
          </p>
        </div>
      </div>
    </div>
  );
}
