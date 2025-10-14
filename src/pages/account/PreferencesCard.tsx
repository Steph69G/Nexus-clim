// src/pages/account/PreferencesCard.tsx
import { useEffect, useState } from "react";
import { getMyPreferences, saveMyPreferences } from "@/api/profile.preferences";
import { useToast } from "@/ui/toast/ToastProvider";

// Liste des types proposés (ajuste si besoin)
const TYPE_OPTIONS = [
  "ENTR",         // Entretien
  "DEP",          // Dépannage
  "INST",         // Installation
  "PACS",         // PAC / Clim
  "CHAUDIERE",
  "PLOMBERIE",
];

export default function PreferencesCard() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number | "">("");
  const [types, setTypes] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const p = await getMyPreferences();
        setRadiusKm(p.radius_km ?? "");
        setTypes(p.preferred_types ?? []);
      } catch (e: any) {
        push({ type: "error", message: e?.message ?? "Erreur de chargement des préférences" });
      } finally {
        setLoading(false);
      }
    })();
  }, [push]);

  function toggleType(t: string) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function onSave() {
    try {
      setSaving(true);
      const sanitizedRadius = radiusKm === "" ? null : Number(radiusKm);
      await saveMyPreferences({
        radius_km: sanitizedRadius,
        preferred_types: types,
      });
      push({ type: "success", message: "Préférences enregistrées ✅" });
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Impossible d’enregistrer" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
          <span className="text-blue-600">⚙️</span>
        </div>
        <h3 className="text-xl font-semibold text-slate-900">Préférences</h3>
      </div>

      {loading ? (
        <div className="py-8 text-slate-600">Chargement…</div>
      ) : (
        <>
          {/* Distance */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Distance maximale d’intervention (km)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={radiusKm}
              onChange={(e) => {
                const v = e.target.value;
                setRadiusKm(v === "" ? "" : Math.max(1, Number(v)));
              }}
              placeholder="ex. 25"
              className="w-full md:w-64 border border-slate-300 rounded-xl px-3 py-2"
            />
            <p className="text-xs text-slate-500 mt-1">Utilisé pour filtrer les missions trop éloignées.</p>
          </div>

          {/* Types */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Types d’interventions souhaités
            </label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((t) => {
                const active = types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={`px-3 py-2 rounded-full text-sm border transition-colors ${
                      active
                        ? "bg-blue-600 text-white border-blue-700"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Laissez vide pour accepter tous les types.
            </p>
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer les préférences"}
          </button>
        </>
      )}
    </section>
  );
}
