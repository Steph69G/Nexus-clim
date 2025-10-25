import { useState } from "react";
import { CheckCircle } from "lucide-react";
import StarRating from "./StarRating";

interface Question {
  id: string;
  section: string;
  question_text: string;
  question_type: string;
  options: string[];
  is_required: boolean;
  order_index: number;
}

interface DynamicSurveyFormProps {
  questions: Question[];
  onSubmit: (responses: Record<string, any>) => Promise<void>;
  submitting: boolean;
}

export default function DynamicSurveyForm({
  questions,
  onSubmit,
  submitting,
}: DynamicSurveyFormProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});

  const groupedQuestions = questions.reduce((acc, q) => {
    if (!acc[q.section]) acc[q.section] = [];
    acc[q.section].push(q);
    return acc;
  }, {} as Record<string, Question[]>);

  const handleChange = (questionId: string, value: any) => {
    setResponses({ ...responses, [questionId]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredQuestions = questions.filter((q) => q.is_required);
    const missingRequired = requiredQuestions.filter(
      (q) => !responses[q.id] || responses[q.id] === 0
    );

    if (missingRequired.length > 0) {
      alert("Veuillez répondre à toutes les questions obligatoires");
      return;
    }

    await onSubmit(responses);
  };

  const renderQuestion = (question: Question) => {
    switch (question.question_type) {
      case "rating_stars":
        return (
          <div>
            <label className="block text-base font-medium text-slate-800 mb-3">
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <StarRating
              value={responses[question.id] || 0}
              onChange={(val) => handleChange(question.id, val)}
              size="lg"
            />
          </div>
        );

      case "rating_nps":
        return (
          <div>
            <label className="block text-base font-medium text-slate-800 mb-3">
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex gap-2 flex-wrap">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleChange(question.id, num)}
                  className={`w-12 h-12 rounded-lg border-2 font-bold transition-all ${
                    responses[question.id] === num
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-700 border-slate-300 hover:border-blue-400"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        );

      case "text_short":
        return (
          <div>
            <label className="block text-base font-medium text-slate-800 mb-3">
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={responses[question.id] || ""}
              onChange={(e) => handleChange(question.id, e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Votre réponse..."
            />
          </div>
        );

      case "text_long":
        return (
          <div>
            <label className="block text-base font-medium text-slate-800 mb-3">
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={responses[question.id] || ""}
              onChange={(e) => handleChange(question.id, e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Vos commentaires..."
            />
          </div>
        );

      case "yes_no":
        return (
          <div>
            <label className="block text-base font-medium text-slate-800 mb-3">
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleChange(question.id, "yes")}
                className={`flex-1 px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                  responses[question.id] === "yes"
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-slate-700 border-slate-300 hover:border-green-400"
                }`}
              >
                Oui
              </button>
              <button
                type="button"
                onClick={() => handleChange(question.id, "no")}
                className={`flex-1 px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                  responses[question.id] === "no"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-slate-700 border-slate-300 hover:border-red-400"
                }`}
              >
                Non
              </button>
            </div>
          </div>
        );

      case "choice_single":
        return (
          <div>
            <label className="block text-base font-medium text-slate-800 mb-3">
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {question.options.map((option, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-3 p-3 border-2 border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={responses[question.id] === option}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    className="w-5 h-5"
                  />
                  <span className="text-slate-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case "choice_multiple":
        return (
          <div>
            <label className="block text-base font-medium text-slate-800 mb-3">
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {question.options.map((option, idx) => {
                const selectedOptions = responses[question.id] || [];
                return (
                  <label
                    key={idx}
                    className="flex items-center gap-3 p-3 border-2 border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      value={option}
                      checked={selectedOptions.includes(option)}
                      onChange={(e) => {
                        const current = responses[question.id] || [];
                        const newValue = e.target.checked
                          ? [...current, option]
                          : current.filter((o: string) => o !== option);
                        handleChange(question.id, newValue);
                      }}
                      className="w-5 h-5"
                    />
                    <span className="text-slate-700">{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {Object.entries(groupedQuestions).map(([section, sectionQuestions]) => (
        <div key={section} className="bg-white rounded-2xl border-2 border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-4">
            {section}
          </h2>
          <div className="space-y-6">
            {sectionQuestions.map((question) => (
              <div key={question.id}>{renderQuestion(question)}</div>
            ))}
          </div>
        </div>
      ))}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
      >
        {submitting ? (
          <>
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>
            <CheckCircle className="w-6 h-6" />
            Envoyer mes réponses
          </>
        )}
      </button>
    </form>
  );
}
