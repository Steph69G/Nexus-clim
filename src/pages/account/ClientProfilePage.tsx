import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/ui/toast/ToastProvider";
import { User, Phone, Settings, Building2, Bell } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import GoogleAddressInput from "@/components/GoogleAddressInput";
import { Link } from "react-router-dom";

export default function ClientProfilePage() {
  const { profile, loading, save } = useProfile();
  const { push } = useToast();

  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [clientType, setClientType] = useState<"particulier" | "professionnel">("particulier");
  const [companyName, setCompanyName] = useState("");
  const [siret, setSiret] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [homeZip, setHomeZip] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [useHomeForBilling, setUseHomeForBilling] = useState(true);
  const [billingAddress, setBillingAddress] = useState("");
  const [billingZip, setBillingZip] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [fullHomeGoogleAddress, setFullHomeGoogleAddress] = useState("");
  const [fullBillingGoogleAddress, setFullBillingGoogleAddress] = useState("");
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLng, setHomeLng] = useState<number | null>(null);
  const [billingLat, setBillingLat] = useState<number | null>(null);
  const [billingLng, setBillingLng] = useState<number | null>(null);

  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const [clientData, setClientData] = useState<any>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    loadClientData();
  }, [profile]);

  async function loadClientData() {
    if (!profile?.user_id) return;

    const { data, error } = await supabase
      .from("user_clients")
      .select("*")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    if (error) {
      console.error("Error loading client data:", error);
      return;
    }

    if (data) {
      setClientData(data);
      setClientType(data.client_type || "particulier");
      setCompanyName(data.company_name || "");
      setSiret(data.siret || "");
      setVatNumber(data.vat_number || "");
      setHomeAddress(data.home_address || "");
      setHomeZip(data.home_zip || "");
      setHomeCity(data.home_city || "");
      setUseHomeForBilling(data.use_home_for_billing ?? true);
      setBillingAddress(data.billing_address || "");
      setBillingZip(data.billing_zip || "");
      setBillingCity(data.billing_city || "");
      setNotes(data.notes || "");

      if (data.home_address && data.home_city) {
        setFullHomeGoogleAddress(`${data.home_address}, ${data.home_city}`);
      }
      if (data.billing_address && data.billing_city) {
        setFullBillingGoogleAddress(`${data.billing_address}, ${data.billing_city}`);
      }
    }
  }

  function handleHomeAddressSelect(addressData: {
    address: string;
    city: string;
    zip: string;
    lat: number;
    lng: number;
  }) {
    setHomeAddress(addressData.address);
    setHomeCity(addressData.city);
    setHomeZip(addressData.zip);
    setHomeLat(addressData.lat);
    setHomeLng(addressData.lng);
    setFullHomeGoogleAddress(`${addressData.address}, ${addressData.city}`);
    push({ type: "success", message: "Adresse de domicile sélectionnée" });
  }

  function handleBillingAddressSelect(addressData: {
    address: string;
    city: string;
    zip: string;
    lat: number;
    lng: number;
  }) {
    setBillingAddress(addressData.address);
    setBillingCity(addressData.city);
    setBillingZip(addressData.zip);
    setBillingLat(addressData.lat);
    setBillingLng(addressData.lng);
    setFullBillingGoogleAddress(`${addressData.address}, ${addressData.city}`);
    push({ type: "success", message: "Adresse de facturation sélectionnée" });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ full_name, phone });

      const { error } = await supabase
        .from("user_clients")
        .upsert({
          user_id: profile?.user_id,
          client_type: clientType,
          company_name: clientType === "professionnel" ? companyName : null,
          siret: clientType === "professionnel" ? siret : null,
          vat_number: clientType === "professionnel" ? vatNumber : null,
          home_address: homeAddress,
          home_zip: homeZip,
          home_city: homeCity,
          use_home_for_billing: useHomeForBilling,
          billing_address: useHomeForBilling ? null : billingAddress,
          billing_zip: useHomeForBilling ? null : billingZip,
          billing_city: useHomeForBilling ? null : billingCity,
          notes,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      push({ type: "success", message: "Profil enregistré" });
      await loadClientData();
    } catch (err: any) {
      push({ type: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwd1 !== pwd2) {
      push({ type: "error", message: "Les mots de passe ne correspondent pas" });
      return;
    }
    if (pwd1.length < 6) {
      push({ type: "error", message: "Mot de passe trop court (min 6 caractères)" });
      return;
    }
    setPwdBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd1 });
      if (error) throw error;
      push({ type: "success", message: "Mot de passe changé" });
      setPwd1("");
      setPwd2("");
    } catch (err: any) {
      push({ type: "error", message: err.message });
    } finally {
      setPwdBusy(false);
    }
  }

  async function onChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.includes("@")) {
      push({ type: "error", message: "Email invalide" });
      return;
    }
    setEmailBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      push({ type: "success", message: "Email modifié (vérification requise)" });
      setNewEmail("");
    } catch (err: any) {
      push({ type: "error", message: err.message });
    } finally {
      setEmailBusy(false);
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            Mon Profil Client
          </h1>
          <p className="text-slate-600 mt-1">Gérez vos informations personnelles et de facturation</p>
        </div>

        <div className="grid gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="mb-6">
              <ProfileAvatar />
            </div>

            <form onSubmit={onSave} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={full_name}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type de client
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="particulier"
                      checked={clientType === "particulier"}
                      onChange={(e) => setClientType(e.target.value as "particulier")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-slate-700">Particulier</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="professionnel"
                      checked={clientType === "professionnel"}
                      onChange={(e) => setClientType(e.target.value as "professionnel")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-slate-700">Professionnel</span>
                  </label>
                </div>
              </div>

              {clientType === "professionnel" && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    Informations entreprise
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nom entreprise
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        SIRET
                      </label>
                      <input
                        type="text"
                        value={siret}
                        onChange={(e) => setSiret(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Numéro TVA
                    </label>
                    <input
                      type="text"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-medium text-slate-900">Adresse de domicile</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Recherche d'adresse (Google Places)
                  </label>
                  <GoogleAddressInput
                    key={fullHomeGoogleAddress || "empty-home"}
                    onAddressSelect={handleHomeAddressSelect}
                    placeholder="Tapez une adresse..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    initialValue={fullHomeGoogleAddress}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Commencez à taper pour voir les suggestions. Les champs seront remplis automatiquement.
                  </p>
                  {fullHomeGoogleAddress && (
                    <div className="mt-4 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl shadow-lg animate-[pulse_0.5s_ease-in-out_2]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">✅</span>
                            <p className="text-lg font-bold text-green-800">
                              Adresse sélectionnée et géocodée avec succès !
                            </p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-green-900">
                              <span className="font-semibold">📍 Adresse complète :</span>
                              <span className="text-green-700">{homeAddress}</span>
                            </div>
                            <div className="flex items-center gap-2 text-green-900">
                              <span className="font-semibold">🏙️ Ville :</span>
                              <span className="text-green-700">{homeCity}</span>
                            </div>
                            {homeZip && (
                              <div className="flex items-center gap-2 text-green-900">
                                <span className="font-semibold">📮 Code postal :</span>
                                <span className="text-green-700">{homeZip}</span>
                              </div>
                            )}
                            {homeLat && homeLng && (
                              <div className="flex items-center gap-2 text-green-900 text-sm">
                                <span className="font-semibold">🌍 Coordonnées GPS :</span>
                                <span className="text-green-600 font-mono">{homeLat.toFixed(6)}, {homeLng.toFixed(6)}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 p-3 bg-white/60 rounded-xl border border-green-200">
                            <p className="text-xs text-green-700 font-medium">
                              💡 Les champs ci-dessous ont été automatiquement remplis. N'oubliez pas de cliquer sur "Enregistrer le profil" en bas de page pour sauvegarder.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFullHomeGoogleAddress("");
                            setHomeAddress("");
                            setHomeCity("");
                            setHomeZip("");
                            setHomeLat(null);
                            setHomeLng(null);
                          }}
                          className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        >
                          Effacer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    placeholder="12 Rue de la République"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Code postal
                    </label>
                    <input
                      type="text"
                      value={homeZip}
                      onChange={(e) => setHomeZip(e.target.value)}
                      placeholder="75001"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Ville
                    </label>
                    <input
                      type="text"
                      value={homeCity}
                      onChange={(e) => setHomeCity(e.target.value)}
                      placeholder="Paris"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-medium text-slate-900">Adresse de facturation</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useHomeForBilling}
                    onChange={(e) => setUseHomeForBilling(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">Identique à l'adresse de domicile</span>
                </label>

                {!useHomeForBilling && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Recherche d'adresse (Google Places)
                      </label>
                      <GoogleAddressInput
                        key={fullBillingGoogleAddress || "empty-billing"}
                        onAddressSelect={handleBillingAddressSelect}
                        placeholder="Tapez une adresse..."
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        initialValue={fullBillingGoogleAddress}
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Commencez à taper pour voir les suggestions. Les champs seront remplis automatiquement.
                      </p>
                      {fullBillingGoogleAddress && (
                        <div className="mt-4 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl shadow-lg animate-[pulse_0.5s_ease-in-out_2]">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">✅</span>
                                <p className="text-lg font-bold text-green-800">
                                  Adresse sélectionnée et géocodée avec succès !
                                </p>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-green-900">
                                  <span className="font-semibold">📍 Adresse complète :</span>
                                  <span className="text-green-700">{billingAddress}</span>
                                </div>
                                <div className="flex items-center gap-2 text-green-900">
                                  <span className="font-semibold">🏙️ Ville :</span>
                                  <span className="text-green-700">{billingCity}</span>
                                </div>
                                {billingZip && (
                                  <div className="flex items-center gap-2 text-green-900">
                                    <span className="font-semibold">📮 Code postal :</span>
                                    <span className="text-green-700">{billingZip}</span>
                                  </div>
                                )}
                                {billingLat && billingLng && (
                                  <div className="flex items-center gap-2 text-green-900 text-sm">
                                    <span className="font-semibold">🌍 Coordonnées GPS :</span>
                                    <span className="text-green-600 font-mono">{billingLat.toFixed(6)}, {billingLng.toFixed(6)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-3 p-3 bg-white/60 rounded-xl border border-green-200">
                                <p className="text-xs text-green-700 font-medium">
                                  💡 Les champs ci-dessous ont été automatiquement remplis. N'oubliez pas de cliquer sur "Enregistrer le profil" en bas de page pour sauvegarder.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFullBillingGoogleAddress("");
                                setBillingAddress("");
                                setBillingCity("");
                                setBillingZip("");
                                setBillingLat(null);
                                setBillingLng(null);
                              }}
                              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            >
                              Effacer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Adresse
                      </label>
                      <input
                        type="text"
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        placeholder="12 Rue de la République"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Code postal
                        </label>
                        <input
                          type="text"
                          value={billingZip}
                          onChange={(e) => setBillingZip(e.target.value)}
                          placeholder="75001"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Ville
                        </label>
                        <input
                          type="text"
                          value={billingCity}
                          onChange={(e) => setBillingCity(e.target.value)}
                          placeholder="Paris"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "Enregistrement..." : "Enregistrer le profil"}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Modifier le mot de passe</h3>
            <form onSubmit={onChangePassword} className="space-y-4">
              <input
                type="password"
                placeholder="Nouveau mot de passe"
                value={pwd1}
                onChange={(e) => setPwd1(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="password"
                placeholder="Confirmer le mot de passe"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={pwdBusy}
                className="w-full bg-slate-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {pwdBusy ? "Modification..." : "Changer le mot de passe"}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Modifier l'email</h3>
            <form onSubmit={onChangeEmail} className="space-y-4">
              <input
                type="email"
                placeholder="Nouvelle adresse email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={emailBusy}
                className="w-full bg-slate-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {emailBusy ? "Modification..." : "Changer l'email"}
              </button>
            </form>
          </div>

          <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">Préférences de notifications</h3>
                  <p className="text-sm text-slate-600">Gérez vos canaux et types de notifications</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Personnalisez la manière dont vous recevez les notifications pour vos demandes, contrats et factures.
            </p>
            <Link
              to="/account/notifications"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
            >
              <Bell className="w-4 h-4" />
              Configurer mes notifications
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
