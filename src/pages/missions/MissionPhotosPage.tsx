import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, PenTool } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import PhotoUploader from "@/components/missions/PhotoUploader";
import PhotoGallery from "@/components/missions/PhotoGallery";
import SignaturePad from "@/components/missions/SignaturePad";

interface Mission {
  id: string;
  title: string;
  client_name: string;
  status: string;
  assigned_to: string | null;
}

export default function MissionPhotosPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showClientSignature, setShowClientSignature] = useState(false);
  const [showTechSignature, setShowTechSignature] = useState(false);

  useEffect(() => {
    if (id) {
      loadMission();
    }
  }, [id]);

  async function loadMission() {
    try {
      setLoading(true);

      const { data, error } = await supabase.from("missions").select("*").eq("id", id).single();

      if (error) throw error;
      setMission(data);
    } catch (err) {
      console.error("Error loading mission:", err);
      alert("Erreur lors du chargement de la mission");
    } finally {
      setLoading(false);
    }
  }

  function handleUploadComplete() {
    setRefreshKey((prev) => prev + 1);
  }

  const canUpload =
    profile?.role === "admin" ||
    profile?.role === "sal" ||
    (profile?.role === "tech" && mission?.assigned_to === profile?.user_id);

  const canDelete = profile?.role === "admin" || profile?.role === "sal";

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

  if (!mission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Mission introuvable</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Camera className="w-8 h-8 text-blue-600" />
            Photos & Signatures
          </h1>
          <div className="text-slate-600">
            <div className="font-medium text-lg">{mission.title}</div>
            <div>Client : {mission.client_name}</div>
            <div>
              Statut :{" "}
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                  mission.status === "Terminé"
                    ? "bg-green-100 text-green-700"
                    : mission.status === "En cours"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {mission.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {canUpload && (
            <div className="lg:col-span-1">
              <PhotoUploader missionId={mission.id} onUploadComplete={handleUploadComplete} />
            </div>
          )}

          <div className={canUpload ? "lg:col-span-2" : "lg:col-span-3"}>
            <PhotoGallery key={refreshKey} missionId={mission.id} canDelete={canDelete} />
          </div>
        </div>

        {canUpload && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <button
                  onClick={() => setShowTechSignature(!showTechSignature)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-lg border-2 border-slate-200 hover:border-blue-500 transition-colors"
                >
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <PenTool className="w-5 h-5" />
                    Signature Technicien
                  </span>
                  <span className="text-sm text-slate-500">
                    {showTechSignature ? "Masquer" : "Afficher"}
                  </span>
                </button>
              </div>
              {showTechSignature && (
                <SignaturePad
                  missionId={mission.id}
                  signatureType="technician"
                  signerName={profile?.full_name || "Technicien"}
                  onSignatureComplete={() => setShowTechSignature(false)}
                />
              )}
            </div>

            <div>
              <div className="mb-4">
                <button
                  onClick={() => setShowClientSignature(!showClientSignature)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-lg border-2 border-slate-200 hover:border-blue-500 transition-colors"
                >
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <PenTool className="w-5 h-5" />
                    Signature Client
                  </span>
                  <span className="text-sm text-slate-500">
                    {showClientSignature ? "Masquer" : "Afficher"}
                  </span>
                </button>
              </div>
              {showClientSignature && (
                <SignaturePad
                  missionId={mission.id}
                  signatureType="client"
                  signerName={mission.client_name}
                  onSignatureComplete={() => setShowClientSignature(false)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
