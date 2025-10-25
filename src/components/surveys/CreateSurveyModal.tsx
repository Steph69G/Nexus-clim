import { useState } from "react";
import { X, Send, Mail, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CreateSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSurveyModal({ isOpen, onClose, onSuccess }: CreateSurveyModalProps) {
  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    missionId: "",
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName || !formData.clientEmail) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);

    try {
      const { data: survey, error: surveyError } = await supabase
        .from("satisfaction_surveys")
        .insert({
          mission_id: formData.missionId || null,
          client_name: formData.clientName,
          client_email: formData.clientEmail,
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
        recipient_email: formData.clientEmail,
        status: "sent",
      });

      if (logError) console.error("Error creating email log:", logError);

      alert(
        `Enquête créée avec succès !\n\nLien à envoyer au client :\n${surveyLink}\n\n(Copiez ce lien et envoyez-le par email au client)`
      );

      setFormData({ clientName: "", clientEmail: "", missionId: "" });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error creating survey:", err);
      alert("Erreur lors de la création de l'enquête");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ clientName: "", clientEmail: "", missionId: "" });
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200" onClick={handleClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Créer une Enquête</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nom du client *
                </div>
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Ex: Jean Dupont"
                required
                disabled={loading}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email du client *
                </div>
              </label>
              <input
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                placeholder="client@example.com"
                required
                disabled={loading}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                ID Mission (optionnel)
              </label>
              <input
                type="text"
                value={formData.missionId}
                onChange={(e) => setFormData({ ...formData, missionId: e.target.value })}
                placeholder="Ex: 12345678-abcd-..."
                disabled={loading}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-slate-100"
              />
              <p className="text-xs text-slate-500 mt-1">
                Laissez vide pour créer une enquête indépendante
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Note :</strong> Un lien unique sera généré. Vous devrez l'envoyer manuellement au client par email.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Créer l'enquête
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
