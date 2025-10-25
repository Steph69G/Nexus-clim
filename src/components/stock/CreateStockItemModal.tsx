import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface StockItem {
  id?: string;
  reference: string;
  name: string;
  description?: string;
  category_id: string;
  unit_price: number;
  quantity: number;
  min_stock: number;
  max_stock?: number;
  unit: string;
  supplier?: string;
  supplier_reference?: string;
  location?: string;
  barcode?: string;
  notes?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  item: StockItem | null;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

const UNITS = [
  { value: "pcs", label: "Pièces" },
  { value: "kg", label: "Kilogrammes" },
  { value: "l", label: "Litres" },
  { value: "m", label: "Mètres" },
  { value: "m2", label: "Mètres carrés" },
  { value: "box", label: "Boîtes" },
  { value: "roll", label: "Rouleaux" },
];

export default function CreateStockItemModal({ item, categories, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState<StockItem>({
    reference: "",
    name: "",
    description: "",
    category_id: categories[0]?.id || "",
    unit_price: 0,
    quantity: 0,
    min_stock: 10,
    max_stock: undefined,
    unit: "pcs",
    supplier: "",
    supplier_reference: "",
    location: "",
    barcode: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        reference: item.reference,
        name: item.name,
        description: item.description || "",
        category_id: item.category_id,
        unit_price: item.unit_price,
        quantity: item.quantity,
        min_stock: item.min_stock,
        max_stock: item.max_stock,
        unit: item.unit,
        supplier: item.supplier || "",
        supplier_reference: item.supplier_reference || "",
        location: item.location || "",
        barcode: item.barcode || "",
        notes: item.notes || "",
      });
    }
  }, [item]);

  function handleChange(field: keyof StockItem, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.reference || !formData.name || !formData.category_id) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSaving(true);

    try {
      const dataToSave = {
        ...formData,
        max_stock: formData.max_stock || null,
        supplier: formData.supplier || null,
        supplier_reference: formData.supplier_reference || null,
        location: formData.location || null,
        barcode: formData.barcode || null,
        notes: formData.notes || null,
        description: formData.description || null,
      };

      if (item?.id) {
        const { error } = await supabase.from("stock_items").update(dataToSave).eq("id", item.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("stock_items").insert(dataToSave);

        if (error) throw error;
      }

      if (typeof onSuccess === "function") {
        try {
          onSuccess();
        } catch (e) {
          console.warn("onSuccess callback threw:", e);
        }
      }
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {item ? "Modifier Article" : "Nouvel Article"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Référence <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => handleChange("reference", e.target.value)}
                placeholder="REF-001"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ex: Filtre à air premium"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Description détaillée..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => handleChange("category_id", e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Unité</label>
              <select
                value={formData.unit}
                onChange={(e) => handleChange("unit", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Prix Unitaire (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_price}
                onChange={(e) => handleChange("unit_price", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quantité Initiale</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) => handleChange("quantity", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Stock Minimum</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.min_stock}
                onChange={(e) => handleChange("min_stock", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Stock Maximum (optionnel)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.max_stock || ""}
                onChange={(e) => handleChange("max_stock", parseFloat(e.target.value) || undefined)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fournisseur</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => handleChange("supplier", e.target.value)}
                placeholder="Nom du fournisseur"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Réf. Fournisseur</label>
              <input
                type="text"
                value={formData.supplier_reference}
                onChange={(e) => handleChange("supplier_reference", e.target.value)}
                placeholder="Référence fournisseur"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Emplacement</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="Ex: Étagère A-12"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Code-barre</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => handleChange("barcode", e.target.value)}
                placeholder="Code-barre ou QR code"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes internes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Notes, remarques..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {item ? "Mettre à jour" : "Créer"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
