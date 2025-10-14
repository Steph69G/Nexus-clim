// src/pages/account/PreferencesCard.tsx
import { useEffect, useState } from "react";
import { getMyPreferences, saveMyPreferences } from "@/api/profile.preferences";
import { useToast } from "@/ui/toast/ToastProvider";
import { Wrench, Zap, Package, Wind, Flame, Droplets } from "lucide-react";

// Liste des types proposés avec icônes et labels
const TYPE_OPTIONS = [
  { value: "ENTR", label: "Entretien", icon: Wrench, color: "emerald" },
  { value: "DEP", label: "Dépannage", icon: Zap, color: "amber" },
  { value: "INST", label: "Installation", icon: Package, color: "blue" },
  { value: "PACS", label: "PAC / Clim", icon: Wind, color: "cyan" },
  { value: "CHAUDIERE", label: "Chaudière", icon: Flame, color: "orange" },
  { value: "PLOMBERIE", label: "Plomberie", icon: Droplets, color: "sky" },
];

const RADIUS_PRESETS = [10, 25, 50, 75, 100];

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

  function toggleType(value: string) {
    setTypes((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  }

  function getColorClasses(color: string, active: boolean) {
    const colors = {
      emerald: active ? "bg-emerald-500 border-emerald-600 text-white" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
      amber: active ? "bg-amber-500 border-amber-600 text-white" : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
      blue: active ? "bg-blue-500 border-blue-600 text-white" : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
      cyan: active ? "bg-cyan-500 border-cyan-600 text-white" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100",
      orange: active ? "bg-orange-500 border-orange-600 text-white" : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100",
      sky: active ? "bg-sky-500 border-sky-600 text-white" : "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100",
    };
    return colors[color as keyof typeof colors] || colors.blue;
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
    <section className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
      <div className="bg-white border-b border-slate-100 px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-2xl">⚙️</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Préférences</h3>
            <p className="text-sm text-slate-500 mt-0.5">Personnalisez vos critères de missions</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8">
          <div className="flex items-center justify-center gap-3 py-12">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      ) : (
        <div className="p-8 space-y-8">
          {/* Distance avec slider visuel */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <label className="block text-base font-semibold text-slate-800 mb-4">
              Distance maximale d'intervention
            </label>

            <div className="flex items-center gap-4 mb-4">
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={radiusKm || 25}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                style={{
                  background: `linear-gradient(to right, rgb(37, 99, 235) 0%, rgb(37, 99, 235) ${((Number(radiusKm) || 25) - 10) / 0.9}%, rgb(226, 232, 240) ${((Number(radiusKm) || 25) - 10) / 0.9}%, rgb(226, 232, 240) 100%)`
                }}
              />
              <div className="flex items-baseline gap-1 min-w-[80px]">
                <input
                  type="number"
                  min={10}
                  max={100}
                  step={5}
                  value={radiusKm}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRadiusKm(v === "" ? "" : Math.min(100, Math.max(10, Number(v))));
                  }}
                  className="w-16 text-right text-2xl font-bold text-blue-600 bg-transparent border-none focus:outline-none"
                />
                <span className="text-sm font-medium text-slate-500">km</span>
              </div>
            </div>

            <div className="flex justify-between text-xs text-slate-400 mb-3">
              {RADIUS_PRESETS.map((km) => (
                <button
                  key={km}
                  onClick={() => setRadiusKm(km)}
                  className="hover:text-blue-600 transition-colors"
                >
                  {km}
                </button>
              ))}
            </div>

            <div className="flex items-start gap-2 mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-blue-600 text-sm">ℹ️</span>
              <p className="text-xs text-blue-700 leading-relaxed">
                Seules les missions situées à moins de <strong>{radiusKm || 25} km</strong> de votre position seront affichées sur la carte et dans vos offres.
              </p>
            </div>
          </div>

          {/* Types avec icônes */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <label className="block text-base font-semibold text-slate-800 mb-4">
              Types d'interventions souhaités
            </label>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TYPE_OPTIONS.map((option) => {
                const active = types.includes(option.value);
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleType(option.value)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border-2
                      transition-all duration-200 transform hover:scale-105 hover:shadow-md
                      ${getColorClasses(option.color, active)}
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-start gap-2 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-sm">💡</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                {types.length === 0
                  ? "Aucun type sélectionné : vous recevrez toutes les offres disponibles."
                  : `${types.length} type${types.length > 1 ? 's' : ''} sélectionné${types.length > 1 ? 's' : ''} : vous recevrez uniquement ces missions.`
                }
              </p>
            </div>
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            className="
              w-full px-6 py-4 rounded-2xl
              bg-gradient-to-r from-blue-600 to-blue-700
              text-white font-semibold text-base
              hover:from-blue-700 hover:to-blue-800
              disabled:opacity-50 disabled:cursor-not-allowed
              transform hover:scale-[1.02] transition-all duration-200
              shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300
            "
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Enregistrement en cours...
              </span>
            ) : (
              "Enregistrer les préférences"
            )}
          </button>
        </div>
      )}
    </section>
  );
}
