import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import GoogleAddressInput from "@/components/GoogleAddressInput";
import { useToast } from "@/ui/toast/ToastProvider";
import { User, Phone, MapPin, Shield, Mail, Camera, Settings } from "lucide-react";
import { mapDbRoleToUi } from "@/lib/roles";
import SubPageLayout from "@/layouts/SubPageLayout";

type Profile = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  radius_km: number | null;
  role: string | null;
  avatar_url: string | null;
};

export default function AdminUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { push } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [displayMode, setDisplayMode] = useState<"address" | "gps" | "hidden">("address");
  const [shareLocation, setShareLocation] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [fullGoogleAddress, setFullGoogleAddress] = useState("");

  useEffect(() => {
    if (!userId) return;
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        push({ type: "error", message: "Utilisateur introuvable" });
        navigate("/admin/users");
        return;
      }

      setProfile(data);
      setFullName(data.full_name ?? "");
      setPhone(data.phone ?? "");
      setCity(data.city ?? "");
      setAddress(data.address ?? "");
      setZip(data.zip ?? "");
      setLat(data.lat ?? null);
      setLng(data.lng ?? null);
      setRadiusKm(data.radius_km ?? 25);
      setDisplayMode((data.display_mode as "address" | "gps" | "hidden") ?? "address");
      setShareLocation(data.share_location ?? false);

      if (data.address && data.city) {
        setFullGoogleAddress(`${data.address}, ${data.city}`);
      }
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur de chargement" });
    } finally {
      setLoading(false);
    }
  }

  function handleAddressSelect(addressData: {
    address: string;
    city: string;
    zip: string;
    lat: number;
    lng: number;
  }) {
    setAddress(addressData.address);
    setCity(addressData.city);
    setZip(addressData.zip);
    setLat(addressData.lat);
    setLng(addressData.lng);
    setFullGoogleAddress(`${addressData.address}, ${addressData.city}`);
    push({
      type: "success",
      message: "Adresse sélectionnée et géocodée automatiquement !"
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name,
          phone,
          city,
          address,
          zip,
          lat,
          lng,
          radius_km: radiusKm,
          display_mode: displayMode
        })
        .eq("user_id", userId);

      if (error) throw error;

      if (profile?.role === "client") {
        const { error: clientError } = await supabase
          .from("user_clients")
          .upsert({
            user_id: userId,
            home_address: address,
            home_city: city,
            home_zip: zip
          }, {
            onConflict: 'user_id'
          });

        if (clientError) {
          console.error("Erreur sauvegarde user_clients:", clientError);
        }
      }

      push({ type: "success", message: "Profil mis à jour" });
      await loadProfile();
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur sauvegarde" });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du profil…</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const displayRole = mapDbRoleToUi(profile.role ?? "");

  return (
    <SubPageLayout fallbackPath="/admin/users" className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Profil utilisateur</h1>
          <p className="text-xl text-slate-600">{profile.email}</p>
        </div>

        <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
          <div className="flex items-center gap-8">
            <img
              src={profile.avatar_url ?? "https://placehold.co/120x120?text=Avatar"}
              alt="avatar"
              className="w-32 h-32 rounded-full object-cover border-4 border-slate-200 shadow-xl"
            />
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{profile.full_name || "Sans nom"}</h2>
              <p className="text-slate-600">{profile.email}</p>
              <span className="inline-block mt-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 text-sm font-bold rounded-full border border-purple-300">
                {displayRole}
              </span>
            </div>
          </div>
        </section>

        <form onSubmit={onSave} className="space-y-8">
          <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-slate-900">Informations personnelles</h2>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email (lecture seule)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-900"
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
                    className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                    value={full_name}
                    onChange={(e)=>setFullName(e.target.value)}
                    placeholder="Nom et prénom"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
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
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-600"
                      value={displayRole}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-slate-900">Adresse d'intervention</h2>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Recherche d'adresse (Google Places)</label>
                <GoogleAddressInput
                  onAddressSelect={handleAddressSelect}
                  placeholder="Tapez une adresse pour autocomplétion..."
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                  initialValue={fullGoogleAddress}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Commencez à taper pour voir les suggestions d'adresses
                </p>

                {fullGoogleAddress && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-blue-800 mb-1">
                          Adresse sélectionnée via Google Places
                        </p>
                        <p className="text-blue-700">{fullGoogleAddress}</p>
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
                        }}
                        className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all font-medium"
                      >
                        Effacer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Adresse complète</label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                  value={address}
                  onChange={(e)=>setAddress(e.target.value)}
                  placeholder="15 rue de la Paix"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ville</label>
                <input
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                  value={city}
                  onChange={(e)=>setCity(e.target.value)}
                  placeholder="Paris"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Code postal</label>
                  <input
                    className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                    value={zip}
                    onChange={(e)=>setZip(e.target.value)}
                    placeholder="75001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Rayon d'intervention (km)</label>
                  <select
                    className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                  >
                    <option value={10}>10 km</option>
                    <option value={15}>15 km</option>
                    <option value={20}>20 km</option>
                    <option value={25}>25 km (défaut)</option>
                    <option value={30}>30 km</option>
                    <option value={40}>40 km</option>
                    <option value={50}>50 km</option>
                    <option value={75}>75 km</option>
                    <option value={100}>100 km</option>
                  </select>
                </div>
              </div>

              {/* Mode d'affichage sur la carte (Admin) */}
              <div className="p-6 bg-blue-50 border-2 border-blue-300 rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-blue-700" />
                  <h3 className="text-lg font-semibold text-slate-900">Mode d'affichage sur la carte (Admin)</h3>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-xl border-2 border-transparent hover:border-blue-300 transition-all">
                    <input
                      type="radio"
                      name="display_mode"
                      value="address"
                      checked={displayMode === "address"}
                      onChange={(e) => setDisplayMode(e.target.value as "address")}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">📍 Afficher l'adresse fixe</div>
                      <div className="text-sm text-slate-600">Affiche la position basée sur l'adresse de domicile (moins utile)</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-xl border-2 border-transparent hover:border-blue-300 transition-all">
                    <input
                      type="radio"
                      name="display_mode"
                      value="gps"
                      checked={displayMode === "gps"}
                      onChange={(e) => setDisplayMode(e.target.value as "gps")}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">📡 Afficher la position GPS en temps réel</div>
                      <div className="text-sm text-slate-600">Position GPS mise à jour en temps réel (recommandé pour techniciens)</div>
                      {displayMode === "gps" && !shareLocation && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded-lg">
                          <p className="text-xs text-amber-800">
                            ⚠️ Attention : Cet employé n'a pas activé le partage de sa position GPS
                          </p>
                        </div>
                      )}
                      {displayMode === "gps" && shareLocation && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded-lg">
                          <p className="text-xs text-green-800">
                            ✅ Partage de position actif
                          </p>
                        </div>
                      )}
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-xl border-2 border-transparent hover:border-blue-300 transition-all">
                    <input
                      type="radio"
                      name="display_mode"
                      value="hidden"
                      checked={displayMode === "hidden"}
                      onChange={(e) => setDisplayMode(e.target.value as "hidden")}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">🚫 Ne pas afficher sur la carte</div>
                      <div className="text-sm text-slate-600">Masquer complètement cet employé de la carte</div>
                    </div>
                  </label>
                </div>
              </div>

              {(lat && lng) && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <p className="text-sm text-blue-700">
                    Adresse géocodée avec succès
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all transform hover:scale-105 shadow-xl flex items-center justify-center gap-3"
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
      </div>
    </SubPageLayout>
  );
}
