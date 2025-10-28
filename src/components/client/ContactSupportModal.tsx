import { useState } from "react";
import { X, MessageCircle, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createConversation, sendMessage } from "@/api/chat";

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId?: string;
}

export default function ContactSupportModal({ isOpen, onClose, missionId }: ContactSupportModalProps) {
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Non authentifié");

      let targetUserId: string | null = null;

      if (missionId) {
        const { data: mission } = await supabase
          .from("missions")
          .select("assigned_to_user_id")
          .eq("id", missionId)
          .maybeSingle();

        if (mission?.assigned_to_user_id) {
          targetUserId = mission.assigned_to_user_id;
        }
      }

      if (!targetUserId) {
        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("role", "ADMIN")
          .limit(1)
          .maybeSingle();

        if (!adminProfile) throw new Error("Aucun administrateur disponible");
        targetUserId = adminProfile.user_id;
      }

      const { data: existingConversations } = await supabase
        .from("conversation_participants")
        .select(`
          conversation_id,
          conversations!inner(
            id,
            type,
            mission_id
          )
        `)
        .eq("user_id", user.id);

      let conversationId: string | null = null;

      if (existingConversations && existingConversations.length > 0) {
        const matchingConv = existingConversations.find((cp: any) => {
          const conv = cp.conversations;
          if (missionId && conv.mission_id === missionId) {
            return true;
          }
          if (!missionId && conv.type === "direct") {
            return true;
          }
          return false;
        });

        if (matchingConv) {
          conversationId = matchingConv.conversation_id;
        }
      }

      if (!conversationId) {
        const title = subject || (missionId ? `Mission ${missionId.slice(0, 8)}` : "Support client");

        const conversation = await createConversation(
          "direct",
          [targetUserId],
          title,
          missionId
        );
        conversationId = conversation.id;
      }

      const fullMessage = subject ? `**${subject}**\n\n${message}` : message;
      await sendMessage(conversationId, fullMessage);

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setMessage("");
        setSubject("");
      }, 2000);

    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Erreur lors de l'envoi du message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Contacter l'équipe</h2>
              <p className="text-sm text-slate-600">
                {missionId ? "Message lié à votre mission" : "Message général"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
              Message envoyé avec succès ! Redirection...
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Sujet (optionnel)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Question sur ma facture"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Décrivez votre demande..."
              rows={6}
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all resize-none"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-slate-700">
              <strong>💡 Routage intelligent :</strong>
              {missionId ? (
                <span className="block mt-1">
                  Votre message sera envoyé au technicien assigné à votre mission, ou à un administrateur si aucun technicien n'est encore assigné.
                </span>
              ) : (
                <span className="block mt-1">
                  Votre message sera envoyé à un administrateur qui vous répondra rapidement.
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
