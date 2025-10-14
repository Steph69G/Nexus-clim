import { useEffect, useState } from "react";
import { X, Plus, Edit2, Trash2, Eye, EyeOff, GripVertical, Save } from "lucide-react";
import {
  getAllInterventionTypes,
  createInterventionType,
  updateInterventionType,
  deleteInterventionType,
  toggleInterventionTypeStatus,
  InterventionType,
  InterventionTypeInput,
} from "@/api/intervention-types";
import { useToast } from "@/ui/toast/ToastProvider";
import * as LucideIcons from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onTypesUpdated: () => void;
}

const AVAILABLE_ICONS = [
  "Wrench",
  "Zap",
  "Package",
  "Wind",
  "Flame",
  "Droplets",
  "Hammer",
  "Drill",
  "Cog",
  "Tool",
  "Settings",
  "CircuitBoard",
  "Thermometer",
  "Gauge",
];

const AVAILABLE_COLORS = [
  { name: "emerald", class: "bg-emerald-500", label: "Vert" },
  { name: "amber", class: "bg-amber-500", label: "Ambre" },
  { name: "blue", class: "bg-blue-500", label: "Bleu" },
  { name: "cyan", class: "bg-cyan-500", label: "Cyan" },
  { name: "orange", class: "bg-orange-500", label: "Orange" },
  { name: "sky", class: "bg-sky-500", label: "Ciel" },
  { name: "red", class: "bg-red-500", label: "Rouge" },
  { name: "purple", class: "bg-purple-500", label: "Violet" },
  { name: "pink", class: "bg-pink-500", label: "Rose" },
  { name: "slate", class: "bg-slate-500", label: "Ardoise" },
];

export default function ManageInterventionTypesModal({ isOpen, onClose, onTypesUpdated }: Props) {
  const { push } = useToast();
  const [types, setTypes] = useState<InterventionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<InterventionTypeInput>({
    code: "",
    label: "",
    icon_name: "Wrench",
    color: "blue",
    display_order: 0,
  });

  useEffect(() => {
    if (isOpen) {
      loadTypes();
    }
  }, [isOpen]);

  async function loadTypes() {
    try {
      setLoading(true);
      const data = await getAllInterventionTypes();
      setTypes(data);
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur de chargement" });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      code: "",
      label: "",
      icon_name: "Wrench",
      color: "blue",
      display_order: 0,
    });
    setEditingId(null);
    setIsCreating(false);
  }

  function startCreating() {
    resetForm();
    setIsCreating(true);
  }

  function startEditing(type: InterventionType) {
    setFormData({
      code: type.code,
      label: type.label,
      icon_name: type.icon_name,
      color: type.color,
      display_order: type.display_order,
    });
    setEditingId(type.id);
    setIsCreating(false);
  }

  async function handleSave() {
    try {
      if (!formData.code || !formData.label) {
        push({ type: "error", message: "Code et libellé requis" });
        return;
      }

      if (isCreating) {
        await createInterventionType(formData);
        push({ type: "success", message: "Type créé avec succès" });
      } else if (editingId) {
        await updateInterventionType(editingId, formData);
        push({ type: "success", message: "Type modifié avec succès" });
      }

      await loadTypes();
      onTypesUpdated();
      resetForm();
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur lors de l'enregistrement" });
    }
  }

  async function handleToggleStatus(id: string) {
    try {
      await toggleInterventionTypeStatus(id);
      await loadTypes();
      onTypesUpdated();
      push({ type: "success", message: "Statut modifié" });
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce type ?")) return;

    try {
      await deleteInterventionType(id);
      await loadTypes();
      onTypesUpdated();
      push({ type: "success", message: "Type supprimé" });
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur lors de la suppression" });
    }
  }

  function renderIcon(iconName: string) {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-5 h-5" /> : <LucideIcons.Wrench className="w-5 h-5" />;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Gérer les types d'interventions</h2>
            <p className="text-blue-100 text-sm mt-1">Administrez les types disponibles dans le système</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {(isCreating || editingId) && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                  <h3 className="font-semibold text-lg text-blue-900 mb-4">
                    {isCreating ? "Créer un nouveau type" : "Modifier le type"}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Code (ex: ENTR, DEP)
                      </label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="CODE"
                        disabled={!!editingId}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Libellé</label>
                      <input
                        type="text"
                        value={formData.label}
                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Entretien"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Icône</label>
                      <select
                        value={formData.icon_name}
                        onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {AVAILABLE_ICONS.map((icon) => (
                          <option key={icon} value={icon}>
                            {icon}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Couleur</label>
                      <div className="grid grid-cols-5 gap-2">
                        {AVAILABLE_COLORS.map((color) => (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() => setFormData({ ...formData, color: color.name })}
                            className={`
                              w-full h-10 rounded-lg ${color.class}
                              ${formData.color === color.name ? "ring-4 ring-slate-900 ring-offset-2" : ""}
                              hover:scale-110 transition-transform
                            `}
                            title={color.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleSave}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {isCreating ? "Créer" : "Enregistrer"}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {!isCreating && !editingId && (
                <button
                  onClick={startCreating}
                  className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter un nouveau type
                </button>
              )}

              <div className="space-y-3">
                {types.map((type) => (
                  <div
                    key={type.id}
                    className={`
                      border-2 rounded-xl p-4 transition-all
                      ${type.is_active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-60"}
                      hover:shadow-md
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />

                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${type.color}-100 text-${type.color}-600`}>
                          {renderIcon(type.icon_name)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{type.label}</div>
                          <div className="text-sm text-slate-500">{type.code}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(type.id)}
                          className={`p-2 rounded-lg transition-colors ${type.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-200 text-slate-500 hover:bg-slate-300"}`}
                          title={type.is_active ? "Actif" : "Inactif"}
                        >
                          {type.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => startEditing(type)}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(type.id)}
                          className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-8 py-4 bg-slate-50">
          <p className="text-sm text-slate-600">
            {types.filter((t) => t.is_active).length} type(s) actif(s) sur {types.length} au total
          </p>
        </div>
      </div>
    </div>
  );
}
