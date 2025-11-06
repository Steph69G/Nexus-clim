import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Prefs = {
  in_app: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
  quiet_hours: { start: string; end: string };
  muted_types: string[];
};

const ALL_TYPES = [
  "mission_assigned",
  "mission_updated",
  "mission_completed",
  "mission_cancelled",
  "quote_sent",
  "quote_accepted",
  "quote_rejected",
  "quote_expiring",
  "invoice_sent",
  "invoice_paid",
  "invoice_overdue",
  "contract_created",
  "contract_renewal_reminder",
  "contract_expiring",
  "maintenance_due",
  "emergency_request_received",
  "emergency_assigned",
  "emergency_resolved",
  "survey_request",
  "survey_reminder",
  "certification_expiring",
  "payment_released",
  "document_available",
  "general",
  "appointment_reminder",
];

const TYPE_LABELS: Record<string, string> = {
  mission_assigned: "Mission assignée",
  mission_updated: "Mission modifiée",
  mission_completed: "Mission terminée",
  mission_cancelled: "Mission annulée",
  quote_sent: "Devis envoyé",
  quote_accepted: "Devis accepté",
  quote_rejected: "Devis refusé",
  quote_expiring: "Devis bientôt expiré",
  invoice_sent: "Facture envoyée",
  invoice_paid: "Facture payée",
  invoice_overdue: "Facture en retard",
  contract_created: "Contrat créé",
  contract_renewal_reminder: "Renouvellement contrat",
  contract_expiring: "Contrat bientôt expiré",
  maintenance_due: "Maintenance à planifier",
  emergency_request_received: "Dépannage urgent reçu",
  emergency_assigned: "Dépannage urgent assigné",
  emergency_resolved: "Dépannage urgent résolu",
  survey_request: "Demande d'enquête satisfaction",
  survey_reminder: "Rappel enquête satisfaction",
  certification_expiring: "Certification bientôt expirée",
  payment_released: "Paiement libéré",
  document_available: "Document disponible",
  general: "Notifications générales",
  appointment_reminder: "Rappel rendez-vous",
};

export default function NotificationPreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({
    in_app: true,
    email: false,
    sms: false,
    push: false,
    quiet_hours: { start: "22:00", end: "07:00" },
    muted_types: [],
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_my_notification_preferences");
      if (error) {
        setToast({ message: "Impossible de charger les préférences", type: "error" });
      } else if (data && data.length > 0) {
        const row = data[0];
        setPrefs({
          in_app: row.in_app,
          email: row.email,
          sms: row.sms,
          push: row.push,
          quiet_hours: {
            start: row.quiet_hours?.start ?? "22:00",
            end: row.quiet_hours?.end ?? "07:00",
          },
          muted_types: row.muted_types ?? [],
        });
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function save() {
    setSaving(true);
    const { error } = await supabase.rpc("set_my_notification_preferences", {
      p_in_app: prefs.in_app,
      p_email: prefs.email,
      p_sms: prefs.sms,
      p_push: prefs.push,
      p_quiet_hours: prefs.quiet_hours,
      p_muted_types: prefs.muted_types,
    });
    setSaving(false);
    if (error) {
      setToast({ message: error.message, type: "error" });
    } else {
      setToast({ message: "Préférences enregistrées", type: "success" });
    }
  }

  const mutedSet = useMemo(() => new Set(prefs.muted_types), [prefs.muted_types]);
  const toggleType = (t: string) => {
    setPrefs((p) => {
      const s = new Set(p.muted_types);
      s.has(t) ? s.delete(t) : s.add(t);
      return { ...p, muted_types: Array.from(s) };
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-600">Chargement des préférences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {toast && (
        <div
          className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === "success"
              ? "bg-green-100 text-green-800 border border-green-200"
              : "bg-red-100 text-red-800 border border-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Préférences de notifications</h1>
        <p className="text-sm text-slate-600 mt-1">Configurez vos canaux de communication et plages horaires.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Canaux de notification</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors cursor-pointer bg-white">
            <input
              type="checkbox"
              checked={prefs.in_app}
              onChange={(e) => setPrefs((p) => ({ ...p, in_app: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-semibold text-slate-900">Dans l'application</div>
              <div className="text-xs text-slate-500 mt-1">Cloche de notifications et liste intégrée</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors cursor-pointer bg-white">
            <input
              type="checkbox"
              checked={prefs.email}
              onChange={(e) => setPrefs((p) => ({ ...p, email: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-semibold text-slate-900">E-mail</div>
              <div className="text-xs text-slate-500 mt-1">Recevoir des e-mails pour les événements importants</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors cursor-pointer bg-white">
            <input
              type="checkbox"
              checked={prefs.sms}
              onChange={(e) => setPrefs((p) => ({ ...p, sms: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-semibold text-slate-900">SMS</div>
              <div className="text-xs text-slate-500 mt-1">Messages texte pour les urgences et événements critiques</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors cursor-pointer bg-white">
            <input
              type="checkbox"
              checked={prefs.push}
              onChange={(e) => setPrefs((p) => ({ ...p, push: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-semibold text-slate-900">Notifications push</div>
              <div className="text-xs text-slate-500 mt-1">Alertes sur navigateur et applications mobiles</div>
            </div>
          </label>
        </div>
      </section>

      <section className="p-6 border border-slate-200 rounded-xl bg-white">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold text-slate-900">Plage horaire tranquille</h2>
          <span className="text-2xl">🌙</span>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Définissez une période pendant laquelle vous ne souhaitez pas être dérangé par les notifications SMS et Push.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="text-sm text-slate-700 font-medium block mb-2">Heure de début</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="time"
              value={prefs.quiet_hours.start}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, quiet_hours: { ...p.quiet_hours, start: e.target.value } }))
              }
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-sm text-slate-700 font-medium block mb-2">Heure de fin</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="time"
              value={prefs.quiet_hours.end}
              onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours: { ...p.quiet_hours, end: e.target.value } }))}
            />
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Note :</strong> Les e-mails ne sont pas concernés par cette plage. Seuls les SMS et notifications push seront différés pendant ces horaires.
          </p>
        </div>
      </section>

      <section className="p-6 border border-slate-200 rounded-xl">
        <h2 className="font-semibold text-slate-900 mb-4">Types de notifications à masquer</h2>
        <p className="text-sm text-slate-600 mb-4">Cochez les types de notifications que vous ne souhaitez plus recevoir</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {ALL_TYPES.map((t) => (
            <label
              key={t}
              className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={mutedSet.has(t)}
                onChange={() => toggleType(t)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 font-medium">{TYPE_LABELS[t] || t}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
