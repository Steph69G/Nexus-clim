import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Package, Plus, Search, Filter, AlertTriangle, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type StockItem = {
  id: string;
  name: string;
  reference: string | null;
  quantity: number;
  min_stock: number;
  unit: string;
  location: string | null;
  last_restocked: string | null;
  updated_at: string;
};

export default function AdminStockPage() {
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const actionParam = searchParams.get('action');

  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEntryModal, setShowEntryModal] = useState(actionParam === 'entry');

  useEffect(() => {
    loadStockItems();
  }, [filterParam]);

  async function loadStockItems() {
    try {
      setLoading(true);
      let query = supabase
        .from('stock_items')
        .select('*')
        .order('name');

      const { data, error } = await query;

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading stock items:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.reference?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    if (filterParam === 'low') {
      return matchesSearch && item.quantity < item.min_stock;
    }

    return matchesSearch;
  });

  const lowStockCount = items.filter(item => item.quantity < item.min_stock).length;
  const criticalStockCount = items.filter(item => item.quantity === 0).length;

  const getStockStatus = (item: StockItem) => {
    if (item.quantity === 0) return { label: 'Rupture', color: 'bg-red-100 text-red-700' };
    if (item.quantity < item.min_stock * 0.5) return { label: 'Critique', color: 'bg-orange-100 text-orange-700' };
    if (item.quantity < item.min_stock) return { label: 'Bas', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'OK', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Stock & Pièces</h1>
            <p className="text-slate-600 mt-1">
              Gérez votre inventaire et suivez les niveaux de stock
              {filterParam === 'low' && (
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
                  Stock bas uniquement
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowEntryModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Entrée stock
          </button>
        </header>

        {(lowStockCount > 0 || criticalStockCount > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criticalStockCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">
                    {criticalStockCount} article{criticalStockCount > 1 ? 's' : ''} en rupture
                  </p>
                  <p className="text-sm text-red-700">Commande urgente nécessaire</p>
                </div>
              </div>
            )}
            {lowStockCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <TrendingDown className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900">
                    {lowStockCount} article{lowStockCount > 1 ? 's' : ''} sous le seuil
                  </p>
                  <p className="text-sm text-yellow-700">Réapprovisionnement recommandé</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un article..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Link
              to="/admin/logistique/stock?filter=low"
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                filterParam === 'low'
                  ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                  : 'border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-5 h-5" />
              Stock bas
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Chargement...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg font-medium">Aucun article</p>
              <p className="text-slate-500 text-sm">
                {filterParam === 'low'
                  ? 'Aucun article en stock bas'
                  : 'Ajoutez vos premiers articles au stock'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Article
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Référence
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                      Quantité
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                      Min
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Emplacement
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
                  {filteredItems.map((item) => {
                    const status = getStockStatus(item);
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {item.reference || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-900 text-right font-semibold">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 text-right">
                          {item.min_stock} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {item.location || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Gérer →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showEntryModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Entrée stock</h3>
              <p className="text-slate-600 mb-4">
                Formulaire d'entrée de stock à implémenter.
              </p>
              <button
                onClick={() => setShowEntryModal(false)}
                className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Astuce :</strong> Les mouvements de stock sont automatiquement enregistrés
            lors des interventions. Configurez les seuils minimaux pour recevoir des alertes.
          </p>
        </div>
      </div>
    </div>
  );
}
