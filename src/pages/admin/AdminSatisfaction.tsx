import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, TrendingUp, Users, MessageSquare, ThumbsUp, AlertTriangle, Send, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Survey {
  id: string;
  mission_id: string;
  client_name: string;
  client_email: string;
  nps_score: number | null;
  overall_rating: number | null;
  technician_rating: number | null;
  punctuality_rating: number | null;
  quality_rating: number | null;
  cleanliness_rating: number | null;
  communication_rating: number | null;
  would_recommend: boolean | null;
  positive_feedback: string | null;
  negative_feedback: string | null;
  suggestions: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
}

interface NPSData {
  nps_score: number;
  promoters_count: number;
  passives_count: number;
  detractors_count: number;
  total_responses: number;
}

interface SatisfactionStats {
  avg_overall_rating: number;
  avg_technician_rating: number;
  avg_punctuality_rating: number;
  avg_quality_rating: number;
  avg_cleanliness_rating: number;
  avg_communication_rating: number;
  would_recommend_percent: number;
  total_surveys: number;
  completed_surveys: number;
  response_rate: number;
}

export default function AdminSatisfaction() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [npsData, setNpsData] = useState<NPSData | null>(null);
  const [stats, setStats] = useState<SatisfactionStats | null>(null);
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    try {
      setLoading(true);

      let query = supabase.from("satisfaction_surveys").select("*").order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data: surveyData, error: surveyError } = await query;
      if (surveyError) throw surveyError;
      setSurveys(surveyData || []);

      const { data: npsResult, error: npsError } = await supabase.rpc("calculate_nps");
      if (npsError) throw npsError;
      setNpsData(npsResult?.[0] || null);

      const { data: statsResult, error: statsError } = await supabase.rpc("get_satisfaction_stats");
      if (statsError) throw statsError;
      setStats(statsResult?.[0] || null);
    } catch (err) {
      console.error("Error loading satisfaction data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function sendSurvey(missionId: string) {
    try {
      const { data: mission } = await supabase
        .from("missions")
        .select("client_name, client_email")
        .eq("id", missionId)
        .single();

      if (!mission) return;

      const { data, error } = await supabase
        .from("satisfaction_surveys")
        .insert({
          mission_id: missionId,
          client_name: mission.client_name,
          client_email: mission.client_email,
          status: "pending",
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      alert(`Enquête créée ! Lien : ${window.location.origin}/survey?token=${data.survey_token}`);
      loadData();
    } catch (err) {
      console.error("Error creating survey:", err);
      alert("Erreur lors de la création de l'enquête");
    }
  }

  const StarDisplay = ({ rating }: { rating: number | null }) => {
    if (!rating) return <span className="text-slate-400">-</span>;
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`}
          />
        ))}
      </div>
    );
  };

  const NPSBadge = ({ score }: { score: number | null }) => {
    if (score === null) return null;
    let color = "bg-red-100 text-red-700";
    if (score >= 9) color = "bg-green-100 text-green-700";
    else if (score >= 7) color = "bg-yellow-100 text-yellow-700";

    return (
      <span className={`px-2 py-1 rounded text-sm font-semibold ${color}`}>
        {score}
      </span>
    );
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-500" />
              Satisfaction Client
            </h1>
            <p className="text-slate-600">Enquêtes de satisfaction et Net Promoter Score</p>
          </div>
          <Link
            to="/admin/surveys"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Mail className="w-5 h-5" />
            Envoyer Enquêtes
          </Link>
        </div>

        {npsData && stats && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm font-medium">NPS Score</span>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {npsData.nps_score.toFixed(0)}
              </div>
              <div className="text-xs text-slate-500">
                {npsData.promoters_count} promoteurs / {npsData.detractors_count} détracteurs
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm font-medium">Note Moyenne</span>
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {stats.avg_overall_rating?.toFixed(1)} / 5
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(stats.avg_overall_rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-slate-300"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm font-medium">Recommandation</span>
                <ThumbsUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {stats.would_recommend_percent?.toFixed(0)}%
              </div>
              <div className="text-xs text-slate-500">des clients recommandent</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm font-medium">Taux de Réponse</span>
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {stats.response_rate?.toFixed(0)}%
              </div>
              <div className="text-xs text-slate-500">
                {stats.completed_surveys} / {stats.total_surveys} enquêtes
              </div>
            </div>
          </div>
        )}

        {stats && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Détail des Notes</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-slate-600 mb-1">Technicien</div>
                <div className="flex items-center gap-2">
                  <StarDisplay rating={Math.round(stats.avg_technician_rating)} />
                  <span className="text-sm font-semibold text-slate-900">
                    {stats.avg_technician_rating?.toFixed(2)}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 mb-1">Ponctualité</div>
                <div className="flex items-center gap-2">
                  <StarDisplay rating={Math.round(stats.avg_punctuality_rating)} />
                  <span className="text-sm font-semibold text-slate-900">
                    {stats.avg_punctuality_rating?.toFixed(2)}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 mb-1">Qualité</div>
                <div className="flex items-center gap-2">
                  <StarDisplay rating={Math.round(stats.avg_quality_rating)} />
                  <span className="text-sm font-semibold text-slate-900">
                    {stats.avg_quality_rating?.toFixed(2)}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 mb-1">Propreté</div>
                <div className="flex items-center gap-2">
                  <StarDisplay rating={Math.round(stats.avg_cleanliness_rating)} />
                  <span className="text-sm font-semibold text-slate-900">
                    {stats.avg_cleanliness_rating?.toFixed(2)}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 mb-1">Communication</div>
                <div className="flex items-center gap-2">
                  <StarDisplay rating={Math.round(stats.avg_communication_rating)} />
                  <span className="text-sm font-semibold text-slate-900">
                    {stats.avg_communication_rating?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Enquêtes</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setFilter("completed")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === "completed"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Complétées
                </button>
                <button
                  onClick={() => setFilter("pending")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === "pending"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  En attente
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">NPS</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Note</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Recommande</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {surveys.map((survey) => (
                  <tr key={survey.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{survey.client_name}</div>
                      <div className="text-sm text-slate-500">{survey.client_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <NPSBadge score={survey.nps_score} />
                    </td>
                    <td className="px-6 py-4">
                      <StarDisplay rating={survey.overall_rating} />
                    </td>
                    <td className="px-6 py-4">
                      {survey.would_recommend === true && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                          Oui
                        </span>
                      )}
                      {survey.would_recommend === false && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                          Non
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          survey.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {survey.status === "completed" ? "Complétée" : "En attente"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {survey.completed_at
                        ? new Date(survey.completed_at).toLocaleDateString("fr-FR")
                        : new Date(survey.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4">
                      {survey.status === "completed" && (survey.positive_feedback || survey.negative_feedback) && (
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {surveys.length === 0 && (
              <div className="text-center py-12 text-slate-500">Aucune enquête trouvée</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
