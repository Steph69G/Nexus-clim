import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/ui/toast/ToastProvider';

type Client = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
};

type QuoteItem = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
};

export default function CreateQuotePage() {
  const navigate = useNavigate();
  const { push } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([
    { description: '', quantity: 1, unit_price: 0, tax_rate: 20 }
  ]);

  useEffect(() => {
    loadClients();
    setDefaultValidUntil();
  }, []);

  async function loadClients() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone')
        .eq('role', 'client')
        .order('full_name');

      if (error) throw error;

      setClients(
        (data || []).map((c) => ({
          id: c.user_id,
          full_name: c.full_name || c.email || 'Sans nom',
          email: c.email || '',
          phone: c.phone || '',
        }))
      );
    } catch (err) {
      console.error('Error loading clients:', err);
      push({ type: 'error', message: 'Erreur lors du chargement des clients' });
    } finally {
      setLoading(false);
    }
  }

  function setDefaultValidUntil() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    setValidUntil(date.toISOString().split('T')[0]);
  }

  function addItem() {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, tax_rate: 20 }]);
  }

  function removeItem(index: number) {
    if (items.length === 1) {
      push({ type: 'error', message: 'Le devis doit contenir au moins un article' });
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof QuoteItem, value: string | number) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  async function handleSave() {
    if (!clientId) {
      push({ type: 'error', message: 'Veuillez sélectionner un client' });
      return;
    }

    const hasEmptyDescription = items.some((item) => !item.description.trim());
    if (hasEmptyDescription) {
      push({ type: 'error', message: 'Tous les articles doivent avoir une description' });
      return;
    }

    try {
      setSaving(true);

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const tax = items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price * (item.tax_rate / 100),
        0
      );
      const total = subtotal + tax;

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          client_id: clientId,
          total_cents: Math.round(total * 100),
          currency: 'EUR',
          status: 'draft',
          valid_until: validUntil || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      const itemsToInsert = items.map((item, index) => ({
        quote_id: quote.id,
        item_type: 'service',
        description: item.description,
        quantity: item.quantity,
        unit_price_cents: Math.round(item.unit_price * 100),
        tax_rate: item.tax_rate,
        sort_order: index,
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(itemsToInsert);

      if (itemsError) throw itemsError;

      push({ type: 'success', message: 'Devis créé avec succès !' });
      navigate('/admin/comptabilite/quotes');
    } catch (err: any) {
      console.error('Error creating quote:', err);
      push({ type: 'error', message: err.message || 'Erreur lors de la création du devis' });
    } finally {
      setSaving(false);
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
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-6">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="bg-white rounded-xl border border-slate-200 shadow-lg">
          <div className="p-8 border-b border-slate-200">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Nouveau Devis</h1>
            <p className="text-slate-600">Créez un devis pour un client</p>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name} ({client.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Valide jusqu'au
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Articles / Services <span className="text-red-500">*</span>
              </label>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-4 items-start p-4 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          placeholder="Qté"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, 'quantity', parseFloat(e.target.value) || 1)
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <input
                          type="number"
                          placeholder="Prix unitaire €"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <input
                          type="number"
                          placeholder="TVA %"
                          min="0"
                          max="100"
                          step="0.1"
                          value={item.tax_rate}
                          onChange={(e) =>
                            updateItem(index, 'tax_rate', parseFloat(e.target.value) || 20)
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addItem}
                className="mt-4 flex items-center gap-2 px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Ajouter un article
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes / Conditions
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Conditions de paiement, mentions spéciales..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="bg-slate-50 rounded-lg p-6 space-y-2">
              <div className="flex justify-between text-slate-700">
                <span>Sous-total HT</span>
                <span className="font-semibold">{subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>TVA</span>
                <span className="font-semibold">{tax.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-slate-300">
                <span>Total TTC</span>
                <span>{total.toFixed(2)} €</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Créer le devis
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
