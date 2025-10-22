import { useState, useEffect } from "react";
import { X, Plus, Minus, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface StockItem {
  id: string;
  reference: string;
  name: string;
  quantity: number;
  unit_price: number;
  unit: string;
  category?: {
    name: string;
  };
}

interface SelectedItem extends StockItem {
  selectedQuantity: number;
}

interface Props {
  missionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddStockToMissionModal({ missionId, onClose, onSuccess }: Props) {
  const [items, setItems] = useState<StockItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadStockItems();
  }, []);

  async function loadStockItems() {
    try {
      const { data, error } = await supabase
        .from("stock_items")
        .select(`
          *,
          category:stock_categories(name)
        `)
        .eq("is_active", true)
        .gt("quantity", 0)
        .order("name");

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error loading stock:", err);
      alert("Erreur lors du chargement du stock");
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(item: StockItem) {
    const exists = selectedItems.find((i) => i.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => i.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, { ...item, selectedQuantity: 1 }]);
    }
  }

  function updateQuantity(itemId: string, delta: number) {
    setSelectedItems((items) =>
      items.map((item) => {
        if (item.id !== itemId) return item;
        const newQty = Math.max(0.5, Math.min(item.quantity, item.selectedQuantity + delta));
        return { ...item, selectedQuantity: newQty };
      })
    );
  }

  async function handleSave() {
    if (selectedItems.length === 0) {
      alert("Veuillez sélectionner au moins un article");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const movements = selectedItems.map((item) => ({
        item_id: item.id,
        movement_type: "mission",
        quantity: item.selectedQuantity,
        unit_cost: item.unit_price,
        total_cost: item.selectedQuantity * item.unit_price,
        mission_id: missionId,
        user_id: user.id,
        notes: `Consommé sur mission`,
      }));

      const { error } = await supabase.from("stock_movements").insert(movements);

      if (error) throw error;

      alert("Pièces ajoutées à la mission avec succès !");
      onSuccess();
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCost = selectedItems.reduce((sum, item) => sum + item.selectedQuantity * item.unit_price, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              Ajouter des Pièces
            </h2>
            <p className="text-sm text-slate-600 mt-1">Sélectionnez les pièces utilisées sur cette mission</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b border-slate-200">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un article..."
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Chargement...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const selected = selectedItems.find((i) => i.id === item.id);
                return (
                  <div
                    key={item.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => !selected && toggleItem(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="font-medium text-slate-900">{item.name}</div>
                          <div className="text-xs font-mono text-slate-500">{item.reference}</div>
                          {item.category && (
                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                              {item.category.name}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          Stock: {item.quantity} {item.unit} • {item.unit_price.toFixed(2)} € / {item.unit}
                        </div>
                      </div>

                      {selected ? (
                        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, -0.5)}
                              className="p-1 hover:bg-white rounded transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              max={item.quantity}
                              value={selected.selectedQuantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0.5;
                                const newQty = Math.min(item.quantity, Math.max(0.5, val));
                                setSelectedItems((items) =>
                                  items.map((i) =>
                                    i.id === item.id ? { ...i, selectedQuantity: newQty } : i
                                  )
                                );
                              }}
                              className="w-20 px-2 py-1 text-center border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-600">{item.unit}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 0.5)}
                              className="p-1 hover:bg-white rounded transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <div className="font-semibold text-slate-900">
                              {(selected.selectedQuantity * item.unit_price).toFixed(2)} €
                            </div>
                          </div>
                          <button
                            onClick={() => toggleItem(item)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleItem(item)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Ajouter
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-slate-500">Aucun article trouvé</div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-slate-600">{selectedItems.length} article(s) sélectionné(s)</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{totalCost.toFixed(2)} € TTC</div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || selectedItems.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    Valider
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
