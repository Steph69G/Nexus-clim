import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, Plus, Trash2, ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Mission {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  address: string;
  city: string;
  zip: string;
}

interface InvoiceItem {
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

interface StockMovement {
  id: string;
  quantity: number;
  unit_cost: number;
  stock_item: {
    name: string;
    reference: string;
  };
}

export default function GenerateInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [laborHours, setLaborHours] = useState(2);
  const [hourlyRate, setHourlyRate] = useState(45);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);

      const [missionRes, movementsRes] = await Promise.all([
        supabase.from("missions").select("*").eq("id", id).single(),
        supabase
          .from("stock_movements")
          .select(
            `
            *,
            stock_item:stock_items(name, reference)
          `
          )
          .eq("mission_id", id)
          .eq("movement_type", "mission"),
      ]);

      if (missionRes.error) throw missionRes.error;
      if (movementsRes.error) throw movementsRes.error;

      setMission(missionRes.data);
      setStockMovements(movementsRes.data || []);

      const initialItems: InvoiceItem[] = [
        {
          item_type: "labor",
          description: `Main d'œuvre - ${missionRes.data.title}`,
          quantity: laborHours,
          unit_price: hourlyRate,
          tax_rate: 20,
        },
      ];

      movementsRes.data?.forEach((mov: any) => {
        initialItems.push({
          item_type: "parts",
          description: `${mov.stock_item.name} (Réf: ${mov.stock_item.reference})`,
          quantity: mov.quantity,
          unit_price: mov.unit_cost,
          tax_rate: 20,
        });
      });

      setItems(initialItems);
    } catch (err) {
      console.error("Error loading data:", err);
      alert("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }

  function addItem() {
    setItems([
      ...items,
      {
        item_type: "other",
        description: "",
        quantity: 1,
        unit_price: 0,
        tax_rate: 20,
      },
    ]);
  }

  function updateItem(index: number, field: keyof InvoiceItem, value: any) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleGenerate() {
    if (!mission) return;

    if (!confirm("Générer la facture ?")) return;

    setGenerating(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: invoiceData, error: invoiceError } = await supabase.rpc(
        "generate_invoice_from_mission_with_stock",
        {
          p_mission_id: id,
          p_include_labor: false,
          p_labor_hours: 0,
          p_hourly_rate: 0,
          p_created_by: user.id,
        }
      );

      if (invoiceError) throw invoiceError;

      const invoiceId = invoiceData;

      await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);

      const itemsToInsert = items.map((item, index) => ({
        invoice_id: invoiceId,
        item_type: item.item_type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        sort_order: index,
      }));

      const { error: itemsError } = await supabase.from("invoice_items").insert(itemsToInsert);

      if (itemsError) throw itemsError;

      alert("Facture générée avec succès !");
      navigate("/admin/invoices");
    } catch (err: any) {
      console.error("Generate error:", err);
      alert("Erreur : " + err.message);
    } finally {
      setGenerating(false);
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const tax = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price * (item.tax_rate / 100),
    0
  );
  const total = subtotal + tax;

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

  if (!mission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Mission introuvable</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Générer Facture</h1>
              <p className="text-slate-600">{mission.title}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-slate-900 mb-2">Informations Client</h3>
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-600">Nom:</span> <span className="font-medium">{mission.client_name}</span>
              </div>
              <div>
                <span className="text-slate-600">Email:</span> <span className="font-medium">{mission.client_email}</span>
              </div>
              <div>
                <span className="text-slate-600">Téléphone:</span> <span className="font-medium">{mission.client_phone}</span>
              </div>
              <div>
                <span className="text-slate-600">Adresse:</span> <span className="font-medium">{mission.address}, {mission.city}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Lignes de Facturation</h3>
              <button
                onClick={addItem}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Description</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Qté</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">PU HT</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">TVA</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Total HT</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <select
                          value={item.item_type}
                          onChange={(e) => updateItem(index, "item_type", e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="labor">Main d'œuvre</option>
                          <option value="parts">Pièces</option>
                          <option value="travel">Déplacement</option>
                          <option value="other">Autre</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          placeholder="Description..."
                          className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-sm text-right border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 text-sm text-right border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-sm">{item.tax_rate}%</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(item.quantity * item.unit_price).toFixed(2)} €
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => removeItem(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Sous-total HT:</span>
                <span className="font-medium">{subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">TVA (20%):</span>
                <span className="font-medium">{tax.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                <span>Total TTC:</span>
                <span className="text-blue-600">{total.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || items.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Générer la Facture
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
