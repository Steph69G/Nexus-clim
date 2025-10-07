import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/ui/toast/ToastProvider";
import { supabase } from "@/lib/supabase";
import { Calendar, Phone, MapPin, Clock, Euro, Save, X, CheckCircle } from "lucide-react";
import CompleteMissionModal from "@/components/CompleteMissionModal";
import { USE_STATUS_V2 } from "@/config/flags";
import StatusControl from "@/components/missions/StatusControl";
import StatusTimeline from "@/components/missions/StatusTimeline";

type MissionDetail = {
  id: string;
  title: string;
  type: string;
  status: string;
  address: string;
  city: string;
  scheduled_start: string | null;
  estimated_duration_min: number | null;
  client_name: string | null;
  client_phone: string | null;
  description: string | null;
  price_subcontractor_cents: number | null;
  currency: string | null;
  assigned_user_id: string | null;
};

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useProfile();
  const { push } = useToast();
  const navigate = useNavigate();

  const [mission, setMission] = useState<MissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedDate, setEditedDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const isST = profile?.role === "st";
  const isSAL = profile?.role === "sal" || profile?.role === "tech";
  const canEdit = isST;

  useEffect(() => {
    loadMission();
  }, [id]);

  async function loadMission() {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        push({ type: "error", message: "Mission introuvable" });
        navigate("/app/missions/my");
        return;
      }

      setMission(data as MissionDetail);
      if (data.scheduled_start) {
        const date = new Date(data.scheduled_start);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setEditedDate(localDate);
      }
    } catch (e: any) {
      push({ type: "error", message: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function saveAppointment() {
    if (!mission || !editedDate) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("missions")
        .update({
          scheduled_start: new Date(editedDate).toISOString(),
          status: "CONFIRMÉE"
        })
        .eq("id", mission.id);

      if (error) throw error;
      push({ type: "success", message: "Rendez-vous confirmé et mis à jour !" });
      setEditing(false);
      await loadMission();
    } catch (e: any) {
      push({ type: "error", message: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function markCompleted(notes: string) {
    if (!mission) return;
    try {
      const { error } = await supabase
        .from("missions")
        .update({
          status: "TERMINÉE",
          description: mission.description
            ? `${mission.description}\n\n--- Compte-rendu ---\n${notes}`
            : notes
        })
        .eq("id", mission.id);

      if (error) throw error;
      push({ type: "success", message: "Mission clôturée avec succès !" });
      setShowCompleteModal(false);
      await loadMission();
    } catch (e: any) {
      push({ type: "error", message: e.message });
      throw e;
    }
  }

  const formatMoney = (cents: number | null, cur: string | null) => {
    if (cents == null) return "—";
    const eur = (cents / 100).toFixed(2);
    return `${eur} ${cur ?? "EUR"}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "À convenir";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement de la mission...</p>
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Mission introuvable</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-slate-600 hover:text-slate-900 flex items-center gap-2 transition-colors"
        >
          ← Retour
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">{mission.title}</h1>
            <div className="flex items-center gap-4">
              <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">
                {mission.type}
              </span>
              <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">
                {mission.status}
              </span>
            </div>
          </div>

          {USE_STATUS_V2 && (
            <div className="px-8 py-4 bg-slate-50 border-b border-slate-200">
              <StatusControl mission={mission} onChanged={loadMission} />
            </div>
          )}

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="text-orange-600 mt-1" size={20} />
                  <div>
                    <div className="text-sm font-medium text-slate-700">Adresse</div>
                    <div className="text-slate-900">{mission.address}</div>
                    <div className="text-slate-600 text-sm">{mission.city}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="text-blue-600 mt-1" size={20} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700 mb-2">Rendez-vous</div>
                    {editing ? (
                      <div className="space-y-2">
                        <input
                          type="datetime-local"
                          value={editedDate}
                          onChange={(e) => setEditedDate(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveAppointment}
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                          >
                            <Save size={16} />
                            {saving ? "Enregistrement..." : "Enregistrer"}
                          </button>
                          <button
                            onClick={() => setEditing(false)}
                            className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 flex items-center gap-2"
                          >
                            <X size={16} />
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-slate-900 font-semibold">{formatDate(mission.scheduled_start)}</div>
                        {canEdit && (
                          <button
                            onClick={() => setEditing(true)}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                          >
                            Modifier la date
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {mission.client_name && (
                  <div className="flex items-start gap-3">
                    <Phone className="text-emerald-600 mt-1" size={20} />
                    <div>
                      <div className="text-sm font-medium text-slate-700">Contact client</div>
                      <div className="text-slate-900">{mission.client_name}</div>
                      {mission.client_phone && (
                        <a
                          href={`tel:${mission.client_phone}`}
                          className="text-emerald-600 hover:text-emerald-700 font-semibold"
                        >
                          {mission.client_phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="text-blue-600 mt-1" size={20} />
                  <div>
                    <div className="text-sm font-medium text-slate-700">Durée estimée</div>
                    <div className="text-slate-900">
                      {mission.estimated_duration_min ? `${mission.estimated_duration_min} min` : "Non spécifiée"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Euro className="text-emerald-600 mt-1" size={20} />
                  <div>
                    <div className="text-sm font-medium text-slate-700">Rémunération</div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatMoney(mission.price_subcontractor_cents, mission.currency)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {mission.description && (
              <div className="border-t border-slate-200 pt-6">
                <div className="text-sm font-medium text-slate-700 mb-2">Description</div>
                <div className="text-slate-900 whitespace-pre-wrap">{mission.description}</div>
              </div>
            )}

            <div className="border-t border-slate-200 pt-6 flex gap-3">
              {mission.status !== "TERMINÉE" && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
                >
                  <CheckCircle size={20} />
                  Clôturer la mission
                </button>
              )}

              {mission.client_phone && (
                <a
                  href={`tel:${mission.client_phone}`}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
                >
                  <Phone size={20} />
                  Appeler le client
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Historique des statuts</h2>
          <StatusTimeline missionId={mission.id} />
        </div>

        {showCompleteModal && (
          <CompleteMissionModal
            missionTitle={mission.title}
            onConfirm={markCompleted}
            onCancel={() => setShowCompleteModal(false)}
          />
        )}
      </div>
    </div>
  );
}
