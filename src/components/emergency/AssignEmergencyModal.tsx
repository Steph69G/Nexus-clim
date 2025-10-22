import { useState, useEffect } from "react";
import { X, MapPin, Phone, User, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Technician {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  phone: string;
  city: string;
  lat: number | null;
  lng: number | null;
  share_location: boolean;
}

interface EmergencyRequest {
  id: string;
  title: string;
  equipment_type: string;
  site_address: string;
  site_city: string;
  urgency_level: string;
}

interface Props {
  request: EmergencyRequest;
  onClose: () => void;
  onAssigned: () => void;
}

export default function AssignEmergencyModal({ request, onClose, onAssigned }: Props) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTechnicians();
  }, []);

  async function loadTechnicians() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, role, phone, city, lat, lng, share_location")
        .in("role", ["tech", "st"])
        .order("full_name");

      if (error) throw error;
      setTechnicians((data || []) as Technician[]);
    } catch (err: any) {
      console.error("Error loading technicians:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign() {
    if (!selectedTechId) return;

    try {
      setAssigning(true);
      setError(null);

      const selectedTech = technicians.find((t) => t.user_id === selectedTechId);
      if (!selectedTech) throw new Error("Technicien introuvable");

      const { error: updateError } = await supabase
        .from("emergency_requests")
        .update({
          status: "assigned",
          assigned_to: selectedTechId,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      await supabase.rpc("create_notification", {
        p_user_id: selectedTechId,
        p_type: "emergency_assigned",
        p_title: "🚨 Dépannage urgent assigné",
        p_message: `Vous avez été assigné à : ${request.title} à ${request.site_city}`,
        p_channels: ["in_app", "email"],
        p_priority: "high",
        p_action_url: `/admin/emergency`,
      });

      onAssigned();
      onClose();
    } catch (err: any) {
      console.error("Error assigning:", err);
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  }

  const urgencyColors: Record<string, string> = {
    critical: "text-red-600",
    urgent: "text-orange-600",
    normal: "text-yellow-600",
    low: "text-gray-600",
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Assigner un technicien</h2>
            <p className="text-sm text-gray-600 mt-1">
              Demande : <span className="font-medium">{request.title}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Équipement</p>
              <p className="font-medium">{request.equipment_type}</p>
            </div>
            <div>
              <p className="text-gray-500">Urgence</p>
              <p className={`font-semibold ${urgencyColors[request.urgency_level]}`}>
                {request.urgency_level === "critical" && "🔴 Critique"}
                {request.urgency_level === "urgent" && "🟠 Urgent"}
                {request.urgency_level === "normal" && "🟡 Normal"}
                {request.urgency_level === "low" && "⚪ Faible"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500">Adresse</p>
              <p className="font-medium">
                {request.site_address}, {request.site_city}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Techniciens disponibles ({technicians.length})
          </h3>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : technicians.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Aucun technicien disponible</p>
            </div>
          ) : (
            <div className="space-y-3">
              {technicians.map((tech) => (
                <button
                  key={tech.user_id}
                  onClick={() => setSelectedTechId(tech.user_id)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    selectedTechId === tech.user_id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{tech.full_name}</h4>
                        {tech.role === "st" && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                            Sous-traitant
                          </span>
                        )}
                        {tech.role === "tech" && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            Technicien
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {tech.email}
                        </p>
                        {tech.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {tech.phone}
                          </p>
                        )}
                        {tech.city && (
                          <p className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {tech.city}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedTechId === tech.user_id && (
                      <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            disabled={assigning}
          >
            Annuler
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedTechId || assigning}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assigning ? "Assignment en cours..." : "Assigner"}
          </button>
        </div>
      </div>
    </div>
  );
}
