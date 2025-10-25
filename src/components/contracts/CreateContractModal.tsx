import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, Search, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialClientId?: string;
}

interface Equipment {
  type: string;
  brand: string;
  model: string;
  location: string;
}

export function CreateContractModal({ isOpen, onClose, onSuccess, initialClientId }: CreateContractModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientId, setClientId] = useState("");
  const [clientInfo, setClientInfo] = useState<{ full_name?: string; email?: string } | null>(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [durationYears, setDurationYears] = useState(1);

  useEffect(() => {
    if (initialClientId) {
      setClientId(initialClientId);
      fetchClientInfo(initialClientId);
    }
  }, [initialClientId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchClients(searchQuery);
    } else {
      setClientSearchResults([]);
      setShowSearchDropdown(false);
    }
  }, [searchQuery]);

  const fetchClientInfo = async (id: string) => {
    setLoadingClient(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", id)
        .maybeSingle();

      if (error) throw error;
      setClientInfo(data);
    } catch (err) {
      console.error("Error fetching client info:", err);
      setClientInfo(null);
    } finally {
      setLoadingClient(false);
    }
  };

  const searchClients = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, role")
        .eq("role", "client")
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setClientSearchResults(data || []);
      setShowSearchDropdown(true);
    } catch (err) {
      console.error("Error searching clients:", err);
      setClientSearchResults([]);
    }
  };

  const selectClient = (client: any) => {
    setClientId(client.user_id);
    setClientInfo({ full_name: client.full_name, email: client.email });
    setSearchQuery("");
    setShowSearchDropdown(false);
    setClientSearchResults([]);
  };
  const [startDate, setStartDate] = useState("");
  const [annualPriceHT, setAnnualPriceHT] = useState("");
  const [interventsPerYear, setInterventsPerYear] = useState(2);
  const [notes, setNotes] = useState("");
  const [equipments, setEquipments] = useState<Equipment[]>([
    { type: "", brand: "", model: "", location: "" },
  ]);

  if (!isOpen) return null;

  const addEquipment = () => {
    setEquipments([...equipments, { type: "", brand: "", model: "", location: "" }]);
  };

  const removeEquipment = (index: number) => {
    setEquipments(equipments.filter((_, i) => i !== index));
  };

  const updateEquipment = (index: number, field: keyof Equipment, value: string) => {
    const updated = [...equipments];
    updated[index][field] = value;
    setEquipments(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const priceHT = parseFloat(annualPriceHT);
      if (isNaN(priceHT)) {
        throw new Error("Prix annuel HT invalide");
      }

      const priceTTC = priceHT * 1.2;
      const start = new Date(startDate);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + durationYears);

      const contractNumber = `CONT-${new Date().getFullYear()}-${String(
        Math.floor(Math.random() * 9999) + 1
      ).padStart(4, "0")}`;

      const { data: contract, error: contractError } = await supabase
        .from("maintenance_contracts")
        .insert({
          contract_number: contractNumber,
          client_id: clientId,
          origin_type: "existing_equipment",
          start_date: start.toISOString().split('T')[0],
          end_date: end.toISOString().split('T')[0],
          duration_years: durationYears,
          annual_price_ht: priceHT,
          annual_price_ttc: priceTTC,
          vat_rate: 20.0,
          total_price_ht: priceHT * durationYears,
          total_price_ttc: priceTTC * durationYears,
          payment_mode: "annual_debit",
          payment_status: "pending",
          internal_notes: notes || null,
          status: "draft",
          auto_renewal: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (contractError) throw contractError;

      for (const eq of equipments.filter((e) => e.type && e.brand)) {
        await supabase.from("contract_equipment").insert({
          contract_id: contract.id,
          equipment_type: eq.type,
          equipment_brand: eq.brand,
          equipment_model: eq.model || null,
          equipment_location: eq.location || null,
          annual_price_ht: priceHT / equipments.length,
          annual_price_ttc: priceTTC / equipments.length,
        });
      }

      if (typeof onSuccess === "function") {
        try {
          onSuccess();
        } catch (e) {
          console.warn("onSuccess callback threw:", e);
        }
      }
      onClose();
      resetForm();
    } catch (err: any) {
      console.error("Error creating contract:", err);
      setError(err.message || "Erreur lors de la création du contrat");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setClientId("");
    setClientInfo(null);
    setSearchQuery("");
    setClientSearchResults([]);
    setShowSearchDropdown(false);
    setDurationYears(1);
    setStartDate("");
    setAnnualPriceHT("");
    setInterventsPerYear(2);
    setNotes("");
    setEquipments([{ type: "", brand: "", model: "", location: "" }]);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Nouveau Contrat de Maintenance</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
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
                              {client.full_name || "Sans nom"}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client sélectionné
                  </label>
                  <div className="w-full px-3 py-2 bg-white border rounded-lg text-gray-900 font-medium">
                    {clientInfo?.full_name || "Sans nom"}
                    {clientInfo?.email && (
                      <div className="text-sm text-gray-500 font-normal">{clientInfo.email}</div>
                    )}
                  </div>
                </div>
                {!initialClientId && (
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setClientId("");
                        setClientInfo(null);
                      }}
                      className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Changer de client
                    </button>
                  </div>
                )}
                {loadingClient && (
                  <div className="flex items-center justify-center py-2 text-gray-500 text-sm">
                    Chargement...
                  </div>
                )}
              </div>
            )}
          </div>

          <input type="hidden" name="client_id" value={clientId} required />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée (années) *
              </label>
              <input
                type="number"
                required
                min="1"
                max="10"
                value={durationYears}
                onChange={(e) => setDurationYears(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix annuel HT (€) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={annualPriceHT}
                onChange={(e) => setAnnualPriceHT(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interventions par an *
              </label>
              <input
                type="number"
                required
                min="1"
                max="12"
                value={interventsPerYear}
                onChange={(e) => setInterventsPerYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes / Conditions particulières
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Conditions spéciales, modalités..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Équipements couverts</h3>
              <button
                type="button"
                onClick={addEquipment}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Ajouter un équipement
              </button>
            </div>

            <div className="space-y-3">
              {equipments.map((eq, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 p-3 border rounded-lg">
                  <input
                    type="text"
                    placeholder="Type *"
                    value={eq.type}
                    onChange={(e) => updateEquipment(index, "type", e.target.value)}
                    className="col-span-3 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Marque *"
                    value={eq.brand}
                    onChange={(e) => updateEquipment(index, "brand", e.target.value)}
                    className="col-span-3 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Modèle"
                    value={eq.model}
                    onChange={(e) => updateEquipment(index, "model", e.target.value)}
                    className="col-span-3 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Emplacement"
                    value={eq.location}
                    onChange={(e) => updateEquipment(index, "location", e.target.value)}
                    className="col-span-2 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeEquipment(index)}
                    disabled={equipments.length === 1}
                    className="col-span-1 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Création..." : "Créer le contrat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
