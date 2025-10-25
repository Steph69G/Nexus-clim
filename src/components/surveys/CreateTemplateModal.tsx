import { useState } from "react";
import { X, Plus, Trash2, ChevronUp, ChevronDown, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Question {
  section: string;
  question_text: string;
  question_type: string;
  options: string[];
  is_required: boolean;
  order_index: number;
}

export default function CreateTemplateModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "custom" as "installation" | "maintenance" | "urgency" | "commercial" | "custom",
  });
  const [questions, setQuestions] = useState<Question[]>([
    {
      section: "Satisfaction Générale",
      question_text: "",
      question_type: "rating_stars",
      options: [],
      is_required: true,
      order_index: 1,
    },
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const questionTypes = [
    { value: "rating_stars", label: "Étoiles (1-5)" },
    { value: "rating_nps", label: "NPS (0-10)" },
    { value: "text_short", label: "Texte court" },
    { value: "text_long", label: "Texte long" },
    { value: "choice_single", label: "Choix unique" },
    { value: "choice_multiple", label: "Choix multiples" },
    { value: "yes_no", label: "Oui/Non" },
  ];

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        section: "Nouvelle Section",
        question_text: "",
        question_type: "rating_stars",
        options: [],
        is_required: true,
        order_index: questions.length + 1,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newQuestions = [...questions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    [newQuestions[index], newQuestions[targetIndex]] = [
      newQuestions[targetIndex],
      newQuestions[index],
    ];

    newQuestions.forEach((q, i) => (q.order_index = i + 1));
    setQuestions(newQuestions);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    (newQuestions[index] as any)[field] = value;
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || questions.length === 0) {
      alert("Veuillez remplir tous les champs et ajouter au moins une question");
      return;
    }

    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;

      const { data: template, error: templateError } = await supabase
        .from("survey_templates")
        .insert({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          is_active: true,
          is_system: false,
          created_by: userId,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      const questionsToInsert = questions.map((q) => ({
        template_id: template.id,
        section: q.section,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        is_required: q.is_required,
        order_index: q.order_index,
      }));

      const { error: questionsError } = await supabase
        .from("survey_questions")
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      onSuccess();
    } catch (err) {
      console.error("Error creating template:", err);
      alert("Erreur lors de la création du template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Créer un Template d'Enquête
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nom du template *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Satisfaction Installation"
                  required
                  disabled={loading}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as any })
                  }
                  disabled={loading}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="custom">Personnalisé</option>
                  <option value="installation">Installation</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="urgency">Urgence</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Description du template..."
                disabled={loading}
                rows={2}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Questions</h3>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={question.section}
                        onChange={(e) =>
                          updateQuestion(index, "section", e.target.value)
                        }
                        placeholder="Section"
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveQuestion(index, "up")}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(index, "down")}
                          disabled={index === questions.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(index)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={question.question_text}
                      onChange={(e) =>
                        updateQuestion(index, "question_text", e.target.value)
                      }
                      placeholder="Texte de la question"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={question.question_type}
                        onChange={(e) =>
                          updateQuestion(index, "question_type", e.target.value)
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {questionTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>

                      <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-sm">
                        <input
                          type="checkbox"
                          checked={question.is_required}
                          onChange={(e) =>
                            updateQuestion(index, "is_required", e.target.checked)
                          }
                          className="rounded"
                        />
                        <span className="text-slate-700">Obligatoire</span>
                      </label>
                    </div>

                    {(question.question_type === "choice_single" ||
                      question.question_type === "choice_multiple") && (
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">
                          Options (une par ligne)
                        </label>
                        <textarea
                          value={question.options.join("\n")}
                          onChange={(e) =>
                            updateQuestion(
                              index,
                              "options",
                              e.target.value.split("\n").filter((o) => o.trim())
                            )
                          }
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </form>

          <div className="flex gap-3 p-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? "Création..." : "Créer le Template"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
