import { useState, useEffect } from "react";
import { FileText, Plus, Calendar, MapPin, Package } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";

export default function ClientRequests() {
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [usePersonalAddress, setUsePersonalAddress] = useState(false);
  const [interventionAddress, setInterventionAddress] = useState("");
  const [clientData, setClientData] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    request_type: "devis_distance",
    description: "",
    preferred_date: ""
  });
  const { profile } = useProfile();

  useEffect(() => {
    async function loadClientData() {
      if (!profile?.id) return;

      const { data, error } = await supabase
        .from("user_clients")
        .select("home_address, home_zip, home_city")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (!error && data) {
        setClientData(data);
      }
    }

    loadClientData();
  }, [profile?.id]);

  async function loadRequests() {
    if (!profile?.id) return;

    console.log("[loadRequests] Loading requests for user:", profile.id);
    setLoading(true);

    // Charger via la jointure avec client_accounts
    const { data, error } = await supabase
      .from("client_requests")
      .select(`
        *,
        client_accounts!inner(auth_user_id)
      `)
      .eq("client_accounts.auth_user_id", profile.id)
      .order("created_at", { ascending: false });

    console.log("[loadRequests] Result:", { data, error });
    if (error) {
      console.error("[loadRequests] Error:", error);
    }
    if (!error && data) {
      setRequests(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, [profile?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.id || !clientData) {
      console.error("[handleSubmit] Missing profile or clientData:", { profile: profile?.id, clientData });
      return;
    }

    setLoading(true);
    try {
      // Parse l'adresse pour extraire ville et code postal
      // Format attendu: "Rue, Code Ville" ou "Rue Code Ville"
      const addressParts = interventionAddress.split(',').map(s => s.trim());
      let street = interventionAddress;
      let zip = "";
      let city = "";

      if (addressParts.length >= 2) {
        street = addressParts[0];
        const cityZipPart = addressParts[addressParts.length - 1];
        const match = cityZipPart.match(/^(\d{5})\s+(.+)$/);
        if (match) {
          zip = match[1];
          city = match[2];
        } else {
          city = cityZipPart;
        }
      }

      // Génère un sujet automatique basé sur le type de demande
      const subjectMap: Record<string, string> = {
        devis_distance: "Demande de devis à distance",
        devis_visite: "Demande de devis avec visite",
        urgence: "Intervention urgente",
        information: "Demande d'information"
      };
      const subject = subjectMap[formData.request_type] || "Nouvelle demande";

      // S'assurer que le compte client existe (upsert)
      console.log("[handleSubmit] Ensuring client_account exists for:", profile.id);
      const { data: accountData, error: accountError } = await supabase
        .from("client_accounts")
        .upsert({
          auth_user_id: profile.id,
          email: profile.email,
          name: profile.full_name,
          phone: profile.phone || "",
          address: profile.address || "",
          city: profile.city || "",
          zip: profile.zip || ""
        }, { onConflict: "auth_user_id" })
        .select()
        .single();

      if (accountError) {
        console.error("[handleSubmit] Error upserting client_account:", accountError);
        throw new Error("Impossible de créer le compte client: " + accountError.message);
      }

      if (!accountData?.id) {
        throw new Error("Impossible de récupérer l'ID du compte client");
      }

      console.log("[handleSubmit] Client account ID:", accountData.id);

      const payload = {
        client_account_id: accountData.id,
        client_name: profile.full_name,
        client_email: profile.email,
        client_phone: profile.phone,
        client_address: street,
        client_city: city,
        client_zip: zip,
        request_type: formData.request_type,
        subject: subject,
        description: formData.description,
        preferred_date: formData.preferred_date || null,
        status: "nouveau",
        source: "portal"
      };
      console.log("[handleSubmit] Inserting request:", payload);

      const { data, error } = await supabase.from("client_requests").insert(payload).select();

      console.log("[handleSubmit] Insert result:", { data, error });
      if (error) throw error;

      console.log("[handleSubmit] Request created successfully");
      setShowNewRequestForm(false);
      setFormData({ request_type: "devis_distance", description: "", preferred_date: "" });
      setInterventionAddress("");
      setUsePersonalAddress(false);
      await loadRequests();
    } catch (err: any) {
      console.error("[handleSubmit] Error creating request:", err);
      alert("Erreur lors de la création de la demande: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Mes demandes</h1>
            <p className="text-slate-600">
              Consultez et gérez vos demandes de devis et interventions
            </p>
          </div>
          <button
            onClick={() => setShowNewRequestForm(!showNewRequestForm)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Nouvelle demande
          </button>
        </div>

        {showNewRequestForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Nouvelle demande
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type de demande
                </label>
                <select
                  value={formData.request_type}
                  onChange={(e) => setFormData({...formData, request_type: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="devis_distance">Demande de devis à distance</option>
                  <option value="devis_visite">Demande de devis avec visite</option>
                  <option value="urgence">Intervention urgente</option>
                  <option value="information">Demande d'information</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Décrivez votre besoin en détail..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date souhaitée
                  </label>
                  <input
                    type="date"
                    value={formData.preferred_date}
                    onChange={(e) => setFormData({...formData, preferred_date: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Adresse d'intervention
                  </label>

                  {clientData?.home_address && (
                    <label className="flex items-center gap-2 mb-2 text-sm text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={usePersonalAddress}
                        onChange={(e) => {
                          setUsePersonalAddress(e.target.checked);
                          if (e.target.checked) {
                            const fullAddress = `${clientData.home_address}, ${clientData.home_zip} ${clientData.home_city}`;
                            setInterventionAddress(fullAddress);
                          } else {
                            setInterventionAddress("");
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      Utiliser mon adresse personnelle
                    </label>
                  )}

                  <input
                    type="text"
                    placeholder="Adresse de l'intervention"
                    value={interventionAddress}
                    onChange={(e) => {
                      setInterventionAddress(e.target.value);
                      setUsePersonalAddress(false);
                    }}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Envoi en cours..." : "Envoyer la demande"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewRequestForm(false)}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            Historique des demandes
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-slate-600 mt-4">Chargement...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Aucune demande pour le moment
              </h3>
              <p className="text-slate-600 mb-4">
                Créez votre première demande pour commencer
              </p>
              <button
                onClick={() => setShowNewRequestForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Nouvelle demande
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="p-6 border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg mb-1">
                        {request.request_type === "devis_distance" && "Demande de devis à distance"}
                        {request.request_type === "devis_visite" && "Demande de devis avec visite"}
                        {request.request_type === "urgence" && "Intervention urgente"}
                        {request.request_type === "information" && "Demande d'information"}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Créée le {new Date(request.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      request.status === "nouveau" ? "bg-yellow-100 text-yellow-700" :
                      request.status === "en_cours" ? "bg-blue-100 text-blue-700" :
                      request.status === "devis_envoyé" ? "bg-purple-100 text-purple-700" :
                      request.status === "rdv_planifié" ? "bg-indigo-100 text-indigo-700" :
                      request.status === "accepté" ? "bg-green-100 text-green-700" :
                      request.status === "terminé" ? "bg-green-100 text-green-700" :
                      request.status === "annulé" ? "bg-red-100 text-red-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>
                      {request.status === "nouveau" && "Nouveau"}
                      {request.status === "en_cours" && "En cours"}
                      {request.status === "devis_envoyé" && "Devis envoyé"}
                      {request.status === "rdv_planifié" && "RDV planifié"}
                      {request.status === "accepté" && "Accepté"}
                      {request.status === "terminé" && "Terminé"}
                      {request.status === "annulé" && "Annulé"}
                    </span>
                  </div>

                  <p className="text-slate-700 mb-3">{request.description}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    {request.client_address && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {request.client_address}
                      </div>
                    )}
                    {request.preferred_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(request.preferred_date).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
