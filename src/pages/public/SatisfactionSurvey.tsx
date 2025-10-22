import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Star, ThumbsUp, CheckCircle, Send, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Survey {
  id: string;
  mission_id: string;
  client_name: string;
  client_email: string;
  status: string;
  survey_token: string;
}

export default function SatisfactionSurvey() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [overallRating, setOverallRating] = useState(0);
  const [technicianRating, setTechnicianRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [positiveFeedback, setPositiveFeedback] = useState("");
  const [negativeFeedback, setNegativeFeedback] = useState("");
  const [suggestions, setSuggestions] = useState("");

  useEffect(() => {
    if (token) {
      loadSurvey();
    } else {
      setError("Token manquant");
      setLoading(false);
    }
  }, [token]);

  async function loadSurvey() {
    try {
      const { data, error } = await supabase
        .from("satisfaction_surveys")
        .select("*")
        .eq("survey_token", token)
        .single();

      if (error) throw error;

      if (data.status === "completed") {
        setSubmitted(true);
      }

      setSurvey(data);
    } catch (err: any) {
      setError("Enquête introuvable ou expirée");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!survey || npsScore === null || overallRating === 0) {
      setError("Veuillez compléter tous les champs obligatoires");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { error } = await supabase
        .from("satisfaction_surveys")
        .update({
          nps_score: npsScore,
          overall_rating: overallRating,
          technician_rating: technicianRating,
          punctuality_rating: punctualityRating,
          quality_rating: qualityRating,
          cleanliness_rating: cleanlinessRating,
          communication_rating: communicationRating,
          would_recommend: wouldRecommend,
          positive_feedback: positiveFeedback,
          negative_feedback: negativeFeedback,
          suggestions: suggestions,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("survey_token", token);

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      setError("Erreur lors de l'envoi. Veuillez réessayer.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Erreur</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Merci pour votre retour !</h2>
          <p className="text-slate-600 mb-6">
            Votre avis est précieux et nous aide à améliorer nos services.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-slate-900 mb-2">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= value ? "fill-yellow-400 text-yellow-400" : "text-slate-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Enquête de Satisfaction
            </h1>
            <p className="text-slate-600">
              Bonjour {survey?.client_name}, votre avis compte pour nous !
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-blue-50 rounded-xl p-6">
              <label className="block text-sm font-semibold text-slate-900 mb-3">
                Sur une échelle de 0 à 10, recommanderiez-vous Nexus Clim à un proche ? *
              </label>
              <div className="grid grid-cols-11 gap-2">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setNpsScore(i)}
                    className={`aspect-square rounded-lg font-bold transition-all ${
                      npsScore === i
                        ? "bg-blue-600 text-white scale-110"
                        : "bg-white text-slate-700 hover:bg-blue-100"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>Pas du tout probable</span>
                <span>Très probable</span>
              </div>
            </div>

            <StarRating
              value={overallRating}
              onChange={setOverallRating}
              label="Note globale de votre expérience *"
            />

            <div className="grid md:grid-cols-2 gap-6">
              <StarRating
                value={technicianRating}
                onChange={setTechnicianRating}
                label="Professionnalisme du technicien"
              />
              <StarRating
                value={punctualityRating}
                onChange={setPunctualityRating}
                label="Ponctualité"
              />
              <StarRating
                value={qualityRating}
                onChange={setQualityRating}
                label="Qualité du travail"
              />
              <StarRating
                value={cleanlinessRating}
                onChange={setCleanlinessRating}
                label="Propreté du chantier"
              />
              <StarRating
                value={communicationRating}
                onChange={setCommunicationRating}
                label="Communication"
              />
            </div>

            <div className="bg-slate-50 rounded-xl p-6">
              <label className="block text-sm font-semibold text-slate-900 mb-3">
                Recommanderiez-vous notre entreprise ?
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setWouldRecommend(true)}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                    wouldRecommend === true
                      ? "bg-green-600 text-white"
                      : "bg-white text-slate-700 hover:bg-green-50"
                  }`}
                >
                  <ThumbsUp className="w-5 h-5 mx-auto" />
                  Oui
                </button>
                <button
                  type="button"
                  onClick={() => setWouldRecommend(false)}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                    wouldRecommend === false
                      ? "bg-red-600 text-white"
                      : "bg-white text-slate-700 hover:bg-red-50"
                  }`}
                >
                  Non
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Qu'avez-vous particulièrement apprécié ?
              </label>
              <textarea
                value={positiveFeedback}
                onChange={(e) => setPositiveFeedback(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Points positifs..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Que pouvons-nous améliorer ?
              </label>
              <textarea
                value={negativeFeedback}
                onChange={(e) => setNegativeFeedback(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Points à améliorer..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Suggestions
              </label>
              <textarea
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Vos suggestions..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting || npsScore === null || overallRating === 0}
              className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              {submitting ? "Envoi en cours..." : "Envoyer mon avis"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
