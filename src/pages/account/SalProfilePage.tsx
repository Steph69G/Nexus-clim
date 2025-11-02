import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import GoogleAddressInput from "@/components/GoogleAddressInput";
import { useToast } from "@/ui/toast/ToastProvider";
import { User, Phone, MapPin, Shield, Mail, Camera, Settings } from "lucide-react";
import PreferencesCard from "./PreferencesCard";

export default function SalProfilePage() {
  const { profile, loading, err, save, changeAvatar } = useProfile();
  const { push } = useToast();

  // champs profil
  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationMode, setLocationMode] = useState<"fixed_address" | "gps_realtime">("gps_realtime");
  const [busy, setBusy] = useState(false);

  // bloc mot de passe
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);

  // bloc email
  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  // État pour l'adresse Google sélectionnée
  const [fullGoogleAddress, setFullGoogleAddress] = useState("");

  // sync champs profil à l'arrivée des données
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setCity(profile.city ?? "");
    setAddress(profile.address ?? "");
    setZip(profile.zip ?? "");
    setLat(profile.lat ?? null);
    setLng(profile.lng ?? null);
    setLocationMode((profile.location_mode as "fixed_address" | "gps_realtime") ?? "gps_realtime");
    
    // Reconstituer l'adresse Google si possible
    if (profile.address && profile.city) {
      setFullGoogleAddress(`${profile.address}, ${profile.city}`);
    } else {
      setFullGoogleAddress("");
    }
  }, [profile]);

  // Callback pour Google Places
  function handleAddressSelect(addressData: {
    address: string;
    city: string;
    zip: string;
    lat: number;
    lng: number;
  }) {
    console.log("Google Places data received:", addressData);
    setAddress(addressData.address);
    setCity(addressData.city);
    setZip(addressData.zip);
    setLat(addressData.lat);
    setLng(addressData.lng);
    
    // Mettre à jour l'affichage Google
    setFullGoogleAddress(`${addressData.address}, ${addressData.city}`);
    
    // Feedback visuel immédiat
    push({ 
      type: "success", 
      message: "Adresse sélectionnée et géocodée automatiquement !" 
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({
        full_name,
        phone,
        city,
        address,
        zip,
        lat,
        lng,
        location_mode: locationMode
      });
      push({ type: "success", message: "Profil mis à jour ✅" });
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur sauvegarde" });
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      await changeAvatar(f);
      push({ type: "success", message: "Avatar mis à jour ✅" });
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur upload avatar" });
    } finally {
      setBusy(false);
    }
  }

  // --- Changer mot de passe ---
  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwd1.length < 8) return push({ type: "error", message: "Mot de passe trop court (min 8 caractères)" });
    if (pwd1 !== pwd2) return push({ type: "error", message: "Les mots de passe ne correspondent pas" });
    setPwdBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd1 });
      if (error) throw error;
      setPwd1(""); setPwd2("");
      push({ type: "success", message: "Mot de passe modifié ✅" });
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur changement mot de passe" });
    } finally {
      setPwdBusy(false);
    }
  }

  // --- Changer email ---
  async function onChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.includes("@")) return push({ type: "error", message: "Email invalide" });
    setEmailBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setNewEmail("");
      push({ type: "success", message: "Email modifié. Vérifiez votre boîte mail pour confirmer." });
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur changement d'email" });
    } finally {
      setEmailBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du profil…</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Erreur</h2>
          <p className="text-red-600">{err}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Connexion requise</h2>
          <p className="text-amber-600">Connectez-vous pour voir votre profil.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Header SAL */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Profil Salarié</h1>
          <p className="text-xl text-slate-600">Gérez vos informations personnelles et préférences</p>
        </div>

        {/* Avatar Section */}
        <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Camera className="w-6 h-6 text-violet-600" />
            <h2 className="text-2xl font-semibold text-slate-900">Photo de profil</h2>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <img
                src={profile.avatar_url ?? "https://placehold.co/120x120?text=Avatar"}
                alt="avatar"
                className="w-32 h-32 rounded-full object-cover border-4 border-slate-200 shadow-xl group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="text-center md:text-left">
              <label className="inline-flex items-center gap-3 bg-violet-600 text-white px-6 py-3 rounded-2xl cursor-pointer hover:bg-violet-700 transition-all transform hover:scale-105 shadow-xl font-medium">
                <Camera className="w-5 h-5" />
                Changer d'avatar
                <input type="file" accept="image/*" className="hidden" onChange={onFile} />
              </label>
              <p className="text-sm text-slate-600 mt-3">JPG, PNG ou WebP • Max 3 Mo</p>
            </div>
          </div>
        </section>

        <form onSubmit={onSave} className="space-y-8">
          {/* Informations personnelles */}
          <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-violet-600" />
              <h2 className="text-2xl font-semibold text-slate-900">Informations personnelles</h2>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email (actuel)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-900 placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none transition-all" 
                    value={profile.email ?? ""} 
                    disabled 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-900 placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none transition-all" 
                    value={full_name} 
                    onChange={(e)=>setFullName(e.target.value)} 
                    placeholder="Votre nom et prénom"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-900 placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none transition-all" 
                      value={phone} 
                      onChange={(e)=>setPhone(e.target.value)} 
                      placeholder="01 23 45 67 89"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Rôle</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-600 placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none transition-all" 
                      value={profile.role ?? "—"} 
                      disabled 
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Adresse */}
          <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="w-6 h-6 text-violet-600" />
              <h2 className="text-2xl font-semibold text-slate-900">Localisation</h2>
            </div>
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <label className="block text-sm font-medium text-slate-700 mb-3">Mode de localisation</label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="location_mode"
                      value="fixed_address"
                      checked={locationMode === "fixed_address"}
                      onChange={(e) => setLocationMode(e.target.value as "fixed_address")}
                      className="mt-1 w-4 h-4 text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <div className="font-medium text-slate-900">Adresse fixe</div>
                      <div className="text-sm text-slate-600">Position basée sur l'adresse professionnelle</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="location_mode"
                      value="gps_realtime"
                      checked={locationMode === "gps_realtime"}
                      onChange={(e) => setLocationMode(e.target.value as "gps_realtime")}
                      className="mt-1 w-4 h-4 text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <div className="font-medium text-slate-900">GPS temps réel</div>
                      <div className="text-sm text-slate-600">Position mise à jour via GPS mobile (recommandé pour salariés)</div>
                    </div>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">🔍 Recherche d'adresse (Google Places)</label>
                <GoogleAddressInput
                  key={fullGoogleAddress || "empty"}
                  onAddressSelect={handleAddressSelect}
                  placeholder="Tapez une adresse pour autocomplétion..."
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none transition-all"
                  initialValue={fullGoogleAddress}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Commencez à taper pour voir les suggestions d'adresses. Les champs ci-dessous seront remplis automatiquement.
                </p>
                
                {/* Affichage de l'adresse sélectionnée */}
                {fullGoogleAddress && (
                  <div className="mt-4 p-4 bg-violet-50 border border-violet-200 rounded-2xl">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-violet-800 mb-1">
                          ✅ Adresse sélectionnée via Google Places
                        </p>
                        <p className="text-violet-700">{fullGoogleAddress}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFullGoogleAddress("");
                          setAddress("");
                          setCity("");
                          setZip("");
                          setLat(null);
                          setLng(null);
                          push({ type: "info", message: "Adresse effacée" });
                        }}
                        className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all font-medium"
                      >
                        🗑️ Effacer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Adresse complète</label>
                <input 
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none transition-all" 
                  value={address} 
                  onChange={(e)=>setAddress(e.target.value)} 
                  placeholder="15 rue de la Paix"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ville</label>
                <input 
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none transition-all" 
                  value={city} 
                  onChange={(e)=>setCity(e.target.value)} 
                  placeholder="Paris"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Code postal</label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none transition-all"
                  value={zip}
                  onChange={(e)=>setZip(e.target.value)}
                  placeholder="75001"
                />
              </div>

              {/* Indicateur de géocodage */}
              {(lat && lng) && (
                <div className="p-4 bg-violet-50 border border-violet-200 rounded-2xl">
                  <p className="text-sm text-violet-700">
                    ✅ Adresse géocodée avec succès (coordonnées enregistrées automatiquement)
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-8">
              <button 
                disabled={busy} 
                className="w-full bg-violet-600 text-white py-4 rounded-2xl font-semibold hover:bg-violet-700 disabled:opacity-50 transition-all transform hover:scale-105 shadow-xl flex items-center justify-center gap-3"
              >
                {busy ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Enregistrement…
                  </>
                ) : (
                  <>
                    <Settings className="w-5 h-5" />
                    Enregistrer les modifications
                  </>
                )}
              </button>
            </div>
          </section>
        </form>

        {/* Préférences */}
        <PreferencesCard />

        {/* Sécurité */}
        <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-red-600" />
            <h2 className="text-2xl font-semibold text-slate-900">Sécurité</h2>
          </div>
          <form onSubmit={onChangePassword} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nouveau mot de passe</label>
                <input
                  type="password"
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none transition-all"
                  value={pwd1}
                  onChange={(e)=>setPwd1(e.target.value)}
                  placeholder="Au moins 8 caractères"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirmer le mot de passe</label>
                <input
                  type="password"
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none transition-all"
                  value={pwd2}
                  onChange={(e)=>setPwd2(e.target.value)}
                  placeholder="Répétez le mot de passe"
                />
              </div>
            </div>
            <button 
              disabled={pwdBusy} 
              className="w-full bg-violet-600 text-white py-4 rounded-2xl font-semibold hover:bg-violet-700 disabled:opacity-50 transition-all transform hover:scale-105 shadow-xl"
            >
              {pwdBusy ? "Mise à jour…" : "Modifier le mot de passe"}
            </button>
          </form>
        </section>

        {/* Email */}
        <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-6 h-6 text-violet-600" />
            <h2 className="text-2xl font-semibold text-slate-900">Adresse email</h2>
          </div>
          <form onSubmit={onChangeEmail} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nouvel email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-900 placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-none transition-all"
                  value={newEmail}
                  onChange={(e)=>setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
            </div>
            <button 
              disabled={emailBusy} 
              className="w-full bg-violet-600 text-white py-4 rounded-2xl font-semibold hover:bg-violet-700 disabled:opacity-50 transition-all transform hover:scale-105 shadow-xl"
            >
              {emailBusy ? "Envoi…" : "Changer l'email"}
            </button>
            <p className="text-xs text-slate-500">
              Un email de confirmation sera envoyé par Supabase. Le changement ne sera effectif qu'après validation.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}