import { useState, useEffect } from "react";
import { AlertCircle, Clock, CheckCircle, XCircle, MapPin, Phone, Wrench } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "@/lib/dateUtils";
import AssignEmergencyModal from "@/components/emergency/AssignEmergencyModal";
import { useQuery } from "@/lib/useQuery";
import { normEmergencyStatus, normPriority } from "@/lib/querySchemas";

interface EmergencyRequest {
  id: string;
  client_id: string;
  request_type: string;
  title: string;
  description: string;
  urgency_level: string;
  equipment_type: string;
  equipment_location: string;
  site_address: string;
  site_city: string;
  site_postal_code: string;
  status: string;
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

export default function AdminEmergencyRequests() {
  const { get, set } = useQuery();

  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>(() => {
    const status = normEmergencyStatus(get('status'));
    return status || 'all';
  });
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(() => {
    return normPriority(get('priority'));
  });
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null);

  useEffect(() => {
    set({
      status: filter !== 'all' ? filter : undefined,
      priority: priorityFilter
    });
  }, [filter, priorityFilter]);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("emergency_requests")
        .select(`
          *,
          profiles:client_id (
            email,
            full_name
          )
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests((data || []) as any);
    } catch (err: any) {
      console.error("Error loading requests:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("emergency_requests")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      await loadRequests();
    } catch (err: any) {
      console.error("Error updating status:", err);
    }
  }

  const filteredRequests = requests.filter((req) => {
    const statusMatch = filter === "all" || req.status === filter;
    const priorityMatch = !priorityFilter || req.urgency_level === priorityFilter;
    return statusMatch && priorityMatch;
  });

  const urgencyColors: Record<string, string> = {
    critical: "bg-red-100 text-red-800 border-red-300",
    urgent: "bg-orange-100 text-orange-800 border-orange-300",
    normal: "bg-yellow-100 text-yellow-800 border-yellow-300",
    low: "bg-gray-100 text-gray-800 border-gray-300",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    assigned: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    resolved: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const statusLabels: Record<string, string> = {
    pending: "En attente",
    assigned: "Assignée",
    in_progress: "En cours",
    resolved: "Résolue",
    cancelled: "Annulée",
  };

  const urgencyLabels: Record<string, string> = {
    critical: "Critique",
    urgent: "Urgent",
    normal: "Normal",
    low: "Faible",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Chargement des demandes...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-600" />
            Demandes de Dépannage
          </h1>
          <p className="text-gray-600">Gérez les demandes d'intervention urgentes</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Toutes ({requests.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "pending"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            En attente ({requests.filter((r) => r.status === "pending").length})
          </button>
          <button
            onClick={() => setFilter("assigned")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "assigned"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Assignées ({requests.filter((r) => r.status === "assigned").length})
          </button>
          <button
            onClick={() => setFilter("resolved")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "resolved"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Résolues ({requests.filter((r) => r.status === "resolved").length})
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Total"
            value={requests.length}
            icon={<AlertCircle className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="En attente"
            value={requests.filter((r) => r.status === "pending").length}
            icon={<Clock className="w-5 h-5" />}
            color="yellow"
          />
          <StatCard
            label="Résolues"
            value={requests.filter((r) => r.status === "resolved").length}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            label="Critiques"
            value={requests.filter((r) => r.urgency_level === "critical").length}
            icon={<XCircle className="w-5 h-5" />}
            color="red"
          />
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Aucune demande trouvée</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className={`bg-white rounded-lg border-2 p-6 transition-all ${
                urgencyColors[request.urgency_level] || urgencyColors.normal
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{request.title}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        statusColors[request.status] || statusColors.pending
                      }`}
                    >
                      {statusLabels[request.status] || request.status}
                    </span>
                    <span className="px-2 py-1 bg-white border rounded text-xs font-medium">
                      {urgencyLabels[request.urgency_level]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{request.description}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {formatDistanceToNow(request.created_at)}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-start gap-2">
                  <Wrench className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Équipement</p>
                    <p className="text-sm font-medium">{request.equipment_type}</p>
                    {request.equipment_location && (
                      <p className="text-xs text-gray-600">{request.equipment_location}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Adresse</p>
                    <p className="text-sm font-medium">{request.site_address}</p>
                    <p className="text-xs text-gray-600">
                      {request.site_postal_code} {request.site_city}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Client</p>
                    <p className="text-sm font-medium">
                      {request.profiles?.full_name || request.profiles?.email || "Non renseigné"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="text-sm font-medium">
                      {request.request_type === "breakdown" ? "Panne" : "Maintenance"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {request.status === "pending" && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setAssignModalOpen(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Assigner
                    </button>
                    <button
                      onClick={() => updateStatus(request.id, "cancelled")}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      Annuler
                    </button>
                  </>
                )}
                {request.status === "assigned" && (
                  <button
                    onClick={() => updateStatus(request.id, "in_progress")}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Marquer en cours
                  </button>
                )}
                {request.status === "in_progress" && (
                  <button
                    onClick={() => updateStatus(request.id, "resolved")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Marquer comme résolu
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {assignModalOpen && selectedRequest && (
        <AssignEmergencyModal
          request={selectedRequest}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedRequest(null);
          }}
          onAssigned={() => {
            loadRequests();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    yellow: "bg-yellow-50 text-yellow-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}
