import { useState, useEffect } from "react";
import { Send, Mail, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Mission {
  id: string;
  client_name: string;
  client_email: string;
  scheduled_start: string;
  status: string;
  type: string;
}

interface Survey {
  id: string;
  mission_id: string;
  client_name: string;
  client_email: string;
  survey_token: string;
  status: string;
  sent_at: string | null;
}

interface EmailLog {
  id: string;
  survey_id: string;
  email_type: string;
  recipient_email: string;
  sent_at: string;
  status: string;
  error_message: string | null;
}

export default function AdminSurveySender() {
  const [completedMissions, setCompletedMissions] = useState<Mission[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const { data: missionsData, error: missionsError } = await supabase
        .from("missions")
        .select("*")
        .eq("status", "Terminé")
        .order("scheduled_start", { ascending: false })
        .limit(20);

      if (missionsError) throw missionsError;
      setCompletedMissions(missionsData || []);

      const { data: surveysData, error: surveysError } = await supabase
        .from("satisfaction_surveys")
        .select("*")
        .order("created_at", { ascending: false });

      if (surveysError) throw surveysError;
      setSurveys(surveysData || []);

      const { data: logsData, error: logsError } = await supabase
        .from("survey_email_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      setEmailLogs(logsData || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }

  function hasSurvey(missionId: string): boolean {
    return surveys.some((s) => s.mission_id === missionId);
  }

  function getSurvey(missionId: string): Survey | undefined {
    return surveys.find((s) => s.mission_id === missionId);
  }

  async function createAndSendSurvey(mission: Mission) {
    if (!mission.client_email) {
      alert("Email client manquant");
      return;
    }

    setSending(mission.id);

    try {
      const { data: survey, error: surveyError } = await supabase
        .from("satisfaction_surveys")
        .insert({
          mission_id: mission.id,
          client_name: mission.client_name,
          client_email: mission.client_email,
          status: "pending",
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (surveyError) throw surveyError;

      const surveyLink = `${window.location.origin}/survey?token=${survey.survey_token}`;

      const { error: logError } = await supabase.from("survey_email_logs").insert({
        survey_id: survey.id,
        email_type: "initial",
        recipient_email: mission.client_email,
        status: "sent",
      });

      if (logError) throw logError;

      alert(
        `Enquête créée avec succès !\n\nLien à envoyer au client :\n${surveyLink}\n\n(Copiez ce lien pour l'envoyer par email)`
      );

      await loadData();
    } catch (err: any) {
      console.error("Error creating survey:", err);
      alert("Erreur lors de la création de l'enquête");
    } finally {
      setSending(null);
    }
  }

  async function sendReminder(survey: Survey, reminderType: "reminder_1" | "reminder_2") {
    setSending(survey.id);

    try {
      const surveyLink = `${window.location.origin}/survey?token=${survey.survey_token}`;

      const { error } = await supabase.from("survey_email_logs").insert({
        survey_id: survey.id,
        email_type: reminderType,
        recipient_email: survey.client_email,
        status: "sent",
      });

      if (error) throw error;

      alert(
        `Relance programmée !\n\nLien enquête :\n${surveyLink}\n\n(Envoyez un email de relance avec ce lien)`
      );

      await loadData();
    } catch (err: any) {
      console.error("Error sending reminder:", err);
      alert("Erreur lors de l'envoi de la relance");
    } finally {
      setSending(null);
    }
  }

  function getEmailCount(surveyId: string): number {
    return emailLogs.filter((log) => log.survey_id === surveyId).length;
  }

  function getLastEmailType(surveyId: string): string | null {
    const logs = emailLogs
      .filter((log) => log.survey_id === surveyId)
      .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
    return logs[0]?.email_type || null;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Mail className="w-8 h-8 text-blue-600" />
            Envoi Enquêtes de Satisfaction
          </h1>
          <p className="text-slate-600">Gérez l'envoi automatique des enquêtes et relances</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Enquêtes Envoyées</span>
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {surveys.filter((s) => s.sent_at).length}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">En Attente</span>
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {surveys.filter((s) => s.status === "pending").length}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Complétées</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {surveys.filter((s) => s.status === "completed").length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5" />
              Missions Terminées - Envoi Enquête
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Statut Enquête
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {completedMissions.map((mission) => {
                  const survey = getSurvey(mission.id);
                  const emailCount = survey ? getEmailCount(survey.id) : 0;
                  const lastEmailType = survey ? getLastEmailType(survey.id) : null;

                  return (
                    <tr key={mission.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{mission.client_name}</div>
                        <div className="text-sm text-slate-500">{mission.client_email || "Pas d'email"}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(mission.scheduled_start).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{mission.type}</td>
                      <td className="px-6 py-4">
                        {survey ? (
                          <div className="space-y-1">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                survey.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {survey.status === "completed" ? "Complétée" : "En attente"}
                            </span>
                            {emailCount > 0 && (
                              <div className="text-xs text-slate-500">
                                {emailCount} email(s) envoyé(s)
                                {lastEmailType && ` - ${lastEmailType}`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">Pas d'enquête</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {!survey ? (
                          <button
                            onClick={() => createAndSendSurvey(mission)}
                            disabled={sending === mission.id || !mission.client_email}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                          >
                            {sending === mission.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            Créer & Envoyer
                          </button>
                        ) : survey.status === "pending" ? (
                          <div className="flex gap-2">
                            {(!lastEmailType || lastEmailType === "initial") && (
                              <button
                                onClick={() => sendReminder(survey, "reminder_1")}
                                disabled={sending === survey.id}
                                className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium flex items-center gap-2"
                              >
                                {sending === survey.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <AlertCircle className="w-4 h-4" />
                                )}
                                Relance 1
                              </button>
                            )}
                            {lastEmailType === "reminder_1" && (
                              <button
                                onClick={() => sendReminder(survey, "reminder_2")}
                                disabled={sending === survey.id}
                                className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center gap-2"
                              >
                                {sending === survey.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <AlertCircle className="w-4 h-4" />
                                )}
                                Relance 2
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Complétée
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {completedMissions.length === 0 && (
              <div className="text-center py-12 text-slate-500">Aucune mission terminée</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Historique des Emails
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Destinataire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {emailLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-900">{log.recipient_email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.email_type === "initial"
                            ? "bg-blue-100 text-blue-700"
                            : log.email_type === "reminder_1"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {log.email_type === "initial"
                          ? "Envoi initial"
                          : log.email_type === "reminder_1"
                          ? "Relance 1"
                          : "Relance 2"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(log.sent_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`flex items-center gap-1 text-sm font-medium ${
                          log.status === "sent"
                            ? "text-green-600"
                            : log.status === "failed"
                            ? "text-red-600"
                            : "text-slate-600"
                        }`}
                      >
                        {log.status === "sent" && <CheckCircle className="w-4 h-4" />}
                        {log.status === "failed" && <XCircle className="w-4 h-4" />}
                        {log.status === "sent" ? "Envoyé" : log.status === "failed" ? "Échec" : log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {emailLogs.length === 0 && (
              <div className="text-center py-12 text-slate-500">Aucun email envoyé</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
