import { useState, useEffect } from "react";
import { Package, Plus, Search, Edit, Trash2, AlertTriangle, TrendingDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CreateStockItemModal from "@/components/stock/CreateStockItemModal";

interface StockItem {
  id: string;
  reference: string;
  name: string;
  description: string;
  category_id: string;
  unit_price: number;
  quantity: number;
  min_stock: number;
  unit: string;
  supplier: string;
  location: string;
  is_active: boolean;
  category?: {
    name: string;
    color: string;
  };
}

interface StockCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export default function AdminStock() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [categoriesRes, itemsRes] = await Promise.all([
        supabase.from("stock_categories").select("*").order("sort_order"),
        supabase
          .from("stock_items")
          .select(`
            *,
            category:stock_categories(name, color)
          `)
          .eq("is_active", true)
          .order("name"),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setCategories(categoriesRes.data || []);
      setItems(itemsRes.data || []);
    } catch (err) {
      console.error("Error loading stock:", err);
      alert("Erreur lors du chargement du stock");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(item: StockItem) {
    if (!confirm(`Supprimer "${item.name}" ?`)) return;

    try {
      const { error } = await supabase.from("stock_items").update({ is_active: false }).eq("id", item.id);

      if (error) throw error;

      setItems(items.filter((i) => i.id !== item.id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Erreur lors de la suppression");
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = items.filter((item) => item.quantity <= item.min_stock);
  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              Gestion du Stock
            </h1>
            <p className="text-slate-600 mt-1">{items.length} articles actifs</p>
          </div>
          <button
            onClick={() => {
              setEditingItem(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Ajouter Article
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Articles en stock</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Valeur totale</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalValue.toFixed(2)} €</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Alertes stock bas</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{lowStockItems.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {lowStockItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">Alertes Stock Bas</h3>
                <div className="text-sm text-red-700 space-y-1">
                  {lowStockItems.map((item) => (
                    <div key={item.id}>
                      <strong>{item.name}</strong> - Stock: {item.quantity} {item.unit} (Min: {item.min_stock})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom ou référence..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Toutes catégories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Référence</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Nom</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Catégorie</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">Quantité</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">Prix Unit.</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">Valeur</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Fournisseur</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Aucun article trouvé
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLowStock = item.quantity <= item.min_stock;
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 ${isLowStock ? "bg-red-50" : ""}`}>
                      <td className="px-6 py-4 text-sm font-mono text-slate-600">{item.reference}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-slate-500 line-clamp-1">{item.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.category && (
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium bg-${item.category.color}-100 text-${item.category.color}-700`}>
                            {item.category.name}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-medium ${isLowStock ? "text-red-600" : "text-slate-900"}`}>
                          {item.quantity} {item.unit}
                        </span>
                        {isLowStock && (
                          <div className="text-xs text-red-500">Min: {item.min_stock}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-900">{item.unit_price.toFixed(2)} €</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">
                        {(item.quantity * item.unit_price).toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.supplier || "-"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setShowCreateModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <CreateStockItemModal
          item={editingItem}
          categories={categories}
          onClose={() => {
            setShowCreateModal(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingItem(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
