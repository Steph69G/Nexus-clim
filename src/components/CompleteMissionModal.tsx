import { useState } from "react";
import { X, CheckCircle } from "lucide-react";

interface CompleteMissionModalProps {
  missionTitle: string;
  onConfirm: (notes: string) => Promise<void>;
  onCancel: () => void;
}

export default function CompleteMissionModal({
  missionTitle,
  onConfirm,
  onCancel,
}: CompleteMissionModalProps) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onConfirm(notes);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 text-white relative">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Clôturer la mission</h2>
              <p className="text-emerald-100 text-lg mt-1">{missionTitle}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Compte-rendu d'intervention
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Décrivez brièvement les travaux effectués, les observations, etc."
              rows={8}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
            <p className="text-sm text-slate-500 mt-2">
              Ce compte-rendu sera visible par l'administrateur et pourra être partagé avec le client.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg"
            >
              {submitting ? "Enregistrement..." : "Confirmer la clôture"}
            </button>
            <button
              onClick={onCancel}
              disabled={submitting}
              className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
