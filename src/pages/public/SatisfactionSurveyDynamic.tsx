import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import DynamicSurveyForm from "@/components/surveys/DynamicSurveyForm";

interface Survey {
  id: string;
  mission_id: string | null;
  client_name: string;
  client_email: string;
  status: string;
  template_id: string;
}

interface Question {
  id: string;
  section: string;
  question_text: string;
  question_type: string;
  options: string[];
  is_required: boolean;
  order_index: number;
}

export default function SatisfactionSurveyDynamic() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function loadSurvey() {
      if (!token) {
        setError("Token manquant");
        setLoading(false);
        return;
      }

      try {
        const { data: surveyData, error: surveyError } = await supabase
          .from("satisfaction_surveys")
          .select("id, mission_id, client_name, client_email, status, template_id")
          .eq("survey_token", token)
          .maybeSingle();

        if (surveyError) throw surveyError;

        if (!surveyData) {
          setError("Enquête introuvable");
          setLoading(false);
          return;
        }

        if (surveyData.status === "completed") {
          setSubmitted(true);
          setLoading(false);
          return;
        }

        if (surveyData.status === "expired") {
          setError("Cette enquête a expiré");
          setLoading(false);
          return;
        }

        setSurvey(surveyData);

        const { data: questionsData, error: questionsError } = await supabase
          .from("survey_questions")
          .select("*")
          .eq("template_id", surveyData.template_id)
          .order("order_index");

        if (questionsError) throw questionsError;

        setQuestions(questionsData || []);
      } catch (err) {
        console.error("Error loading survey:", err);
        setError("Erreur lors du chargement de l'enquête");
      } finally {
        setLoading(false);
      }
    }

    loadSurvey();
  }, [token]);

  const handleSubmit = async (responses: Record<string, any>) => {
    if (!survey) return;

    setSubmitting(true);
    setError("");

    try {
      const responsesToInsert = Object.entries(responses).map(([questionId, value]) => {
        const question = questions.find((q) => q.id === questionId);
        if (!question) return null;

        let responseType = "text";
        let ratingValue = null;
        let textValue = null;
        let choiceValues = null;

        if (question.question_type === "rating_stars" || question.question_type === "rating_nps") {
          responseType = "rating";
          ratingValue = value;
        } else if (
          question.question_type === "text_short" ||
          question.question_type === "text_long"
        ) {
          responseType = "text";
          textValue = value;
        } else if (question.question_type === "yes_no") {
          responseType = "text";
          textValue = value;
        } else if (
          question.question_type === "choice_single" ||
          question.question_type === "choice_multiple"
        ) {
          responseType = "choice";
          choiceValues = Array.isArray(value) ? value : [value];
        }

        return {
          survey_id: survey.id,
          question_id: questionId,
          response_type: responseType,
          rating_value: ratingValue,
          text_value: textValue,
          choice_values: choiceValues,
        };
      }).filter(Boolean);

      const { error: responseError } = await supabase
        .from("survey_responses")
        .insert(responsesToInsert);

      if (responseError) throw responseError;

      const { error: updateError } = await supabase
        .from("satisfaction_surveys")
        .update({
          status: "completed",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", survey.id);

      if (updateError) throw updateError;

      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting survey:", err);
      setError("Erreur lors de l'envoi des réponses. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Oups !</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Merci !</h1>
          <p className="text-slate-600 mb-4">
            Votre avis a bien été enregistré. Nous vous remercions pour le temps accordé.
          </p>
          <p className="text-sm text-slate-500">
            Vos retours nous aident à améliorer continuellement nos services.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Enquête de Satisfaction
              </h1>
              <p className="text-slate-600">Clim Passion</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>Bonjour {survey?.client_name},</strong>
              <br />
              Merci de prendre quelques instants pour partager votre expérience avec nous.
              Votre avis est précieux pour améliorer nos services.
            </p>
          </div>
        </div>

        {questions.length > 0 ? (
          <DynamicSurveyForm
            questions={questions}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        ) : (
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">Aucune question disponible pour cette enquête.</p>
          </div>
        )}
      </div>
    </div>
  );
}
