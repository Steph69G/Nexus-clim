import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { assignVehicleToUser } from '../../api/vehicles';
import { supabase } from '../../lib/supabase';

interface AssignVehicleModalProps {
  vehicleId: string;
  vehicleLabel: string;
  currentMileage: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignVehicleModal({
  vehicleId,
  vehicleLabel,
  currentMileage,
  onClose,
  onSuccess
}: AssignVehicleModalProps) {
  const [loading, setLoading] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [initialMileage, setInitialMileage] = useState(currentMileage);

  useEffect(() => {
    loadTechnicians();
  }, []);

  const loadTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .in('role', ['tech', 'subcontractor'])
        .order('full_name');

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setLoading(true);
    try {
      await assignVehicleToUser(vehicleId, selectedUserId, initialMileage);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      alert('Erreur lors de l\'affectation du véhicule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Affecter un Véhicule</h2>
            <p className="text-sm text-gray-600 mt-1">{vehicleLabel}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Technicien *
            </label>
            <select
              required
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Sélectionner un technicien</option>
              {technicians.map(tech => (
                <option key={tech.user_id} value={tech.user_id}>
                  {tech.full_name} ({tech.role === 'tech' ? 'Technicien' : 'Sous-traitant'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kilométrage Initial
            </label>
            <input
              type="number"
              value={initialMileage}
              onChange={(e) => setInitialMileage(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Kilométrage actuel : {currentMileage.toLocaleString()} km
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Le véhicule sera marqué comme "En utilisation" et affecté au technicien sélectionné.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !selectedUserId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Affectation...' : 'Affecter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
