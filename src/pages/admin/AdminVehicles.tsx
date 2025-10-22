import { useState, useEffect } from 'react';
import { Car, Plus, Wrench, UserCheck, AlertTriangle, TrendingUp, FileText } from 'lucide-react';
import {
  getVehicleFleetOverview,
  getMaintenanceAlerts,
  returnVehicle,
  Vehicle
} from '../../api/vehicles';
import CreateVehicleModal from '../../components/vehicles/CreateVehicleModal';
import ScheduleMaintenanceModal from '../../components/vehicles/ScheduleMaintenanceModal';
import AssignVehicleModal from '../../components/vehicles/AssignVehicleModal';

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'fleet' | 'maintenance' | 'alerts'>('fleet');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vehiclesData, alertsData] = await Promise.all([
        getVehicleFleetOverview(),
        getMaintenanceAlerts()
      ]);
      setVehicles(vehiclesData || []);
      setAlerts(alertsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnVehicle = async (vehicle: any) => {
    const finalMileage = prompt(
      `Kilométrage de retour pour ${vehicle.registration_number}:`,
      vehicle.current_mileage?.toString()
    );

    if (!finalMileage) return;

    try {
      await returnVehicle(vehicle.id, parseInt(finalMileage));
      loadData();
    } catch (error) {
      console.error('Error returning vehicle:', error);
      alert('Erreur lors du retour du véhicule');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      available: 'bg-green-100 text-green-800',
      in_use: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-orange-100 text-orange-800',
      retired: 'bg-gray-100 text-gray-800'
    };

    const labels = {
      available: 'Disponible',
      in_use: 'En utilisation',
      maintenance: 'En maintenance',
      retired: 'Retiré'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getAlertBadge = (alertStatus: string) => {
    if (alertStatus === 'ok') return null;

    const styles = {
      insurance_expired: 'bg-red-100 text-red-800',
      insurance_expiring: 'bg-orange-100 text-orange-800',
      control_expired: 'bg-red-100 text-red-800',
      control_expiring: 'bg-orange-100 text-orange-800'
    };

    const labels = {
      insurance_expired: 'Assurance expirée',
      insurance_expiring: 'Assurance expire bientôt',
      control_expired: 'CT expiré',
      control_expiring: 'CT expire bientôt'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[alertStatus as keyof typeof styles]}`}>
        <AlertTriangle className="w-3 h-3 inline mr-1" />
        {labels[alertStatus as keyof typeof labels]}
      </span>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const styles = {
      overdue: 'bg-red-100 text-red-800',
      urgent: 'bg-orange-100 text-orange-800',
      upcoming: 'bg-yellow-100 text-yellow-800',
      planned: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      overdue: 'En retard',
      urgent: 'Urgent',
      upcoming: 'Bientôt',
      planned: 'Planifié'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[urgency as keyof typeof styles]}`}>
        {labels[urgency as keyof typeof labels]}
      </span>
    );
  };

  const stats = {
    total: vehicles.length,
    available: vehicles.filter(v => v.status === 'available').length,
    in_use: vehicles.filter(v => v.status === 'in_use').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    alerts: alerts.filter(a => a.urgency === 'overdue' || a.urgency === 'urgent').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestion de la Flotte</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nouveau Véhicule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Véhicules</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Car className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Disponibles</p>
              <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
            </div>
            <Car className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Utilisation</p>
              <p className="text-2xl font-bold text-gray-900">{stats.in_use}</p>
            </div>
            <UserCheck className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Maintenance</p>
              <p className="text-2xl font-bold text-gray-900">{stats.maintenance}</p>
            </div>
            <Wrench className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Alertes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.alerts}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'fleet'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Flotte
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'alerts'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Alertes ({stats.alerts})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'fleet' && (
            <div className="space-y-4">
              {vehicles.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Car className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Aucun véhicule dans la flotte</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">
                              {vehicle.registration_number}
                            </h3>
                            {getStatusBadge(vehicle.status)}
                            {getAlertBadge(vehicle.alert_status)}
                          </div>
                          <p className="text-gray-600 mb-2">
                            {vehicle.brand} {vehicle.model} ({vehicle.year})
                          </p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Kilométrage</p>
                              <p className="font-medium">{vehicle.current_mileage?.toLocaleString()} km</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Derniers 30j</p>
                              <p className="font-medium">{vehicle.distance_last_30_days?.toLocaleString()} km</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Coûts 30j</p>
                              <p className="font-medium">{vehicle.costs_last_30_days?.toFixed(2)} €</p>
                            </div>
                            {vehicle.assigned_to_name && (
                              <div>
                                <p className="text-gray-500">Affecté à</p>
                                <p className="font-medium">{vehicle.assigned_to_name}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          {vehicle.status === 'available' && (
                            <button
                              onClick={() => {
                                setSelectedVehicle(vehicle);
                                setShowAssignModal(true);
                              }}
                              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Affecter
                            </button>
                          )}
                          {vehicle.status === 'in_use' && (
                            <button
                              onClick={() => handleReturnVehicle(vehicle)}
                              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Retourner
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedVehicle(vehicle);
                              setShowMaintenanceModal(true);
                            }}
                            className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            Entretien
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Aucune alerte d'entretien</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.maintenance_id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">
                              {alert.registration_number} - {alert.brand} {alert.model}
                            </h3>
                            {getUrgencyBadge(alert.urgency)}
                          </div>
                          <p className="text-gray-600 mb-1">{alert.description}</p>
                          <p className="text-sm text-gray-500">
                            Date prévue : {new Date(alert.maintenance_date).toLocaleDateString()}
                            {alert.days_overdue > 0 && (
                              <span className="text-red-600 ml-2">
                                ({alert.days_overdue} jours de retard)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateVehicleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
        />
      )}

      {showMaintenanceModal && selectedVehicle && (
        <ScheduleMaintenanceModal
          vehicleId={selectedVehicle.id}
          vehicleLabel={`${selectedVehicle.registration_number} - ${selectedVehicle.brand} ${selectedVehicle.model}`}
          onClose={() => {
            setShowMaintenanceModal(false);
            setSelectedVehicle(null);
          }}
          onSuccess={loadData}
        />
      )}

      {showAssignModal && selectedVehicle && (
        <AssignVehicleModal
          vehicleId={selectedVehicle.id}
          vehicleLabel={`${selectedVehicle.registration_number} - ${selectedVehicle.brand} ${selectedVehicle.model}`}
          currentMileage={selectedVehicle.current_mileage || 0}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedVehicle(null);
          }}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
