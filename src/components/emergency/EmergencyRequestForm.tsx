import { useState } from "react";
import { AlertCircle, Phone, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface EmergencyRequestFormProps {
  clientId: string;
  onSuccess: () => void;
}

export function EmergencyRequestForm({ clientId, onSuccess }: EmergencyRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [description, setDescription] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [acceptsQuote, setAcceptsQuote] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const requestNumber = `DEP-${new Date().getFullYear()}-${String(
        Math.floor(Math.random() * 9999) + 1
      ).padStart(4, "0")}`;

      const { error: insertError } = await supabase
        .from("emergency_requests")
        .insert({
          request_number: requestNumber,
          client_id: clientId,
          description: description.trim(),
          equipment_type: equipmentType,
          symptoms: symptoms.trim() || null,
          contact_phone: phoneNumber.trim(),
          intervention_address: address.trim(),
          accepts_quote_before: acceptsQuote,
          status: "pending",
          priority: "high",
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error("Error creating emergency request:", err);
      setError(err.message || "Erreur lors de la création de la demande");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-green-900 mb-2">Demande envoyée !</h3>
        <p className="text-green-700">
          Nous vous contacterons dans les plus brefs délais.
        </p>
        <p className="text-sm text-green-600 mt-4">
          Un technicien prendra contact avec vous sous 48h maximum.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-orange-900 mb-1">
            Dépannage Express - Intervention sous 48h
          </h3>
          <p className="text-sm text-orange-700">
            Complétez ce formulaire et nous vous contacterons rapidement pour planifier
            l'intervention.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type d'équipement en panne *
        </label>
        <select
          required
          value={equipmentType}
          onChange={(e) => setEquipmentType(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Sélectionnez...</option>
          <option value="climatisation">Climatisation</option>
          <option value="pompe_chaleur">Pompe à chaleur</option>
          <option value="chaudiere">Chaudière</option>
          <option value="ventilation">Ventilation</option>
          <option value="autre">Autre</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description du problème *
        </label>
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Décrivez le problème rencontré..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Symptômes observés
        </label>
        <input
          type="text"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Ex: bruit anormal, fuite, absence de chauffage..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Phone className="w-4 h-4 inline mr-1" />
          Téléphone de contact *
        </label>
        <input
          type="tel"
          required
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="06 XX XX XX XX"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <MapPin className="w-4 h-4 inline mr-1" />
          Adresse d'intervention *
        </label>
        <textarea
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Adresse complète"
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptsQuote}
            onChange={(e) => setAcceptsQuote(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-gray-700">
            J'accepte de recevoir un devis avant toute intervention. Dans certains cas,
            des frais de déplacement et de diagnostic peuvent s'appliquer.
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <AlertCircle className="w-5 h-5" />
        {loading ? "Envoi en cours..." : "Envoyer la demande"}
      </button>

      <p className="text-xs text-gray-500 text-center">
        En envoyant cette demande, vous acceptez d'être contacté par notre équipe
        technique dans les plus brefs délais.
      </p>
    </form>
  );
}
