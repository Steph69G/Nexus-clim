import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BackButton } from '@/components/navigation/BackButton';

type InvoiceItem = {
  description: string;
  quantity: number;
  unit_price_cents: number;
};

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientId, setClientId] = useState('');
  const [clientInfo, setClientInfo] = useState<{ full_name?: string; email?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price_cents: 0 }
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchClients(searchQuery);
    } else {
      setClientSearchResults([]);
      setShowSearchDropdown(false);
    }
  }, [searchQuery]);

  const searchClients = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, role')
        .eq('role', 'client')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setClientSearchResults(data || []);
      setShowSearchDropdown(true);
    } catch (err) {
      console.error('Error searching clients:', err);
      setClientSearchResults([]);
    }
  };

  const selectClient = (client: any) => {
    setClientId(client.user_id);
    setClientInfo({ full_name: client.full_name, email: client.email });
    setSearchQuery('');
    setShowSearchDropdown(false);
    setClientSearchResults([]);
  };

  const fetchClientInfo = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', id)
        .maybeSingle();

      if (error) throw error;
      setClientInfo(data);
    } catch (err) {
      console.error('Error fetching client info:', err);
      setClientInfo(null);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price_cents: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    if (field === 'unit_price_cents') {
      newItems[index][field] = typeof value === 'string' ? Math.round(parseFloat(value) * 100) : value;
    } else {
      newItems[index][field] = value as any;
    }
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price_cents), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!clientId) {
        throw new Error('Veuillez sélectionner un client');
      }

      const totalCents = calculateTotal();

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          client_id: clientId,
          invoice_number: invoiceNumber || null,
          total_cents: totalCents,
          currency: 'EUR',
          due_date: dueDate || null,
          notes: notes || null,
          payment_status: 'draft',
          status: 'active'
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      if (items.length > 0 && items[0].description) {
        const itemsToInsert = items.map(item => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      navigate(`/admin/comptabilite/invoices/${invoice.id}`);
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      setError(err.message || 'Erreur lors de la création de la facture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <BackButton to="/admin/comptabilite/invoices" label="Retour aux Factures" />

        <header>
          <h1 className="text-3xl font-bold text-slate-900">Nouvelle Facture</h1>
          <p className="text-slate-600 mt-1">Créez une facture pour un client</p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            {!clientId ? (
              <div className="space-y-4">
                <div ref={searchRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rechercher un client *
                  </label>
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchQuery.length >= 2 && setShowSearchDropdown(true)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Nom ou email du client..."
                    />
                  </div>
                  {showSearchDropdown && clientSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {clientSearchResults.map((client) => (
                        <button
                          key={client.user_id}
                          type="button"
                          onClick={() => selectClient(client)}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-start gap-3 border-b last:border-b-0"
                        >
                          <User className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {client.full_name || 'Sans nom'}
                            </div>
                            <div className="text-sm text-gray-500">{client.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showSearchDropdown && searchQuery.length >= 2 && clientSearchResults.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-gray-500">
                      Aucun client trouvé
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-blue-50 text-gray-500">OU</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Client (UUID)
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      if (e.target.value.length === 36) {
                        fetchClientInfo(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Client sélectionné
                </label>
                <div className="flex items-center justify-between">
                  <div className="px-3 py-2 bg-white border rounded-lg flex-1">
                    <div className="font-medium text-gray-900">
                      {clientInfo?.full_name || 'Sans nom'}
                    </div>
                    {clientInfo?.email && (
                      <div className="text-sm text-gray-500">{clientInfo.email}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setClientId('');
                      setClientInfo(null);
                    }}
                    className="ml-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Changer
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de facture
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="FACT-2025-001"
              />
              <p className="text-xs text-gray-500 mt-1">Laissez vide pour générer automatiquement</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'échéance
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Lignes de facturation
              </label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Ajouter une ligne
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder="Qté"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(item.unit_price_cents / 100).toFixed(2)}
                      onChange={(e) => updateItem(index, 'unit_price_cents', e.target.value)}
                      placeholder="Prix unitaire"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {((item.quantity * item.unit_price_cents) / 100).toFixed(2)} €
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t flex justify-end">
              <div className="text-right">
                <div className="text-sm text-gray-600">Total</div>
                <div className="text-2xl font-bold text-gray-900">
                  {(calculateTotal() / 100).toFixed(2)} €
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notes ou conditions de paiement..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin/comptabilite/invoices')}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !clientId}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer la facture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
