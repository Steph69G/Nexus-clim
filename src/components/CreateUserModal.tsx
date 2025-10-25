import { useState } from "react";
import { X } from "lucide-react";
import { useToast } from "@/ui/toast/ToastProvider";
import GoogleAddressInput from "./GoogleAddressInput";
import { mapUiRoleToDb, type UiRole } from "@/lib/roles";
import { getRoleColors } from "@/lib/roleColors";
import { supabase } from "@/lib/supabase";
import { useAddressInput } from "@/hooks/useAddressInput";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type FormData = {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: UiRole;
  radius_km: number;
};

export default function CreateUserModal({ isOpen, onClose, onSuccess }: Props) {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "tech",
    radius_km: 50,
  });

  const {
    addressState,
    handleGooglePlacesSelect,
    clearAddress,
    hasValidAddress,
    getAddressData,
  } = useAddressInput();

  const handleAddressSelect = (address: {
    address: string;
    city: string;
    zip: string;
    lat: number;
    lng: number;
  }) => {
    handleGooglePlacesSelect(address);
    push({
      type: "success",
      message: `✅ Adresse sélectionnée : ${address.city}`
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasValidAddress()) {
      push({ type: "error", message: "Veuillez sélectionner une adresse complète" });
      return;
    }

    setLoading(true);

    try {
      const dbRole = mapUiRoleToDb(formData.role);
      if (!dbRole) {
        throw new Error("Rôle invalide");
      }

      const addressData = getAddressData();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            phone: formData.phone,
            role: dbRole,
            address: addressData.address,
            city: addressData.city,
            zip: addressData.zip,
            lat: addressData.lat,
            lng: addressData.lng,
            radius_km: formData.radius_km,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la création");
      }

      push({ type: "success", message: "Utilisateur créé et email envoyé" });
      if (typeof onSuccess === "function") {
        try {
          onSuccess();
        } catch (e) {
          console.warn("onSuccess callback threw:", e);
        }
      }
      onClose();
      setFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "tech",
        radius_km: 50,
      });
      clearAddress();
    } catch (error: any) {
      push({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-2xl font-bold text-slate-900">Créer un utilisateur</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 ${getRoleColors(formData.role).ring} focus:border-transparent`}
                placeholder="utilisateur@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Mot de passe temporaire <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 ${getRoleColors(formData.role).ring} focus:border-transparent`}
                placeholder="Minimum 6 caractères"
                minLength={6}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nom complet <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className={`w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 ${getRoleColors(formData.role).ring} focus:border-transparent`}
                placeholder="Jean Dupont"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 ${getRoleColors(formData.role).ring} focus:border-transparent`}
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Rôle <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["admin", "tech", "st", "sal"] as UiRole[]).map((role) => {
                const colors = getRoleColors(role);
                const isSelected = formData.role === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormData({ ...formData, role })}
                    className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                      isSelected
                        ? `bg-gradient-to-r ${colors.gradientLight} ${colors.border} ${colors.text}`
                        : `bg-white border-slate-300 text-slate-700 ${colors.borderHover}`
                    }`}
                  >
                    {role.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Adresse complète <span className="text-red-500">*</span>
            </label>
            <GoogleAddressInput
              onAddressSelect={handleAddressSelect}
              placeholder="Tapez une adresse..."
              className={`border-slate-300 rounded-xl focus:ring-2 ${getRoleColors(formData.role).ring} focus:border-transparent`}
              initialValue={addressState.fullAddress}
            />
            {addressState.city && (
              <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="text-green-600 text-xl">✅</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800 mb-1">
                      Adresse sélectionnée et géocodée
                    </p>
                    <p className="text-sm text-green-700">
                      📍 {addressState.address}, {addressState.zip} {addressState.city}
                    </p>
                    {addressState.lat && addressState.lng && (
                      <p className="text-xs text-green-600 mt-1">
                        Coordonnées : {addressState.lat.toFixed(4)}, {addressState.lng.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Rayon d'action (km) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              max="500"
              value={formData.radius_km}
              onChange={(e) =>
                setFormData({ ...formData, radius_km: parseInt(e.target.value) || 50 })
              }
              className={`w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 ${getRoleColors(formData.role).ring} focus:border-transparent`}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !formData.email || !formData.password || !formData.full_name || !hasValidAddress()}
              className={`flex-1 px-6 py-3 bg-gradient-to-r ${getRoleColors(formData.role).gradient} text-white rounded-xl font-semibold ${getRoleColors(formData.role).gradientHover} transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
            >
              {loading ? "Création..." : "Créer et envoyer l'email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
