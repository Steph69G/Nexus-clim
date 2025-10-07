import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import MissionEditModal from "./MissionEditModal";
import LoadingSpinner from "@/components/LoadingSpinner";

type Mission = {
  id: string;
  title: string | null;
  type: string | null;
  status: string | null;
  client_name: string | null;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  scheduled_start: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function MissionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("ID de mission manquant");
      setLoading(false);
      return;
    }

    async function loadMission() {
      try {
        const { data, error } = await supabase
          .from("missions")
          .select("id, title, type, status, client_name, city, address, lat, lng, scheduled_start, created_at, updated_at")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setError("Mission introuvable");
          setLoading(false);
          return;
        }

        setMission(data as Mission);
      } catch (e: any) {
        setError(e?.message ?? "Erreur lors du chargement de la mission");
      } finally {
        setLoading(false);
      }
    }

    loadMission();
  }, [id]);

  function handleClose() {
    navigate(-1);
  }

  function handleSaved(updated: Mission) {
    setMission(updated);
    navigate(-1);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Erreur</h2>
            <p className="text-slate-600 mb-6">{error || "Mission introuvable"}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors"
            >
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MissionEditModal
      open={true}
      mission={mission}
      onClose={handleClose}
      onSaved={handleSaved}
    />
  );
}
