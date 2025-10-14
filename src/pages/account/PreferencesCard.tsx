// src/pages/account/PreferencesCard.tsx
import { useEffect, useState } from "react";
import { getMyPreferences, saveMyPreferences } from "@/api/profile.preferences";
import { useToast } from "@/ui/toast/ToastProvider";
import { Settings2 } from "lucide-react";
import { getActiveInterventionTypes, InterventionType } from "@/api/intervention-types";
import { useProfile } from "@/hooks/useProfile";
import ManageInterventionTypesModal from "@/components/ManageInterventionTypesModal";
import * as LucideIcons from "lucide-react";

const RADIUS_PRESETS = [0, 25, 50, 75, 100];

export default function PreferencesCard() {
  const { push } = useToast();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number | "">("");
  const [types, setTypes] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<InterventionType[]>([]);
  const [showManageModal, setShowManageModal] = useState(false);

  const isAdmin = profile?.role === "admin";

  async function loadData() {
    try {
      setLoading(true);
      const [prefs, typesData] = await Promise.all([
        getMyPreferences(),
        getActiveInterventionTypes(),
      ]);
      setRadiusKm(prefs.radius_km ?? "");
      setTypes(prefs.preferred_types ?? []);
      setAvailableTypes(typesData);
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur de chargement des préférences" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [push]);

  function toggleType(value: string) {
    setTypes((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  }

  function getColorClasses(color: string, active: boolean) {
    const colorMap: Record<string, string> = {
      emerald: active ? "bg-emerald-500 border-emerald-600 text-white" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
      amber: active ? "bg-amber-500 border-amber-600 text-white" : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
      blue: active ? "bg-blue-500 border-blue-600 text-white" : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
      cyan: active ? "bg-cyan-500 border-cyan-600 text-white" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100",
      orange: active ? "bg-orange-500 border-orange-600 text-white" : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100",
      sky: active ? "bg-sky-500 border-sky-600 text-white" : "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100",
      red: active ? "bg-red-500 border-red-600 text-white" : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
      purple: active ? "bg-purple-500 border-purple-600 text-white" : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
      pink: active ? "bg-pink-500 border-pink-600 text-white" : "bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100",
      slate: active ? "bg-slate-500 border-slate-600 text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100",
    };
    return colorMap[color] || colorMap.blue;
  }

  function renderIcon(iconName: string) {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-5 h-5 flex-shrink-0" /> : <LucideIcons.Wrench className="w-5 h-5 flex-shrink-0" />;
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
                min={0}
                max={100}
                step={5}
                value={radiusKm || 25}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="flex-1 h-2 rounded-lg cursor-pointer accent-blue-600"
              />
              <div className="flex items-baseline gap-1 min-w-[80px]">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={radiusKm}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRadiusKm(v === "" ? "" : Math.min(100, Math.max(0, Number(v))));
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
            <div className="flex items-center justify-between mb-4">
              <label className="block text-base font-semibold text-slate-800">
                Types d'interventions souhaités
              </label>
              {isAdmin && (
                <button
                  onClick={() => setShowManageModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <Settings2 className="w-4 h-4" />
                  Gérer les types
                </button>
              )}
            </div>

            {availableTypes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>Aucun type d'intervention disponible.</p>
                {isAdmin && (
                  <p className="text-sm mt-2">Cliquez sur "Gérer les types" pour en ajouter.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableTypes.map((option) => {
                  const active = types.includes(option.code);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleType(option.code)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border-2
                        transition-all duration-200 transform hover:scale-105 hover:shadow-md
                        ${getColorClasses(option.color, active)}
                      `}
                    >
                      {renderIcon(option.icon_name)}
                      <span className="truncate">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

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

      {showManageModal && (
        <ManageInterventionTypesModal
          isOpen={showManageModal}
          onClose={() => setShowManageModal(false)}
          onTypesUpdated={loadData}
        />
      )}
    </section>
  );
}
