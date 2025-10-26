import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SubPageLayout from "@/layouts/SubPageLayout";
import DynamicForm from "@/components/intervention/DynamicForm";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import LoadingSpinner from "@/components/LoadingSpinner";
import { FileText, AlertCircle } from "lucide-react";

interface Mission {
  id: string;
  title: string;
  client_name: string;
  address: string;
  city: string;
  status: string;
}

interface InterventionReport {
  id: string;
  mission_id: string;
  procedure_template_id: string;
  steps_completed: any;
  status: string;
}

interface ProcedureTemplate {
  id: string;
  name: string;
  description: string;
  steps: any[];
}

export default function InterventionFormPage() {
  const { id: missionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();

  const [loading, setLoading] = useState(true);
  const [mission, setMission] = useState<Mission | null>(null);
  const [report, setReport] = useState<InterventionReport | null>(null);
  const [template, setTemplate] = useState<ProcedureTemplate | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (missionId && profile) {
      loadData();
    }
  }, [missionId, profile]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      // Charger la mission
      const { data: missionData, error: missionError } = await supabase
        .from("missions")
        .select("id, title, client_name, address, city, status")
        .eq("id", missionId)
        .single();

      if (missionError) throw missionError;
      setMission(missionData);

      // Charger le rapport d'intervention
      const { data: reportData, error: reportError } = await supabase
        .from("intervention_reports")
        .select("*")
        .eq("mission_id", missionId)
        .single();

      if (reportError && reportError.code !== "PGRST116") {
        throw reportError;
      }

      if (!reportData) {
        setError("Aucun rapport d'intervention n'a été créé pour cette mission.");
        setLoading(false);
        return;
      }

      setReport(reportData);

      // Charger le template
      const { data: templateData, error: templateError } = await supabase
        .from("procedure_templates")
        .select("*")
        .eq("id", reportData.procedure_template_id)
        .single();

      if (templateError) throw templateError;
      setTemplate(templateData);

    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.message || "Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(formData: Record<string, any>) {
    if (!report) return;

    try {
      const { error: updateError } = await supabase
        .from("intervention_reports")
        .update({
          steps_completed: formData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id);

      if (updateError) throw updateError;

      console.log("Rapport sauvegardé avec succès");
    } catch (err: any) {
      console.error("Error saving report:", err);
      alert("Erreur lors de la sauvegarde : " + err.message);
    }
  }

  async function handleComplete() {
    if (!report) return;

    const confirmComplete = window.confirm(
      "Êtes-vous sûr de vouloir terminer ce rapport ? Cette action marquera le rapport comme terminé."
    );

    if (!confirmComplete) return;

    try {
      const { error: updateError } = await supabase
        .from("intervention_reports")
        .update({
          status: "terminé",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id);

      if (updateError) throw updateError;

      alert("Rapport terminé avec succès !");
      navigate("/missions/mes-missions");
    } catch (err: any) {
      console.error("Error completing report:", err);
      alert("Erreur lors de la finalisation : " + err.message);
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

  if (error) {
    return (
      <SubPageLayout title="Erreur">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Une erreur est survenue
              </h3>
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => navigate(-1)}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retour
              </button>
            </div>
          </div>
        </div>
      </SubPageLayout>
    );
  }

  if (!mission || !report || !template) {
    return (
      <SubPageLayout title="Non trouvé">
        <div className="text-center py-12">
          <p className="text-gray-600">Données introuvables</p>
        </div>
      </SubPageLayout>
    );
  }

  return (
    <SubPageLayout
      title="Fiche d'intervention"
      icon={<FileText className="w-6 h-6" />}
    >
      <div className="space-y-6">
        {/* Mission info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">{mission.title}</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium">Client :</span> {mission.client_name}
            </p>
            <p>
              <span className="font-medium">Adresse :</span> {mission.address}, {mission.city}
            </p>
            <p>
              <span className="font-medium">Template :</span> {template.name}
            </p>
          </div>
        </div>

        {/* Status badge */}
        {report.status !== "en_cours" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900 font-medium">
              Statut actuel : {report.status}
            </p>
            {report.status === "validé" && (
              <p className="text-sm text-blue-700 mt-1">
                Ce rapport a été validé et ne peut plus être modifié.
              </p>
            )}
          </div>
        )}

        {/* Dynamic form */}
        <DynamicForm
          steps={template.steps}
          onSave={handleSave}
          onComplete={handleComplete}
          initialData={report.steps_completed || {}}
          readOnly={report.status === "validé"}
        />
      </div>
    </SubPageLayout>
  );
}
