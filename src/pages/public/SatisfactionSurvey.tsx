import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Star, MessageSquare, ThumbsUp, CheckCircle, AlertCircle, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import StarRating from "@/components/surveys/StarRating";

interface Survey {
  id: string;
  mission_id: string | null;
  client_name: string;
  client_email: string;
  status: string;
}

export default function SatisfactionSurvey() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>("");

  const [overallRating, setOverallRating] = useState<number>(0);
  const [qualityRating, setQualityRating] = useState<number>(0);
  const [punctualityRating, setPunctualityRating] = useState<number>(0);
  const [cleanlinessRating, setCleanlinessRating] = useState<number>(0);
  const [technicianRating, setTechnicianRating] = useState<number>(0);
  const [communicationRating, setCommunicationRating] = useState<number>(0);
  const [comments, setComments] = useState<string>("");
  const [recommendation, setRecommendation] = useState<"oui" | "peut-etre" | "non" | "">("");

  useEffect(() => {
    async function loadSurvey() {
      if (!token) {
        setError("Token manquant");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("satisfaction_surveys")
          .select("id, mission_id, client_name, client_email, status")
          .eq("survey_token", token)
          .single();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Enquête introuvable");
          setLoading(false);
          return;
        }

        if (data.status === "completed") {
          setSubmitted(true);
        } else if (data.status === "expired") {
          setError("Cette enquête a expiré");
          setLoading(false);
          return;
        }

        setSurvey(data);
      } catch (err) {
        console.error("Error loading survey:", err);
        setError("Enquête introuvable ou expirée");
      } finally {
        setLoading(false);
      }
    }

    loadSurvey();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (overallRating === 0) {
      alert("Veuillez attribuer au moins une note globale");
      return;
    }

    if (!recommendation) {
      alert("Veuillez indiquer si vous recommanderiez Nexus Clim");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("satisfaction_surveys")
        .update({
          overall_rating: overallRating,
          quality_rating: qualityRating || null,
          punctuality_rating: punctualityRating || null,
          cleanliness_rating: cleanlinessRating || null,
          technician_rating: technicianRating || null,
          communication_rating: communicationRating || null,
          would_recommend: recommendation === "oui",
          positive_feedback: comments || null,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("survey_token", token);

      if (updateError) throw updateError;

      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting survey:", err);
      setError("Erreur lors de l'envoi de vos réponses. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement de l'enquête...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Enquête indisponible</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Merci pour votre retour !</h2>
          <p className="text-slate-600 mb-6">
            Votre avis compte énormément pour nous 💙
            <br />
            <br />
            Nous utiliserons vos commentaires pour améliorer continuellement nos services.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Nexus Clim</h1>
            </div>
            <p className="text-blue-100">Merci d'avoir fait confiance à Nexus Clim</p>
          </div>

          <div className="p-8">
            <div className="mb-8 text-center">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Enquête de satisfaction</h2>
              <p className="text-slate-600">Votre avis nous aide à améliorer nos services</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Star className="w-5 h-5 text-blue-600" />
                    Évaluation du service
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <label className="font-medium text-slate-900">Satisfaction globale *</label>
                    <StarRating rating={overallRating} onRatingChange={setOverallRating} />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <label className="font-medium text-slate-700">Qualité de l'intervention</label>
                    <StarRating rating={qualityRating} onRatingChange={setQualityRating} />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <label className="font-medium text-slate-700">Respect des délais</label>
                    <StarRating rating={punctualityRating} onRatingChange={setPunctualityRating} />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <label className="font-medium text-slate-700">Propreté du chantier</label>
                    <StarRating rating={cleanlinessRating} onRatingChange={setCleanlinessRating} />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <label className="font-medium text-slate-700">Professionnalisme du technicien</label>
                    <StarRating rating={technicianRating} onRatingChange={setTechnicianRating} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    Communication
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <label className="font-medium text-slate-700">Clarté des informations</label>
                    <StarRating rating={communicationRating} onRatingChange={setCommunicationRating} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    Vos commentaires
                  </h3>
                </div>

                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Souhaitez-vous ajouter un commentaire ou une suggestion ?"
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-blue-600" />
                    Recommandation
                  </h3>
                </div>

                <p className="font-medium text-slate-900">
                  Recommanderiez-vous Nexus Clim à un proche ou à un collègue ? *
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRecommendation("oui")}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                      recommendation === "oui"
                        ? "bg-green-600 text-white shadow-lg"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Oui
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecommendation("peut-etre")}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                      recommendation === "peut-etre"
                        ? "bg-yellow-600 text-white shadow-lg"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Peut-être
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecommendation("non")}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                      recommendation === "non"
                        ? "bg-red-600 text-white shadow-lg"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Non
                  </button>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={submitting || overallRating === 0 || !recommendation}
                  className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Envoyer mes réponses
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Nexus Clim - Expert en climatisation et chauffage
        </p>
      </div>
    </div>
  );
}
