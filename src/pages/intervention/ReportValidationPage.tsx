import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SubPageLayout from "@/layouts/SubPageLayout";
import DynamicForm from "@/components/intervention/DynamicForm";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CheckCircle, XCircle, FileCheck, User, Calendar, MapPin } from "lucide-react";

interface Mission {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  address: string;
  city: string;
  status: string;
}

interface InterventionReport {
  id: string;
  mission_id: string;
  procedure_template_id: string;
  technician_user_id: string;
  steps_completed: any;
  status: string;
  started_at: string;
  completed_at: string;
  observations: string;
  client_signature_url: string;
  technician_signature_url: string;
}

interface ProcedureTemplate {
  id: string;
  name: string;
  description: string;
  steps: any[];
}

interface TechnicianProfile {
  user_id: string;
  full_name: string;
  email: string;
}

export default function ReportValidationPage() {
  const { id: reportId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [mission, setMission] = useState<Mission | null>(null);
  const [report, setReport] = useState<InterventionReport | null>(null);
  const [template, setTemplate] = useState<ProcedureTemplate | null>(null);
  const [technician, setTechnician] = useState<TechnicianProfile | null>(null);
  const [error, setError] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    if (reportId && profile) {
      loadData();
    }
  }, [reportId, profile]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      // Charger le rapport d'intervention
      const { data: reportData, error: reportError } = await supabase
        .from("intervention_reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (reportError) throw reportError;
      setReport(reportData);

      // Charger la mission
      const { data: missionData, error: missionError } = await supabase
        .from("missions")
        .select("*")
        .eq("id", reportData.mission_id)
        .single();

      if (missionError) throw missionError;
      setMission(missionData);

      // Charger le template
      const { data: templateData, error: templateError } = await supabase
        .from("procedure_templates")
        .select("*")
        .eq("id", reportData.procedure_template_id)
        .single();

      if (templateError) throw templateError;
      setTemplate(templateData);

      // Charger le profil du technicien
      const { data: techData, error: techError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("user_id", reportData.technician_user_id)
        .single();

      if (techError) throw techError;
      setTechnician(techData);

    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.message || "Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate() {
    if (!report || !profile) return;

    const confirmValidate = window.confirm(
      "Êtes-vous sûr de vouloir valider ce rapport ? Cette action est irréversible et déclenchera :\n" +
      "- La génération d'une pré-facture\n" +
      "- L'envoi d'une enquête de satisfaction au client (24h plus tard)"
    );

    if (!confirmValidate) return;

    try {
      setValidating(true);

      const { error: updateError } = await supabase
        .from("intervention_reports")
        .update({
          status: "validé",
          validated_by: profile.user_id,
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id);

      if (updateError) throw updateError;

      alert("Rapport validé avec succès !\n\nLa pré-facture et l'enquête de satisfaction seront générées automatiquement.");
      navigate("/admin/interventions");
    } catch (err: any) {
      console.error("Error validating report:", err);
      alert("Erreur lors de la validation : " + err.message);
    } finally {
      setValidating(false);
    }
  }

  async function handleReject() {
    if (!report || !profile) return;
    if (!rejectionReason.trim()) {
      alert("Veuillez indiquer une raison pour le rejet.");
      return;
    }

    try {
      setValidating(true);

      const { error: updateError } = await supabase
        .from("intervention_reports")
        .update({
          status: "en_cours",
          observations: (report.observations || "") + "\n\n[REJET] " + rejectionReason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id);

      if (updateError) throw updateError;

      alert("Rapport rejeté. Le technicien pourra le modifier.");
      navigate("/admin/interventions");
    } catch (err: any) {
      console.error("Error rejecting report:", err);
      alert("Erreur lors du rejet : " + err.message);
    } finally {
      setValidating(false);
      setShowRejectModal(false);
      setRejectionReason("");
    }
  }

  if (loading) {
    return (
      <SubPageLayout title="Chargement...">
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </SubPageLayout>
    );
  }

  if (error || !mission || !report || !template || !technician) {
    return (
      <SubPageLayout title="Erreur">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-700">{error || "Données introuvables"}</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retour
            </button>
          </div>
        </div>
      </SubPageLayout>
    );
  }

  const canValidate = report.status === "terminé" && profile?.role && ["admin", "sal"].includes(profile.role);

  return (
    <SubPageLayout
      title="Validation Rapport d'Intervention"
      icon={<FileCheck className="w-6 h-6" />}
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{mission.title}</h2>
            <p className="text-gray-600">{template.name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-700">Client</p>
                <p className="text-gray-900">{mission.client_name}</p>
                <p className="text-gray-600">{mission.client_email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-700">Technicien</p>
                <p className="text-gray-900">{technician.full_name}</p>
                <p className="text-gray-600">{technician.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-700">Adresse</p>
                <p className="text-gray-900">{mission.address}, {mission.city}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-700">Dates</p>
                <p className="text-gray-900">
                  Début : {new Date(report.started_at).toLocaleDateString("fr-FR")}
                </p>
                {report.completed_at && (
                  <p className="text-gray-900">
                    Fin : {new Date(report.completed_at).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div>
            <span
              className={`inline-block px-3 py-1 text-sm font-semibold rounded ${
                report.status === "validé"
                  ? "bg-green-100 text-green-800"
                  : report.status === "terminé"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              Statut : {report.status}
            </span>
          </div>
        </div>

        {/* Observations */}
        {report.observations && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">Observations</h3>
            <p className="text-yellow-800 whitespace-pre-wrap">{report.observations}</p>
          </div>
        )}

        {/* Signatures */}
        {(report.client_signature_url || report.technician_signature_url) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Signatures</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {report.technician_signature_url && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Technicien</p>
                  <img
                    src={report.technician_signature_url}
                    alt="Signature technicien"
                    className="border border-gray-300 rounded p-2 max-h-32"
                  />
                </div>
              )}
              {report.client_signature_url && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Client</p>
                  <img
                    src={report.client_signature_url}
                    alt="Signature client"
                    className="border border-gray-300 rounded p-2 max-h-32"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form (read-only) */}
        <DynamicForm
          steps={template.steps}
          onSave={() => {}}
          onComplete={() => {}}
          initialData={report.steps_completed || {}}
          readOnly={true}
        />

        {/* Validation actions */}
        {canValidate && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Actions de validation</h3>
            <div className="flex gap-4">
              <button
                onClick={handleValidate}
                disabled={validating}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5" />
                {validating ? "Validation..." : "Valider le rapport"}
              </button>

              <button
                onClick={() => setShowRejectModal(true)}
                disabled={validating}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-5 h-5" />
                Rejeter
              </button>
            </div>

            <p className="text-sm text-gray-600 mt-4">
              La validation déclenchera automatiquement :
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
              <li>Génération d'une pré-facture</li>
              <li>Planification d'une enquête de satisfaction (envoi après 24h)</li>
            </ul>
          </div>
        )}

        {report.status === "validé" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-900 font-medium">
              ✓ Ce rapport a été validé et ne peut plus être modifié.
            </p>
            <p className="text-sm text-green-700 mt-1">
              La pré-facture et l'enquête de satisfaction ont été générées automatiquement.
            </p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Rejeter le rapport</h3>
            <p className="text-sm text-gray-600 mb-4">
              Veuillez indiquer la raison du rejet. Le technicien pourra consulter cette information et modifier son rapport.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Raison du rejet..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={validating || !rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </SubPageLayout>
  );
}
