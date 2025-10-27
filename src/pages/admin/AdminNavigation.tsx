import { useEffect, useState } from "react";
import { Settings, Users, User, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { setRoleNavVisibility, setUserNavPreference } from "@/api/nav";
import { BackButton } from "@/components/navigation/BackButton";

type NavItem = {
  key: string;
  label: string;
  route: string;
  category: string | null;
  icon: string | null;
  order_index: number;
};

const ROLES = [
  { value: "admin", label: "Administrateur" },
  { value: "sal", label: "Commercial" },
  { value: "tech", label: "Technicien" },
  { value: "st", label: "Sous-traitant" },
  { value: "client", label: "Client" }
];

export default function AdminNavigation() {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("sal");
  const [roleMatrix, setRoleMatrix] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string>("");
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState<string | null>(null);

  // 🔹 Charger la liste des items (nav_items)
  useEffect(() => {
    loadNav();
  }, []);

  async function loadNav() {
    setLoading(true);
    const { data, error } = await supabase
      .from("nav_items")
      .select("key,label,route,category,icon,order_index")
      .order("order_index");

    if (error) console.error("Erreur chargement nav_items:", error.message);
    setNavItems(data ?? []);
    setLoading(false);
  }

  // 🔹 Charger les droits d’un rôle
  useEffect(() => {
    if (selectedRole) loadRole();
  }, [selectedRole]);

  async function loadRole() {
    const { data, error } = await supabase
      .from("role_nav_visibility")
      .select("nav_key, visible")
      .eq("role", selectedRole);

    if (error) console.error("Erreur chargement rôle:", error.message);

    const map: Record<string, boolean> = {};
    (data ?? []).forEach((r) => {
      map[r.nav_key] = r.visible;
    });
    setRoleMatrix(map);
  }

  // 🔹 Modifier un item pour un rôle
  async function toggleRole(key: string, next: boolean) {
    setSavingRole(key);
    setRoleMatrix((prev) => ({ ...prev, [key]: next }));
    await setRoleNavVisibility(selectedRole, key, next);
    setSavingRole(null);
  }

  // 🔹 Charger les préférences d’un utilisateur
  async function loadUser() {
    if (!userId) return;
    const { data, error } = await supabase
      .from("nav_preferences")
      .select("nav_key, visible")
      .eq("user_id", userId);

    if (error) console.error("Erreur chargement utilisateur:", error.message);

    const map: Record<string, boolean> = {};
    (data ?? []).forEach((r) => {
      map[r.nav_key] = r.visible;
    });
    setUserOverrides(map);
  }

  // 🔹 Modifier un item pour un utilisateur
  async function toggleUser(key: string, next: boolean) {
    setSavingUser(key);
    setUserOverrides((prev) => ({ ...prev, [key]: next }));
    await setUserNavPreference(userId, key, next);
    setSavingUser(null);
  }

  // 🧭 Interface
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        <BackButton to="/admin/pilotage" label="Retour au Pilotage" />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Gestion de la Navigation
          </h1>
          <p className="text-gray-600">
            Configurez les menus visibles par rôle ou personnalisez pour un utilisateur spécifique
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {!loading && (
          <>
            {/* ===== Section 1 : PAR RÔLE ===== */}
            <section className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Visibilité par Rôle</h2>
                    <p className="text-sm text-gray-600">
                      Définissez les éléments de menu accessibles pour chaque rôle
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Rôle :</label>
                  <select
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {navItems.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={roleMatrix[item.key] ?? true}
                        onChange={(e) => toggleRole(item.key, e.target.checked)}
                        disabled={savingRole === item.key}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.label}</div>
                        <div className="text-xs text-gray-500">{item.route}</div>
                      </div>
                      {savingRole === item.key && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </section>

            {/* ===== Section 2 : PAR UTILISATEUR ===== */}
            <section className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Personnalisation Utilisateur
                    </h2>
                    <p className="text-sm text-gray-600">
                      Personnalisez le menu pour un utilisateur spécifique (écrase les permissions du rôle)
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="UUID de l'utilisateur"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  />
                  <button
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    onClick={loadUser}
                  >
                    Charger
                  </button>
                </div>
              </div>

              {userId && (
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {navItems.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={userOverrides[item.key] ?? (roleMatrix[item.key] ?? true)}
                          onChange={(e) => toggleUser(item.key, e.target.checked)}
                          disabled={savingUser === item.key}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.label}</div>
                          <div className="text-xs text-gray-500">{item.route}</div>
                        </div>
                        {savingUser === item.key && (
                          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
