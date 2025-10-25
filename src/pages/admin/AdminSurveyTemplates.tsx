import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, BarChart3, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BackButton } from "@/components/navigation/BackButton";
import CreateTemplateModal from "@/components/surveys/CreateTemplateModal";
import EditTemplateModal from "@/components/surveys/EditTemplateModal";

interface Template {
  id: string;
  name: string;
  description: string;
  type: string;
  is_system: boolean;
  is_active: boolean;
  question_count: number;
  usage_count: number;
}

export default function AdminSurveyTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data: templatesData, error: templatesError } = await supabase
        .from("survey_templates")
        .select("*")
        .order("type", { ascending: true });

      if (templatesError) throw templatesError;

      const templatesWithStats = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { count: questionCount } = await supabase
            .from("survey_questions")
            .select("*", { count: "exact", head: true })
            .eq("template_id", template.id);

          const { count: usageCount } = await supabase
            .from("satisfaction_surveys")
            .select("*", { count: "exact", head: true })
            .eq("template_id", template.id);

          return {
            ...template,
            question_count: questionCount || 0,
            usage_count: usageCount || 0,
          };
        })
      );

      setTemplates(templatesWithStats);
    } catch (err) {
      console.error("Error loading templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce template ?")) return;

    try {
      const { error } = await supabase
        .from("survey_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      loadTemplates();
    } catch (err) {
      console.error("Error deleting template:", err);
      alert("Erreur lors de la suppression");
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      installation: "Installation",
      maintenance: "Maintenance",
      urgency: "Urgence",
      commercial: "Commercial",
      custom: "Personnalisé",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      installation: "bg-blue-100 text-blue-700",
      maintenance: "bg-green-100 text-green-700",
      urgency: "bg-red-100 text-red-700",
      commercial: "bg-purple-100 text-purple-700",
      custom: "bg-slate-100 text-slate-700",
    };
    return colors[type] || colors.custom;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton to="/admin/surveys" label="Retour aux Enquêtes" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Templates d'Enquêtes</h1>
          <p className="text-slate-600 mt-1">
            Gérez les modèles d'enquêtes de satisfaction
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Créer un Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {template.name}
                  </h3>
                  {template.is_system && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                      Système
                    </span>
                  )}
                </div>
                <span
                  className={`inline-block text-xs px-2 py-1 rounded-lg font-medium ${getTypeColor(
                    template.type
                  )}`}
                >
                  {getTypeLabel(template.type)}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 line-clamp-2">
              {template.description || "Aucune description"}
            </p>

            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>{template.question_count} questions</span>
              </div>
              <div className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                <span>{template.usage_count} envois</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditingTemplate(template)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </button>
              {!template.is_system && (
                <button
                  onClick={() => handleDelete(template.id)}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Aucun template trouvé</p>
          <p className="text-slate-500 text-sm">
            Créez votre premier template d'enquête
          </p>
        </div>
      )}

      {showCreateModal && (
        <CreateTemplateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadTemplates();
          }}
        />
      )}

      {editingTemplate && (
        <EditTemplateModal
          isOpen={!!editingTemplate}
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSuccess={() => {
            setEditingTemplate(null);
            loadTemplates();
          }}
        />
      )}
    </div>
  );
}
