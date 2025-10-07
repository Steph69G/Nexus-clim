// src/pages/admin/MissionEditModal.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sanitizeMissionPatch } from "@/lib/missionSanitize";
import GoogleAddressInput from "@/components/GoogleAddressInput";
import { useAddressInput } from "@/hooks/useAddressInput";

type Mission = {
  id: string;
  title: string | null;
  type: string | null;   // depannage | entretien | pose | remplacement
  status: string | null; // brouillon | publiee | acceptee | planifiee | ...
  client_name: string | null;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  scheduled_start: string | null; // ISO
  created_at?: string;
  updated_at?: string;
};

type Props = {
  open: boolean;
  mission: Mission;
  onClose: () => void;
  onSaved: (m: Mission) => void;
};

const STATUS_OPTIONS = [
  { value: "BROUILLON", label: "Brouillon" },
  { value: "PUBLIEE", label: "Publiée" },
  { value: "ACCEPTEE", label: "Acceptée" },
  { value: "PLANIFIEE", label: "Planifiée" },
  { value: "EN_ROUTE", label: "En route" },
  { value: "EN_INTERVENTION", label: "En intervention" },
  { value: "TERMINEE", label: "Terminée" },
  { value: "FACTURABLE", label: "Facturable" },
  { value: "FACTUREE", label: "Facturée" },
  { value: "PAYEE", label: "Payée" },
  { value: "CLOTUREE", label: "Clôturée" },
  { value: "ANNULEE", label: "Annulée" },
];

const TYPE_OPTIONS = [
  { value: "DEP", label: "Dépannage" },
  { value: "ENTR", label: "Entretien" },
  { value: "POSE", label: "Pose" },
  { value: "AUDIT", label: "Audit" },
];

function isoToLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  // tronquer à "YYYY-MM-DDTHH:mm"
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function localInputToIso(v: string) {
  if (!v) return null;
  // v est en local; on renvoie un ISO (UTC) propre
  const dt = new Date(v);
  return dt.toISOString();
}

export default function MissionEditModal({ open, mission, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Mission>(mission);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const {
    addressState,
    handleGooglePlacesSelect,
    handleManualChange,
  } = useAddressInput({
    address: mission.address || "",
    city: mission.city || "",
    zip: "",
    lat: mission.lat,
    lng: mission.lng,
  });

  useEffect(() => {
    setForm(mission);
    setErr(null);
  }, [mission, open]);

  const dirtyPatch = useMemo(() => {
    // calcul d'un diff minimal vs mission d'origine
    const patch: Record<string, any> = {};
    (Object.keys(form) as (keyof Mission)[]).forEach((k) => {
      if (k === "id" || k === "created_at" || k === "updated_at") return;
      if (form[k] !== mission[k]) {
        patch[k as string] = form[k];
      }
    });
    return patch;
  }, [form, mission]);

  // Callback pour Google Places
  function handleAddressSelectWrapper(addressData: {
    address: string;
    city: string;
    zip: string;
    lat: number;
    lng: number;
  }) {
    handleGooglePlacesSelect(addressData);
    setForm((f) => ({
      ...f,
      address: addressData.address,
      city: addressData.city,
      zip: addressData.zip,
      lat: addressData.lat,
      lng: addressData.lng,
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setErr(null);

      const prepared = { ...dirtyPatch };

      // normaliser la date
      if ("scheduled_start" in prepared) {
        prepared.scheduled_start = localInputToIso(prepared.scheduled_start);
      }

      // Debug: voir ce qui est envoyé
      console.log("Données avant sanitization:", prepared);
      const payload = sanitizeMissionPatch(prepared);
      console.log("Données après sanitization:", payload);

      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      const { data, error } = await supabase
        .from("missions")
        .update(payload)
        .eq("id", mission.id)
        .select("*")
        .single();

      if (error) throw error;

      onSaved(data as Mission);
      onClose();
    } catch (e: any) {
      console.error("Save mission failed", e);
      setErr(e?.message || "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-[680px] max-w-[95vw] rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Éditer la mission</h2>
          <button onClick={onClose} className="rounded px-2 py-1 text-sm hover:bg-gray-100">✕</button>
        </div>

        {err && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium">Titre</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.title ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Entretien clim Mitsubishi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Type</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.type ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="">—</option>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Statut</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.status ?? "BROUILLON"}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Client</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.client_name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Ville</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.city ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Ex: Paris"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium">🔍 Recherche d'adresse (Google Places)</label>
            <GoogleAddressInput
              onAddressSelect={handleAddressSelectWrapper}
              placeholder="Tapez une adresse pour autocomplétion..."
              className="border-blue-200 focus:border-blue-400"
              initialValue={addressState.fullAddress}
            />
            <p className="text-xs text-gray-500 mt-1">
              Commencez à taper pour voir les suggestions. Les champs ci-dessous seront remplis automatiquement.
            </p>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium">Ou modifier manuellement :</label>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium">Adresse complète</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.address ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Ex: 15 rue de la Paix"
            />
            {fullGoogleAddress && (
              <p className="text-xs text-green-600 mt-1">
                ✅ Sélectionnée via Google: {fullGoogleAddress}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Code postal</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.zip ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
              placeholder="Ex: 75001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Latitude</label>
            <input
              type="number"
              step="any"
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.lat ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value === "" ? null : Number(e.target.value) }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Longitude</label>
            <input
              type="number"
              step="any"
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.lng ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value === "" ? null : Number(e.target.value) }))}
            />
          </div>

          {/* Indicateur de géocodage */}
          {(form.lat && form.lng) && (
            <div className="col-span-2 p-2 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-700">
                ✅ Adresse géocodée avec succès (coordonnées enregistrées automatiquement)
              </p>
            </div>
          )}

          <div className="col-span-2">
            <label className="block text-sm font-medium">Début prévu</label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border px-3 py-2"
              value={isoToLocalInput(form.scheduled_start)}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_start: e.target.value }))}
            />
            <p className="mt-1 text-xs text-gray-500">Laisser vide si non planifié.</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-3 py-2 hover:bg-gray-50">Annuler</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}