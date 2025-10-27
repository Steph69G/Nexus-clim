import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { setRoleNavVisibility, setUserNavPreference } from "@/api/nav";

type NavItem = {
  key: string;
  label: string;
  route: string;
  category: string | null;
  icon: string | null;
  order_index: number;
};

const ROLES = ["admin", "sal", "st", "tech", "client"]; // 🧩 adapte à tes rôles

export default function AdminNavigation() {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("sal");
  const [roleMatrix, setRoleMatrix] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string>("");
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

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
    setRoleMatrix((prev) => ({ ...prev, [key]: next }));
    await setRoleNavVisibility(selectedRole, key, next);
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
    setUserOverrides((prev) => ({ ...prev, [key]: next }));
    await setUserNavPreference(userId, key, next);
  }

  // 🧭 Interface
  return (
    <div className="p-6 space-y-10">
      <h1 className="text-3xl font-semibold">⚙️ Gestion de la navigation</h1>

      {loading && <div className="text-slate-500">Chargement des items...</div>}

      {/* ===== Onglet 1 : PAR RÔLE ===== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-medium">👥 Visibilité par rôle</h2>
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-600">Rôle :</span>
          <select
            className="border p-2 rounded bg-white"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {navItems.map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-3 border rounded p-3 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={roleMatrix[item.key] ?? true}
                onChange={(e) => toggleRole(item.key, e.target.checked)}
              />
              <div>
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-slate-500">{item.route}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* ===== Onglet 2 : PAR UTILISATEUR ===== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-medium">👤 Personnalisation utilisateur</h2>
        <p className="text-slate-600 text-sm">
          Permet à un utilisateur de voir une navbar différente de celle de son rôle.
        </p>

        <div className="flex gap-2">
          <input
            className="border p-2 rounded w-96"
            placeholder="UUID de l'utilisateur"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <button
            className="border px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={loadUser}
          >
            Charger
          </button>
        </div>

        {userId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {navItems.map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-3 border rounded p-3 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={userOverrides[item.key] ?? (roleMatrix[item.key] ?? true)}
                  onChange={(e) => toggleUser(item.key, e.target.checked)}
                />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-slate-500">{item.route}</div>
                </div>
              </label>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
