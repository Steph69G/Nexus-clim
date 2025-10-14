import { useEffect, useMemo, useState } from "react";
import { fetchMyMissions, subscribeMyMissions, type MyMission } from "@/api/missions.my";
import { useToast } from "@/ui/toast/ToastProvider";
import { setMissionSchedule } from "@/api/missions.schedule";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { getActiveInterventionTypes, InterventionType } from "@/api/intervention-types";

/* ---------- utils ---------- */
function cents(c: number | null, cur: string | null) {
  if (c == null) return "—";
  return `${(c / 100).toFixed(2)} ${cur ?? "EUR"}`;
}

/* Helpers API en-ligne (évite de créer un autre fichier) */
async function updateMissionDuration(missionId: string, minutes: number) {
  const { error } = await supabase.from("missions").update({ estimated_duration_min: minutes }).eq("id", missionId);
  if (error) throw new Error(error.message);
}
async function updateMissionType(missionId: string, type: string) {
  const { error } = await supabase.from("missions").update({ type }).eq("id", missionId);
  if (error) throw new Error(error.message);
}

/* ---------- page ---------- */
export default function MyMissionsPage() {
  const { push } = useToast();
  const { profile } = useProfile();
  const isAdmin = String(profile?.role || "").toLowerCase() === "admin";

  const [rows, setRows] = useState<MyMission[]>([]);
  const [loading, setLoading] = useState(true);

  // État pour les 3 modales (planif, durée, type)
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planningMissionId, setPlanningMissionId] = useState<string | null>(null);
  const [planningDefaultISO, setPlanningDefaultISO] = useState<string | null>(null);

  const [durModalOpen, setDurModalOpen] = useState(false);
  const [durMissionId, setDurMissionId] = useState<string | null>(null);
  const [durDefault, setDurDefault] = useState<number | null>(null);

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeMissionId, setTypeMissionId] = useState<string | null>(null);
  const [typeDefault, setTypeDefault] = useState<string>("");

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

  function openPlanner(m: MyMission) {
    setPlanningMissionId(m.id);
    setPlanningDefaultISO(m.scheduled_start || null);
    setPlanModalOpen(true);
  }

  function openDuration(m: MyMission) {
    if (!isAdmin) return;
    setDurMissionId(m.id);
    setDurDefault(m.estimated_duration_min ?? null);
    setDurModalOpen(true);
  }

  function openType(m: MyMission) {
    if (!isAdmin) return;
    setTypeMissionId(m.id);
    setTypeDefault(m.type ?? "");
    setTypeModalOpen(true);
  }

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
                <Card key={m.id} m={m} onPlanClick={openPlanner} onDurClick={openDuration} onTypeClick={openType} isAdmin={isAdmin} />
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
                <Card key={m.id} m={m} onPlanClick={openPlanner} onDurClick={openDuration} onTypeClick={openType} isAdmin={isAdmin} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Modale 📅 Planification */}
      <ScheduleModal
        open={planModalOpen}
        defaultValue={planningDefaultISO}
        onClose={() => setPlanModalOpen(false)}
        onSave={async (iso) => {
          if (!planningMissionId) return;
          try {
            await setMissionSchedule(planningMissionId, iso);
            setPlanModalOpen(false);
            setPlanningMissionId(null);
            setPlanningDefaultISO(null);
            await fetchMyMissions().then(setRows);
            push({ type: "success", message: "Créneau enregistré ✅" });
          } catch (e: any) {
            push({ type: "error", message: e?.message ?? "Erreur lors de la planification" });
          }
        }}
      />

      {/* Modale ⏱️ Durée (admin) */}
      <DurationModal
        open={durModalOpen}
        defaultMinutes={durDefault}
        onClose={() => setDurModalOpen(false)}
        onSave={async (minutes) => {
          if (!durMissionId) return;
          try {
            await updateMissionDuration(durMissionId, minutes);
            setDurModalOpen(false);
            setDurMissionId(null);
            setDurDefault(null);
            await fetchMyMissions().then(setRows);
            push({ type: "success", message: "Durée mise à jour ✅" });
          } catch (e: any) {
            push({ type: "error", message: e?.message ?? "Erreur lors de la mise à jour" });
          }
        }}
      />

      {/* Modale 🔧 Type (admin) */}
      <TypeModal
        open={typeModalOpen}
        defaultType={typeDefault}
        onClose={() => setTypeModalOpen(false)}
        onSave={async (newType) => {
          if (!typeMissionId) return;
          try {
            await updateMissionType(typeMissionId, newType);
            setTypeModalOpen(false);
            setTypeMissionId(null);
            setTypeDefault("");
            await fetchMyMissions().then(setRows);
            push({ type: "success", message: "Type mis à jour ✅" });
          } catch (e: any) {
            push({ type: "error", message: e?.message ?? "Erreur lors de la mise à jour" });
          }
        }}
      />
    </div>
  );
}

/* ---------- Carte mission ---------- */
function Card({
  m,
  onPlanClick,
  onDurClick,
  onTypeClick,
  isAdmin,
}: {
  m: MyMission;
  onPlanClick: (m: MyMission) => void;
  onDurClick: (m: MyMission) => void;
  onTypeClick: (m: MyMission) => void;
  isAdmin: boolean;
}) {
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
              {/* 🔧 Type — cliquable si admin */}
              <button
                type="button"
                onClick={() => (isAdmin ? onTypeClick(m) : null)}
                className={`flex items-center gap-3 w-full text-left px-2 py-2 rounded-lg transition-colors ${
                  isAdmin ? "hover:bg-blue-50/60" : ""
                }`}
                title={isAdmin ? "Modifier le type" : undefined}
              >
                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                  <span className="text-slate-600">🔧</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-600">Type</div>
                  <div className="font-semibold text-slate-900">
                    {m.type ?? "Non spécifié"}
                  </div>
                </div>
              </button>

              <InfoItem label="Ville" value={m.city ?? "Non spécifiée"} icon="🏙️" />
              <InfoItem label="Client" value={m.client_name ?? "Non renseigné"} icon="👤" />
            </div>
            <div className="space-y-4">
              {/* ⏱️ Durée — cliquable si admin */}
              <button
                type="button"
                onClick={() => (isAdmin ? onDurClick(m) : null)}
                className={`flex items-center gap-3 w-full text-left px-2 py-2 rounded-lg transition-colors ${
                  isAdmin ? "hover:bg-blue-50/60" : ""
                }`}
                title={isAdmin ? "Modifier la durée" : undefined}
              >
                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                  <span className="text-slate-600">⏱️</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-600">Durée</div>
                  <div className="font-semibold text-slate-900">
                    {`${m.estimated_duration_min ?? "—"} min`}
                  </div>
                </div>
              </button>

              <InfoItem
                label="Rémunération"
                value={cents(m.price_subcontractor_cents, m.currency)}
                icon="💰"
                highlight={true}
              />

              {/* 📅 Créneau — cliquable pour tous */}
              <button
                type="button"
                onClick={() => onPlanClick(m)}
                className="flex items-center gap-3 w-full text-left hover:bg-blue-50/60 px-2 py-2 rounded-lg transition-colors"
                title={m.scheduled_start ? "Replanifier" : "Planifier"}
              >
                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                  <span className="text-slate-600">📅</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-600">Créneau</div>
                  <div className="font-semibold text-slate-900">
                    {m.scheduled_start
                      ? new Date(m.scheduled_start).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
                      : <span className="text-slate-500 italic">Non planifié — cliquer pour définir</span>}
                  </div>
                </div>
              </button>
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
                  <div className="text-slate-700 font-medium">
                    {m.address} {m.zip ? `(${m.zip})` : ""}
                  </div>
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
          {/* Boutons "Démarrer", "Rapport", etc. à venir */}
        </div>
      </div>
    </div>
  );
}

/* ---------- sous-composants ---------- */
function InfoItem({
  label,
  value,
  icon,
  highlight = false,
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
        <div className={`font-semibold ${highlight ? "text-blue-600 text-lg" : "text-slate-900"}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

/* ---------- Modales ---------- */
function ScheduleModal({
  open,
  onClose,
  onSave,
  defaultValue,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (iso: string) => void;
  defaultValue: string | null;
}) {
  const [localVal, setLocalVal] = useState<string>(() => toLocalInput(defaultValue));
  useEffect(() => {
    setLocalVal(toLocalInput(defaultValue));
  }, [defaultValue]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Planifier un créneau</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-100">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Date & heure</label>
          <input
            type="datetime-local"
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
          <p className="text-xs text-slate-500">Choisis la date et l’heure de l’intervention.</p>
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">
            Annuler
          </button>
          <button
            onClick={() => {
              if (!localVal) return;
              onSave(new Date(localVal).toISOString());
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function DurationModal({
  open,
  onClose,
  onSave,
  defaultMinutes,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (minutes: number) => void;
  defaultMinutes: number | null;
}) {
  const [val, setVal] = useState<string>(defaultMinutes != null ? String(defaultMinutes) : "");
  useEffect(() => {
    setVal(defaultMinutes != null ? String(defaultMinutes) : "");
  }, [defaultMinutes]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Modifier la durée</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-100">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Durée (minutes)</label>
          <input
            type="number"
            min={0}
            step={5}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
          <p className="text-xs text-slate-500">Entrez la durée estimée de l’intervention.</p>
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">
            Annuler
          </button>
          <button
            onClick={() => {
              const n = Number(val);
              if (!Number.isFinite(n) || n < 0) return;
              onSave(n);
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function TypeModal({
  open,
  onClose,
  onSave,
  defaultType,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (type: string) => void;
  defaultType: string;
}) {
  const [val, setVal] = useState<string>(defaultType || "");
  const [types, setTypes] = useState<InterventionType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setVal(defaultType || "");
  }, [defaultType]);

  useEffect(() => {
    async function loadTypes() {
      try {
        setLoading(true);
        const data = await getActiveInterventionTypes();
        setTypes(data);
      } catch (e) {
        console.error("Failed to load intervention types", e);
      } finally {
        setLoading(false);
      }
    }
    if (open) {
      loadTypes();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Modifier le type</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-100">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Type d'intervention</label>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : types.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">Aucun type d'intervention disponible.</p>
            </div>
          ) : (
            <select
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">— Sélectionnez un type —</option>
              {types.map((type) => (
                <option key={type.id} value={type.code}>
                  {type.label}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-slate-500">Sélectionnez le type d'intervention parmi les types actifs.</p>
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">
            Annuler
          </button>
          <button
            onClick={() => {
              const t = val.trim();
              if (!t) return;
              onSave(t);
            }}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}
