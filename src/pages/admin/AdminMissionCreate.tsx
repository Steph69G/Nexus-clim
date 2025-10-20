import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/ui/toast/ToastProvider";
import { sanitizeMissionPatch } from "@/lib/missionSanitize";
import GoogleAddressInput from "@/components/GoogleAddressInput";
import { useAddressInput } from "@/hooks/useAddressInput";
import { getActiveInterventionTypes, type InterventionType as DBInterventionType } from "@/api/intervention-types";
import {
  ArrowLeft,
  Save,
  Send,
  FileText,
  User,
  MapPin,
  Clock,
  Euro,
  Wrench,
  Building2,
  Phone,
  Mail,
  Calendar,
  Target,
  Zap,
  Settings2
} from "lucide-react";
import * as LucideIcons from "lucide-react";

interface InterventionTypeDisplay {
  id: string;
  label: string;
  icon: string;
  iconName: string;
  color: string;
}

const STATUS_OPTIONS = [
  { value: "BROUILLON_INCOMPLET", label: "Brouillon incomplet", color: "text-gray-600 bg-gray-50" },
  { value: "BROUILLON", label: "Brouillon", color: "text-slate-600 bg-slate-50" },
  { value: "PUBLIEE", label: "Publiée", color: "text-blue-600 bg-blue-50" },
  { value: "ACCEPTEE", label: "Acceptée", color: "text-orange-600 bg-orange-50" },
  { value: "PLANIFIEE", label: "Planifiée", color: "text-indigo-600 bg-indigo-50" },
  { value: "EN_ROUTE", label: "En route", color: "text-purple-600 bg-purple-50" },
  { value: "EN_INTERVENTION", label: "En intervention", color: "text-amber-600 bg-amber-50" },
  { value: "TERMINEE", label: "Terminée", color: "text-emerald-600 bg-emerald-50" },
  { value: "FACTURABLE", label: "Facturable", color: "text-teal-600 bg-teal-50" },
  { value: "FACTUREE", label: "Facturée", color: "text-cyan-600 bg-cyan-50" },
  { value: "PAYEE", label: "Payée", color: "text-green-600 bg-green-50" },
  { value: "CLOTUREE", label: "Clôturée", color: "text-slate-600 bg-slate-50" },
  { value: "ANNULEE", label: "Annulée", color: "text-red-600 bg-red-50" },
];

export default function AdminMissionCreate() {
  const nav = useNavigate();
  const { push } = useToast();

  // Types d'intervention depuis la DB
  const [interventionTypes, setInterventionTypes] = useState<InterventionTypeDisplay[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  // Champs de la mission
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>("BROUILLON_INCOMPLET");
  const [description, setDescription] = useState("");
  const [estimatedDurationMin, setEstimatedDurationMin] = useState<number>(60);
  
  // Informations client
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  // Adresse - utilisation du hook personnalisé
  const {
    addressState,
    handleGooglePlacesSelect,
    handleManualChange,
    clearAddress,
    hasValidAddress,
    getAddressData,
  } = useAddressInput();

  // État pour afficher/masquer les champs manuels
  const [showManualAddress, setShowManualAddress] = useState(false);
  
  // Planification
  const [scheduledStart, setScheduledStart] = useState("");
  
  // Prix
  const [priceTotalCents, setPriceTotalCents] = useState<number | null>(null);
  const [priceSubcontractorCents, setPriceSubcontractorCents] = useState<number | null>(null);

  const [busy, setBusy] = useState(false);

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
      violet: active ? "bg-violet-500 border-violet-600 text-white" : "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100",
      pink: active ? "bg-pink-500 border-pink-600 text-white" : "bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100",
      slate: active ? "bg-slate-500 border-slate-600 text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100",
    };
    return colorMap[color] || colorMap.blue;
  }

  function renderIcon(iconName: string) {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-5 h-5 flex-shrink-0" /> : <Wrench className="w-5 h-5 flex-shrink-0" />;
  }

  // Charger les types d'intervention
  useEffect(() => {
    loadInterventionTypes();
  }, []);

  async function loadInterventionTypes() {
    try {
      setLoadingTypes(true);
      const types = await getActiveInterventionTypes();
      // Transformer les types de la DB en format d'affichage
      const displayTypes: InterventionTypeDisplay[] = types.map(t => ({
        id: t.id,
        label: t.label,
        icon: t.icon_name,
        iconName: t.icon_name,
        color: t.color
      }));
      setInterventionTypes(displayTypes);
    } catch (error) {
      console.error("Error loading intervention types:", error);
      push({ type: "error", message: "Erreur lors du chargement des types d'intervention" });
    } finally {
      setLoadingTypes(false);
    }
  }

  async function onSubmit(e: React.FormEvent, saveAsDraft = false) {
    e.preventDefault();

    const addressData = getAddressData();
    console.log("Form submission - Current state:", {
      addressData,
      hasValidAddress: hasValidAddress(),
      saveAsDraft
    });

    // Validations strictes seulement si ce n'est pas un brouillon
    if (!saveAsDraft) {
      if (!title.trim()) {
        return push({ type: "error", message: "Le titre est requis pour finaliser" });
      }
      if (!clientName.trim()) {
        return push({ type: "error", message: "Le nom du client est requis pour finaliser" });
      }

      // Validation d'adresse
      if (!hasValidAddress()) {
        console.log("Address validation failed:", addressData);
        return push({ type: "error", message: "Une adresse complète (rue + ville) est requise" });
      }
    } else {
      // Validation minimale pour brouillon : au moins un titre
      if (!title.trim()) {
        return push({ type: "error", message: "Un titre minimum est requis pour sauvegarder" });
      }
    }

    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        type: type || null,
        status: saveAsDraft ? "BROUILLON_INCOMPLET" : (status || "BROUILLON_INCOMPLET"),
        description: description.trim() || null,
        estimated_duration_min: estimatedDurationMin,

        // Client
        client_name: clientName.trim() || null,
        client_phone: clientPhone.trim() || null,
        client_email: clientEmail.trim() || null,

        // Adresse
        address: addressData.address.trim() || null,
        city: addressData.city.trim() || null,
        zip: addressData.zip.trim() || null,
        lat: addressData.lat,
        lng: addressData.lng,

        // Planification
        scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,

        // Prix
        price_total_cents: priceTotalCents,
        price_subcontractor_cents: priceSubcontractorCents,
        currency: "EUR",
      };

      const sanitizedPayload = sanitizeMissionPatch(payload);
      const { error } = await supabase.from("missions").insert([sanitizedPayload]);

      if (error) throw error;

      const message = saveAsDraft
        ? "Brouillon incomplet sauvegardé ✅ Vous pourrez le compléter plus tard"
        : "Mission créée avec succès ✅";

      push({ type: "success", message });
      nav("/admin", { replace: true });
    } catch (err: any) {
      push({ type: "error", message: err?.message ?? "Erreur création mission" });
    } finally {
      setBusy(false);
    }
  }

  // Géocodage simple (optionnel)
  async function geocodeAddress() {
    const addressData = getAddressData();
    if (!addressData.address.trim() || !addressData.city.trim()) return;

    try {
      const query = encodeURIComponent(`${addressData.address.trim()}, ${addressData.city.trim()}`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      const data = await response.json();

      if (data && data[0]) {
        handleManualChange('lat', parseFloat(data[0].lat));
        handleManualChange('lng', parseFloat(data[0].lon));
        push({ type: "success", message: "Coordonnées trouvées !" });
      } else {
        push({ type: "warning", message: "Adresse non trouvée pour le géocodage" });
      }
    } catch {
      push({ type: "warning", message: "Erreur lors du géocodage" });
    }
  }

  const selectedType = interventionTypes.find(t => t.id === type);
  const selectedStatus = STATUS_OPTIONS.find(s => s.value === status);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-5xl mx-auto px-4 space-y-8">
        {/* Header avec navigation */}
        <header className="text-center">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 border border-slate-200 shadow-xl mb-6">
            <Zap className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">Création de mission</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Nouvelle mission
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Créez une nouvelle intervention et assignez-la à vos équipes
          </p>
          
          <button
            type="button"
            onClick={() => nav(-1)}
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 border border-slate-300 rounded-xl hover:bg-white transition-all text-slate-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        </header>

        <form onSubmit={onSubmit} className="space-y-8">
          {/* Informations générales */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Informations générales</h2>
                <p className="text-slate-600">Détails de l'intervention à réaliser</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Titre de la mission *
                </label>
                <div className="relative">
                  <Target className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Entretien chaudière - Dupont"
                    required
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-base font-semibold text-slate-800">
                    Type d'intervention
                  </label>
                  <button
                    type="button"
                    onClick={() => nav("/admin/profile")}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Settings2 className="w-4 h-4" />
                    Gérer les types
                  </button>
                </div>

                {loadingTypes ? (
                  <div className="text-center py-8 text-slate-500">Chargement...</div>
                ) : interventionTypes.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    Aucun type d'intervention configuré.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {interventionTypes.map((option) => {
                        const active = type === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setType(type === option.id ? "" : option.id)}
                            className={`
                              flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border-2
                              transition-all duration-200 transform hover:scale-105 hover:shadow-md
                              ${getColorClasses(option.color, active)}
                            `}
                          >
                            {renderIcon(option.iconName)}
                            <span className="truncate">{option.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-start gap-2 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-sm">💡</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {!type
                          ? "Sélectionnez un type d'intervention pour continuer"
                          : "Type d'intervention sélectionné"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Temps estimé
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-16 py-4 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                      value={estimatedDurationMin}
                      onChange={(e) => setEstimatedDurationMin(parseInt(e.target.value) || 60)}
                      min="15"
                      step="15"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm font-medium">
                      min
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Créneau prévu
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="datetime-local"
                      className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                      value={scheduledStart}
                      onChange={(e) => setScheduledStart(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Statut
                </label>
                <div className="relative max-w-md">
                  <select
                    className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all appearance-none"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {selectedStatus && (
                    <div className={`absolute right-4 top-1/2 transform -translate-y-1/2 px-2 py-1 rounded-lg text-xs font-medium ${selectedStatus.color}`}>
                      {selectedStatus.label}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Description / Notes
                </label>
                <textarea
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all resize-none"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails de l'intervention, matériel nécessaire, consignes particulières..."
                />
              </div>
            </div>
          </section>

          {/* Informations client */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <User className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Informations client</h2>
                <p className="text-slate-600">Coordonnées et contact du client</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Nom du client *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: M. Dupont"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="01 23 45 67 89"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@example.com"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Adresse */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Adresse d'intervention</h2>
                  <p className="text-slate-600">Localisation précise de l'intervention</p>
                </div>
              </div>
              <button
                type="button"
                onClick={geocodeAddress}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-sm font-medium transition-all disabled:opacity-50"
                disabled={!addressState.address || !addressState.city}
                title="Géocoder l'adresse manuellement"
              >
                📍 Géocoder
              </button>
            </div>
            
            {/* Recherche Google Places */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  🔍 Recherche d'adresse (Google Places)
                </label>
                <GoogleAddressInput
                  onAddressSelect={handleGooglePlacesSelect}
                  placeholder="Tapez une adresse pour autocomplétion..."
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all"
                  initialValue={addressState.fullAddress}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Commencez à taper pour voir les suggestions d'adresses. Les champs ci-dessous seront remplis automatiquement.
                </p>

                {/* Affichage de l'adresse sélectionnée */}
                {addressState.fullAddress && addressState.isGooglePlaces && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-emerald-800 mb-1">
                          ✅ Adresse sélectionnée via Google Places
                        </p>
                        <p className="text-emerald-700">{addressState.fullAddress}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          clearAddress();
                          setShowManualAddress(true);
                        }}
                        className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all font-medium"
                      >
                        🗑️ Effacer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle pour saisie manuelle */}
              {!addressState.fullAddress && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                  <input
                    type="checkbox"
                    id="manual-address"
                    className="h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
                    checked={showManualAddress}
                    onChange={(e) => setShowManualAddress(e.target.checked)}
                  />
                  <label htmlFor="manual-address" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Saisir l'adresse manuellement
                  </label>
                </div>
              )}

              {/* Champs manuels */}
              {showManualAddress && !addressState.isGooglePlaces && (
                <div className="space-y-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Adresse complète *
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all"
                      value={addressState.address}
                      onChange={(e) => handleManualChange('address', e.target.value)}
                      placeholder="Ex: 15 rue de la Paix"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Ville *
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all"
                        value={addressState.city}
                        onChange={(e) => handleManualChange('city', e.target.value)}
                        placeholder="Ex: Paris"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Code postal
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all"
                        value={addressState.zip}
                        onChange={(e) => handleManualChange('zip', e.target.value)}
                        placeholder="Ex: 75001"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all"
                        value={addressState.lat ?? ""}
                        onChange={(e) => handleManualChange('lat', e.target.value === "" ? null : Number(e.target.value))}
                        placeholder="48.8566"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all"
                        value={addressState.lng ?? ""}
                        onChange={(e) => handleManualChange('lng', e.target.value === "" ? null : Number(e.target.value))}
                        placeholder="2.3522"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Indicateur de géocodage */}
              {(addressState.lat && addressState.lng) && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-800">
                        Adresse géocodée avec succès
                      </p>
                      <p className="text-xs text-emerald-600">
                        Coordonnées : {addressState.lat.toFixed(5)}, {addressState.lng.toFixed(5)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Tarification */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                <Euro className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Tarification</h2>
                <p className="text-slate-600">Prix et rémunération (optionnel)</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Prix total client
                </label>
                <div className="relative">
                  <Euro className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-12 py-4 text-slate-900 placeholder-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none transition-all"
                    value={priceTotalCents ? (priceTotalCents / 100).toFixed(2) : ""}
                    onChange={(e) => setPriceTotalCents(e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null)}
                    placeholder="150.00"
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm font-medium">
                    €
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Part sous-traitant
                </label>
                <div className="relative">
                  <Wrench className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-12 py-4 text-slate-900 placeholder-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none transition-all"
                    value={priceSubcontractorCents ? (priceSubcontractorCents / 100).toFixed(2) : ""}
                    onChange={(e) => setPriceSubcontractorCents(e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null)}
                    placeholder="120.00"
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm font-medium">
                    €
                  </span>
                </div>
              </div>
            </div>

            {/* Calcul automatique */}
            {priceTotalCents && priceSubcontractorCents && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-blue-800">Marge Nexus Clim :</span>
                  <span className="font-bold text-blue-900">
                    {((priceTotalCents - priceSubcontractorCents) / 100).toFixed(2)} €
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-blue-600 mt-1">
                  <span>Pourcentage :</span>
                  <span>
                    {(((priceTotalCents - priceSubcontractorCents) / priceTotalCents) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Actions */}
          <section className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-3xl p-8 text-white shadow-2xl">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold mb-2">Finaliser la mission</h3>
              <p className="text-slate-300">Choisissez comment sauvegarder votre mission</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={() => nav(-1)}
                className="px-8 py-4 border-2 border-white/20 text-white rounded-2xl font-semibold hover:bg-white/10 transition-all backdrop-blur-sm disabled:opacity-50"
                disabled={busy}
              >
                Annuler
              </button>
              
              <button
                type="button"
                onClick={(e) => onSubmit(e as any, true)}
                disabled={busy}
                className="inline-flex items-center gap-3 px-8 py-4 bg-amber-600 text-white rounded-2xl font-semibold hover:bg-amber-700 transition-all transform hover:scale-105 shadow-xl disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {busy ? "Sauvegarde..." : "Sauvegarder en brouillon"}
              </button>
              
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 shadow-xl disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                {busy ? "Création..." : "Créer la mission"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}