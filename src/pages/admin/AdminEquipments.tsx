import { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, Search, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { BackButton } from '@/components/navigation/BackButton';
import DataTable from '@/components/DataTable';

interface Equipment {
  id: string;
  contract_id: string;
  equipment_type: string;
  equipment_location: string | null;
  equipment_brand: string | null;
  equipment_model: string | null;
  equipment_serial_number: string | null;
  installation_date: string | null;
  annual_price_ht: number;
  annual_price_ttc: number;
  notes: string | null;
  created_at: string;
  contract?: {
    contract_number: string;
    client_name: string;
  };
}

export default function AdminEquipments() {
  const { user } = useAuth();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  useEffect(() => {
    loadEquipments();
  }, []);

  async function loadEquipments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contract_equipment')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEquipments(data || []);
    } catch (error: any) {
      console.error('Error loading equipments:', error);
      setEquipments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet équipement ?')) return;

    try {
      const { error } = await supabase
        .from('contract_equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadEquipments();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      alert('Erreur lors de la suppression');
    }
  }

  const filteredEquipments = equipments.filter(eq =>
    eq.equipment_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.equipment_brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.equipment_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.equipment_serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.equipment_location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'equipment_type',
      label: 'Type',
      render: (eq: Equipment) => (
        <div className="font-medium text-gray-900">{eq.equipment_type}</div>
      )
    },
    {
      key: 'equipment_brand',
      label: 'Marque / Modèle',
      render: (eq: Equipment) => (
        <div>
          <div className="font-medium text-gray-900">{eq.equipment_brand || '-'}</div>
          <div className="text-sm text-gray-500">{eq.equipment_model || '-'}</div>
        </div>
      )
    },
    {
      key: 'equipment_serial_number',
      label: 'N° Série',
      render: (eq: Equipment) => (
        <span className="font-mono text-sm">{eq.equipment_serial_number || '-'}</span>
      )
    },
    {
      key: 'equipment_location',
      label: 'Localisation',
      render: (eq: Equipment) => (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <MapPin className="w-4 h-4 text-gray-400" />
          {eq.equipment_location || '-'}
        </div>
      )
    },
    {
      key: 'contract',
      label: 'Contrat',
      render: (eq: Equipment) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {eq.contract?.contract_number || '-'}
          </div>
          <div className="text-xs text-gray-500">
            {eq.contract?.client_name || '-'}
          </div>
        </div>
      )
    },
    {
      key: 'installation_date',
      label: 'Installation',
      render: (eq: Equipment) => eq.installation_date ? (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Calendar className="w-4 h-4 text-gray-400" />
          {new Date(eq.installation_date).toLocaleDateString('fr-FR')}
        </div>
      ) : '-'
    },
    {
      key: 'annual_price_ttc',
      label: 'Prix annuel',
      render: (eq: Equipment) => (
        <span className="font-medium text-gray-900">
          {eq.annual_price_ttc.toFixed(2)} €
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (eq: Equipment) => (
        <div className="flex gap-2">
          <button
            onClick={() => setEditingEquipment(eq)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Modifier"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(eq.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <BackButton to="/admin/clients" label="Retour aux Clients & Contrats" />
          <div className="flex items-center gap-3 mt-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Settings className="w-8 h-8 text-green-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Équipements</h1>
              <p className="text-gray-600">Gestion des climatiseurs et installations clients</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un équipement..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Ajouter un équipement
              </button>
            </div>

            <div className="mt-4 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Total:</span>
                <span className="text-gray-900 font-semibold">{filteredEquipments.length} équipements</span>
              </div>
            </div>
          </div>

          <DataTable
            data={filteredEquipments}
            columns={columns}
            keyField="id"
          />
        </div>
      </div>

      {showCreateModal && (
        <CreateEquipmentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadEquipments();
          }}
        />
      )}

      {editingEquipment && (
        <EditEquipmentModal
          equipment={editingEquipment}
          onClose={() => setEditingEquipment(null)}
          onSuccess={() => {
            setEditingEquipment(null);
            loadEquipments();
          }}
        />
      )}
    </div>
  );
}

function CreateEquipmentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    contract_id: '',
    equipment_type: '',
    equipment_location: '',
    equipment_brand: '',
    equipment_model: '',
    equipment_serial_number: '',
    installation_date: '',
    annual_price_ht: '',
    annual_price_ttc: '',
    notes: ''
  });

  useEffect(() => {
    loadContracts();
  }, []);

  async function loadContracts() {
    const { data } = await supabase
      .from('maintenance_contracts')
      .select('id, contract_number, client_name')
      .eq('status', 'active')
      .order('contract_number');

    if (data) setContracts(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      const { error } = await supabase
        .from('contract_equipment')
        .insert([{
          ...formData,
          annual_price_ht: parseFloat(formData.annual_price_ht) || 0,
          annual_price_ttc: parseFloat(formData.annual_price_ttc) || 0,
        }]);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error creating equipment:', error);
      alert('Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Nouvel équipement</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contrat *
            </label>
            <select
              required
              value={formData.contract_id}
              onChange={(e) => setFormData({ ...formData, contract_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Sélectionner un contrat</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.contract_number} - {c.client_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type d'équipement *
              </label>
              <input
                type="text"
                required
                value={formData.equipment_type}
                onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Climatiseur mural, multi-split..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Localisation
              </label>
              <input
                type="text"
                value={formData.equipment_location}
                onChange={(e) => setFormData({ ...formData, equipment_location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Bureau, salon..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marque
              </label>
              <input
                type="text"
                value={formData.equipment_brand}
                onChange={(e) => setFormData({ ...formData, equipment_brand: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Daikin, Mitsubishi..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modèle
              </label>
              <input
                type="text"
                value={formData.equipment_model}
                onChange={(e) => setFormData({ ...formData, equipment_model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de série
              </label>
              <input
                type="text"
                value={formData.equipment_serial_number}
                onChange={(e) => setFormData({ ...formData, equipment_serial_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date d'installation
              </label>
              <input
                type="date"
                value={formData.installation_date}
                onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix annuel HT *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.annual_price_ht}
                onChange={(e) => setFormData({ ...formData, annual_price_ht: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix annuel TTC *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.annual_price_ttc}
                onChange={(e) => setFormData({ ...formData, annual_price_ttc: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditEquipmentModal({ equipment, onClose, onSuccess }: {
  equipment: Equipment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    equipment_type: equipment.equipment_type,
    equipment_location: equipment.equipment_location || '',
    equipment_brand: equipment.equipment_brand || '',
    equipment_model: equipment.equipment_model || '',
    equipment_serial_number: equipment.equipment_serial_number || '',
    installation_date: equipment.installation_date || '',
    annual_price_ht: equipment.annual_price_ht.toString(),
    annual_price_ttc: equipment.annual_price_ttc.toString(),
    notes: equipment.notes || ''
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      const { error } = await supabase
        .from('contract_equipment')
        .update({
          ...formData,
          annual_price_ht: parseFloat(formData.annual_price_ht),
          annual_price_ttc: parseFloat(formData.annual_price_ttc),
        })
        .eq('id', equipment.id);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error updating equipment:', error);
      alert('Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Modifier l'équipement</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type d'équipement *
              </label>
              <input
                type="text"
                required
                value={formData.equipment_type}
                onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Localisation
              </label>
              <input
                type="text"
                value={formData.equipment_location}
                onChange={(e) => setFormData({ ...formData, equipment_location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marque
              </label>
              <input
                type="text"
                value={formData.equipment_brand}
                onChange={(e) => setFormData({ ...formData, equipment_brand: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modèle
              </label>
              <input
                type="text"
                value={formData.equipment_model}
                onChange={(e) => setFormData({ ...formData, equipment_model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de série
              </label>
              <input
                type="text"
                value={formData.equipment_serial_number}
                onChange={(e) => setFormData({ ...formData, equipment_serial_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date d'installation
              </label>
              <input
                type="date"
                value={formData.installation_date}
                onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix annuel HT *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.annual_price_ht}
                onChange={(e) => setFormData({ ...formData, annual_price_ht: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix annuel TTC *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.annual_price_ttc}
                onChange={(e) => setFormData({ ...formData, annual_price_ttc: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
