import { useState, useRef, useEffect } from "react";
import { PenTool, Eraser, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SignaturePadProps {
  missionId: string;
  signatureType: "client" | "technician";
  signerName: string;
  onSignatureComplete?: () => void;
}

export default function SignaturePad({
  missionId,
  signatureType,
  signerName,
  onSignatureComplete,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    setIsDrawing(true);
    setIsEmpty(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }

  async function saveSignature() {
    if (isEmpty) {
      alert("Veuillez signer avant de valider");
      return;
    }

    setSaving(true);

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas non disponible");

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Erreur de conversion"));
        }, "image/png");
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const timestamp = Date.now();
      const fileName = `signature-${signatureType}-${timestamp}.png`;
      const storagePath = `${missionId}/signatures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("mission-photos")
        .upload(storagePath, blob, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("mission_signatures").insert({
        mission_id: missionId,
        signature_type: signatureType,
        storage_path: storagePath,
        signed_by_name: signerName,
        signed_at: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      alert("Signature enregistrée avec succès !");
      clearSignature();

      if (onSignatureComplete) onSignatureComplete();
    } catch (err: any) {
      console.error("Save signature error:", err);
      alert("Erreur lors de l'enregistrement : " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <PenTool className="w-5 h-5" />
        Signature {signatureType === "client" ? "Client" : "Technicien"}
      </h3>

      <div className="space-y-4">
        <div className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg">
          <strong>{signerName}</strong> - Signez dans le cadre ci-dessous
        </div>

        <div className="relative border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-48 cursor-crosshair touch-none"
            style={{ touchAction: "none" }}
          />
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-slate-400 text-center">
                <PenTool className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Signez ici</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={clearSignature}
            disabled={isEmpty || saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed font-medium"
          >
            <Eraser className="w-4 h-4" />
            Effacer
          </button>
          <button
            onClick={saveSignature}
            disabled={isEmpty || saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Valider la signature
              </>
            )}
          </button>
        </div>

        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
          <ul className="space-y-1 list-disc list-inside">
            <li>Utilisez votre doigt ou un stylet sur écran tactile</li>
            <li>Utilisez la souris sur ordinateur</li>
            <li>La signature sera datée et horodatée automatiquement</li>
            <li>Une fois validée, la signature ne peut plus être modifiée</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
