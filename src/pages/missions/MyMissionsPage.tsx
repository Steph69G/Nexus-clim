import { useEffect, useMemo, useState } from "react";
import { fetchMyMissions, subscribeMyMissions, type MyMission } from "@/api/missions.my";
import { useToast } from "@/ui/toast/ToastProvider";
import { useState } from "react";
import { setMissionSchedule } from "@/api/missions.schedule";
import { useToast } from "@/ui/toast/ToastProvider";


function cents(c: number | null, cur: string | null) {
  if (c == null) return "—";
  return `${(c / 100).toFixed(2)} ${cur ?? "EUR"}`;
}

export default function MyMissionsPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<MyMission[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setRows(await fetchMyMissions());
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur chargement missions" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const unsub = subscribeMyMissions(() => load());
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upcoming = useMemo(
    () =>
      rows
        .filter((m) => m.scheduled_start)
        .sort((a, b) => new Date(a.scheduled_start!).getTime() - new Date(b.scheduled_start!).getTime()),
    [rows]
  );
  const others = useMemo(() => rows.filter((m) => !m.scheduled_start), [rows]);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <header className="text-center">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 border border-slate-200 shadow-xl mb-6">
            <span className="text-blue-600 text-xl">🔧</span>
            <span className="text-sm font-medium text-slate-700">Mes interventions</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Mes missions</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Gérez vos interventions assignées et planifiées
          </p>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-lg text-slate-600 font-medium">Chargement des missions...</p>
            </div>
          </div>
        )}
        
        {!loading && rows.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-xl">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-blue-600 text-4xl">🔧</span>
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-3">Aucune mission assignée</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              Aucune mission assignée pour l'instant. Consultez les offres disponibles pour en accepter de nouvelles.
            </p>
          </div>
        )}

        {upcoming.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <span className="text-blue-600 text-xl">🕒</span>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Missions à venir ({upcoming.length})</h2>
                <p className="text-slate-600">Interventions programmées</p>
              </div>
            </div>
            <div className="space-y-6">
              {upcoming.map((m) => (
                <Card key={m.id} m={m} />
              ))}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                <span className="text-amber-600 text-xl">📋</span>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Sans créneau planifié ({others.length})</h2>
                <p className="text-slate-600">Missions en attente de planification</p>
              </div>
            </div>
            <div className="space-y-6">
              {others.map((m) => (
                <Card key={m.id} m={m} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Card({ m }: { m: MyMission }) {
  const mapsUrl = m.lat && m.lng
    ? `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`
    : m.address 
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${m.address} ${m.city ?? ""}`)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.city ?? "")}`;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <span className="text-blue-600 text-xl">🎯</span>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-semibold text-slate-900">{m.title ?? "Mission"}</h3>
              <span className="inline-block mt-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 text-sm font-semibold rounded-full border border-blue-300 shadow-sm">
              {m.status ?? "—"}
            </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <InfoItem label="Type" value={m.type ?? "Non spécifié"} icon="🔧" />
              <InfoItem label="Ville" value={m.city ?? "Non spécifiée"} icon="🏙️" />
              <InfoItem label="Client" value={m.client_name ?? "Non renseigné"} icon="👤" />
            </div>
            <div className="space-y-4">
              <InfoItem label="Durée" value={`${m.estimated_duration_min ?? "—"} min`} icon="⏱️" />
              <InfoItem 
                label="Rémunération" 
                value={cents(m.price_subcontractor_cents, m.currency)} 
                icon="💰" 
                highlight={true}
              />
              <InfoItem 
                label="Créneau" 
                value={m.scheduled_start ? new Date(m.scheduled_start).toLocaleString() : "Non planifié"} 
                icon="📅" 
              />
            </div>
          </div>
          
          {m.address && (
            <div className="bg-gradient-to-r from-blue-50 to-blue-50 border border-blue-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-lg">📍</span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-blue-800 mb-2">Adresse complète révélée</div>
                  <div className="text-slate-700 font-medium">{m.address} {m.zip ? `(${m.zip})` : ""}</div>
                  <div className="text-blue-600 text-sm mt-2 flex items-center gap-2">
                    <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    Mission acceptée - accès complet autorisé
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:w-48">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl hover:bg-slate-50 font-semibold transition-all transform hover:scale-105 shadow-lg text-slate-700"
            title="Ouvrir l'itinéraire"
          >
            <span className="text-lg">🗺️</span>
            Itinéraire
          </a>
          {/* Boutons "Démarrer", "Rapport", etc. viendront ensuite */}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ 
  label, 
  value, 
  icon, 
  highlight = false 
}: { 
  label: string; 
  value: string; 
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
        <span className="text-slate-600">{icon}</span>
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-600">{label}</div>
        <div className={`font-semibold ${highlight ? 'text-blue-600 text-lg' : 'text-slate-900'}`}>
          {value}
        </div>
      </div>
    </div>
  );
}