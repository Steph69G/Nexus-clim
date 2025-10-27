import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { setRoleNavVisibility, setUserNavPreference } from "@/api/nav";

type NavItem = { key: string; label: string; route: string; category: string | null; icon: string | null; order_index: number };

const ROLES = ["admin", "sal", "st", "client"]; // adapte selon tes rôles

export default function AdminNavigation() {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("sal");
  const [roleMatrix, setRoleMatrix] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string>("");
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});

  // Charger la liste des items
  useEffect(() => { loadNav(); }, []);
  async function loadNav() {
    const { data } = await supabase.from("nav_items").select("key,label,route,category,icon,order_index").order("order_index");
    setNavItems(data ?? []);
  }

  // Charger les droits d’un rôle
  useEffect(() => { if (selectedRole) loadRole(); }, [selectedRole]);
  async function loadRole() {
    const { data } = await supabase.from("role_nav_visibility").select("nav_key, visible").eq("role", selectedRole);
    const map: Record<string, boolean> = {};
    (data ?? []).forEach(r => { map[r.nav_key] = r.visible; });
    setRoleMatrix(map);
  }

  async function toggleRole(key: string, next: boolean) {
    setRoleMatrix(prev => ({ ...prev, [key]: next }));
    await setRoleNavVisibility(selectedRole, key, next);
  }

  async function loadUser() {
    if (!userId) return;
    const { data } = await supabase.from("nav_preferences").select("nav_key, visible").eq("user_id", userId);
    const map: Record<string, boolean> = {};
    (data ?? []).forEach(r => { map[r.nav_key] = r.visible; });
    setUserOverrides(map);
  }

  async function toggleUser(key: string, next: boolean) {
    setUserOverrides(prev => ({ ...prev, [key]: next }));
    await setUserNavPreference(userId, key, next);
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Navigation — Permissions</h1>

      {/* === Par rôle === */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Par rôle</h2>
        <select className="border p-2 rounded" value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
          {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
        </select>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {navItems.map(item => (
            <label key={item.key} className="flex items-center gap-3 border rounded p-3">
              <input type="checkbox" checked={roleMatrix[item.key] ?? true} onChange={e => toggleRole(item.key, e.target.checked)} />
              <div>
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-slate-500">{item.route}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* === Par utilisateur === */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Par utilisateur</h2>
        <div className="flex gap-2">
          <input className="border p-2 rounded w-96" placeholder="UUID de l'utilisateur" value={userId} onChange={e => setUserId(e.target.value)} />
          <button className="border px-3 py-2 rounded" onClick={loadUser}>Charger</button>
        </div>
        {userId && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {navItems.map(item => (
              <label key={item.key} className="flex items-center gap-3 border rounded p-3">
                <input
                  type="checkbox"
                  checked={userOverrides[item.key] ?? (roleMatrix[item.key] ?? true)}
                  onChange={e => toggleUser(item.key, e.target.checked)}
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
