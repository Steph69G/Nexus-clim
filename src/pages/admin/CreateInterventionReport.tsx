import { useState, useEffect } from "react";
import SubPageLayout from "@/layouts/SubPageLayout";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

interface Mission {
  id: string;
  title: string;
  client_name: string;
  address: string;
  city: string;
}

interface ReportSection {
  id?: string;
  section_type: string;
  section_title: string;
  section_content: string;
  sort_order: number;
}

const SECTION_TYPES = [
  { value: "summary", label: "Résumé Intervention" },
  { value: "diagnosis", label: "Diagnostic" },
  { value: "work", label: "Travaux Effectués" },
  { value: "parts", label: "Pièces Utilisées" },
  { value: "recommendations", label: "Recommandations" },
  { value: "photos", label: "Photos" },
  { value: "other", label: "Autre" },
];

export default function CreateInterventionReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [mission, setMission] = useState<Mission | null>(null);
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hoursWorked, setHoursWorked] = useState(0);
  const [observations, setObservations] = useState("");

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);

      const [missionRes, hoursRes] = await Promise.all([
        supabase.from("missions").select("*").eq("id", id).single(),
        supabase
          .from("time_entries")
          .select("billable_duration_minutes")
          .eq("mission_id", id)
          .eq("user_id", profile?.user_id)
          .eq("status", "validated"),
      ]);

      if (missionRes.error) throw missionRes.error;
      if (hoursRes.error) throw hoursRes.error;

      setMission(missionRes.data);

      const totalMinutes = hoursRes.data?.reduce(
        (sum, entry) => sum + (entry.billable_duration_minutes || 0),
        0
      );
      setHoursWorked(Math.round((totalMinutes / 60) * 100) / 100);

      setSections([
        { section_type: "summary", section_title: "Résumé Intervention", section_content: "", sort_order: 1 },
        { section_type: "diagnosis", section_title: "Diagnostic", section_content: "", sort_order: 2 },
        { section_type: "work", section_title: "Travaux Effectués", section_content: "", sort_order: 3 },
        { section_type: "recommendations", section_title: "Recommandations", section_content: "", sort_order: 4 },
      ]);
    } catch (err) {
      console.error("Error loading data:", err);
      alert("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }

  function updateSection(index: number, field: keyof ReportSection, value: any) {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
  }

  function addSection() {
    setSections([
      ...sections,
      {
        section_type: "other",
        section_title: "Nouvelle Section",
        section_content: "",
        sort_order: sections.length + 1,
      },
    ]);
  }

  function removeSection(index: number) {
    setSections(sections.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!mission || !profile) return;

    setSaving(true);

    try {
      const { data: reportData, error: reportError } = await supabase.rpc(
        "generate_intervention_report",
        {
          p_mission_id: id,
          p_technician_id: profile.user_id,
        }
      );

      if (reportError) throw reportError;

      const reportId = reportData;

      const { error: updateError } = await supabase
        .from("intervention_reports")
        .update({
          hours_worked: hoursWorked,
          observations: observations,
          work_performed: sections.find((s) => s.section_type === "work")?.section_content,
          recommendations: sections.find((s) => s.section_type === "recommendations")?.section_content,
        })
        .eq("id", reportId);

      if (updateError) throw updateError;

      await supabase.from("report_sections").delete().eq("report_id", reportId);

      const sectionsToInsert = sections.map((section, index) => ({
        report_id: reportId,
        section_type: section.section_type,
        section_title: section.section_title,
        section_content: section.section_content,
        sort_order: index + 1,
      }));

      const { error: sectionsError } = await supabase
        .from("report_sections")
        .insert(sectionsToInsert);

      if (sectionsError) throw sectionsError;

      alert("Rapport créé avec succès !");
      navigate(`/app/missions/${id}`);
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Mission introuvable</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Rapport d'Intervention</h1>
              <p className="text-slate-600">{mission.title}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-slate-900 mb-2">Informations Mission</h3>
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-600">Client:</span>{" "}
                <span className="font-medium">{mission.client_name}</span>
              </div>
              <div>
                <span className="text-slate-600">Adresse:</span>{" "}
                <span className="font-medium">
                  {mission.address}, {mission.city}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Heures travaillées:</span>{" "}
                <span className="font-medium">{hoursWorked}h</span>
              </div>
            </div>
          </div>

          <div className="space-y-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Observations Générales
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Contexte général, état initial, remarques..."
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Sections du Rapport</h3>
              <button
                onClick={addSection}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ajouter Section
              </button>
            </div>

            {sections.map((section, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start gap-4 mb-3">
                  <div className="flex-1 grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Type de Section
                      </label>
                      <select
                        value={section.section_type}
                        onChange={(e) => updateSection(index, "section_type", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {SECTION_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Titre</label>
                      <input
                        type="text"
                        value={section.section_title}
                        onChange={(e) => updateSection(index, "section_title", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeSection(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contenu</label>
                  <textarea
                    value={section.section_content}
                    onChange={(e) => updateSection(index, "section_content", e.target.value)}
                    placeholder="Décrivez en détail..."
                    rows={6}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Créer le Rapport
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
