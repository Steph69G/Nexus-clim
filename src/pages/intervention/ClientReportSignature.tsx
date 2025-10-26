import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CheckCircle, FileText, MessageSquare } from "lucide-react";

interface InterventionReport {
  id: string;
  mission_id: string;
  client_name: string;
  intervention_address: string;
  status: string;
  client_signature_url: string | null;
  client_feedback: string | null;
}

export default function ClientReportSignature() {
  const { id: reportId } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState<InterventionReport | null>(null);
  const [error, setError] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (reportId) {
      loadReport();
    }
  }, [reportId]);

  async function loadReport() {
    try {
      setLoading(true);
      setError("");

      // Utiliser anon client pour accès public
      const anonClient = supabase;

      const { data, error: fetchError } = await anonClient
        .from("intervention_reports")
        .select("id, mission_id, client_name, intervention_address, status, client_signature_url, client_feedback")
        .eq("id", reportId)
        .single();

      if (fetchError) throw fetchError;

      if (data.status === "validé" && data.client_signature_url) {
        setError("Ce rapport a déjà été signé.");
      }

      setReport(data);
      setFeedback(data.client_feedback || "");

    } catch (err: any) {
      console.error("Error loading report:", err);
      setError(err.message || "Impossible de charger le rapport");
    } finally {
      setLoading(false);
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setSignature("");
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const signatureData = canvas.toDataURL();
      setSignature(signatureData);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!signature) {
      alert("Veuillez signer avant de soumettre.");
      return;
    }

    if (!report) return;

    try {
      setSubmitting(true);

      // Utiliser anon client pour mise à jour publique
      const anonClient = supabase;

      const { error: updateError } = await anonClient
        .from("intervention_reports")
        .update({
          client_signature_url: signature,
          client_feedback: feedback,
          client_signature_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id);

      if (updateError) throw updateError;

      setSuccess(true);
    } catch (err: any) {
      console.error("Error submitting signature:", err);
      alert("Erreur lors de l'envoi : " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Merci !</h2>
            <p className="text-gray-600 mb-4">
              Votre signature a bien été enregistrée.
            </p>
            <p className="text-sm text-gray-500">
              Une copie du rapport d'intervention vous a été envoyée par email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Rapport introuvable</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Rapport d'Intervention</h1>
            </div>
            <p className="text-blue-100">Nexus Clim - Signature Client</p>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Client info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Informations</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Client :</span> {report.client_name}
                </p>
                <p>
                  <span className="font-medium">Adresse :</span> {report.intervention_address}
                </p>
              </div>
            </div>

            {/* Feedback */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4" />
                Remarques ou commentaires (optionnel)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                placeholder="Avez-vous des remarques sur l'intervention ?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Signature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Signature *
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Veuillez signer dans le cadre ci-dessous avec votre doigt ou votre souris
              </p>

              {signature ? (
                <div className="space-y-2">
                  <div className="border-2 border-gray-300 rounded-lg p-2 bg-white">
                    <img
                      src={signature}
                      alt="Signature"
                      className="max-w-full h-auto"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSignature("");
                      clearSignature();
                    }}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Modifier la signature
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full border-2 border-gray-300 rounded-lg cursor-crosshair bg-white touch-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveSignature}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Enregistrer signature
                    </button>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Effacer
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit button */}
            <div className="pt-4 border-t">
              <button
                type="submit"
                disabled={submitting || !signature}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Valider et Envoyer
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              En signant, vous attestez avoir pris connaissance du rapport d'intervention et acceptez les travaux réalisés.
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>Nexus Clim - Votre expert en climatisation</p>
          <p className="mt-1">📞 01 23 45 67 89 | 📧 contact@nexusclim.fr</p>
        </div>
      </div>
    </div>
  );
}
