import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/ui/toast/ToastProvider";
import { Settings, Save, RotateCcw, Eye, EyeOff, ListOrdered } from "lucide-react";

type NavItem = {
  id: string;
  key: string;
  label: string;
  path: string | null;
  icon: string | null;
  category: string | null;
  role_min: string | null; // 'client'|'st'|'sal'|'tech'|'admin'
  position: number | null;
  is_default_visible: boolean | null;
};

type UserNavPref = {
  user_id: string;
  nav_key: string;
  visible: boolean;
  position: number;
};

type RoleVisibility = {
  role: "admin" | "sal" | "st" | "tech" | "client";
  nav_key: string;
  visible: boolean;
};

const ROLES: RoleVisibility["role"][] = ["admin", "sal", "st", "tech", "client"];

export default function NavigationAdminPage() {
  const { profile } = useProfile();
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Données brutes
  const [items, setItems] = useState<NavItem[]>([]);
  const [userPrefs, setUserPrefs] = useState<Record<string, UserNavPref>>({});
  const [roleDefaults, setRoleDefaults] = useState<Record<string, Record<string, boolean>>>({}); // role -> nav_key -> visible

  // UI state
  const [selectedRole, setSelectedRole] = useState<RoleVisibility["role"]>("sal");

  // Charger données
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // 1) Items
        const { data: nav, error: navErr } = await supabase
          .from("nav_items")
          .select("*")
          .order("position", { ascending: true });

        if (navErr) throw navErr;
        setItems(nav as NavItem[]);

        // 2) Prefs utilisateur
        if (profile?.user_id) {
          const { data: prefs, error: prefErr } = await supabase
            .from("user_nav_prefs")
            .select("*")
            .eq("user_id", profile.user_id);

          if (prefErr) throw prefErr;
          const map: Record<string, UserNavPref> = {};
          (prefs || []).forEach((p: UserNavPref) => {
            map[p.nav_key] = p;
          });
          setUserPrefs(map);
        }

        // 3) Defaults par rôle (si admin)
        if (profile?.role === "admin") {
          const { data: rv, error: rvErr } = await supabase
            .from("role_nav_visibility")
            .select("*");

          if (rvErr) throw rvErr;

          const rd: Record<string, Record<string, boolean>> = {};
          (rv || []).forEach((r: RoleVisibility) => {
            rd[r.role] ||= {};
            rd[r.role][r.nav_key] = r.visible;
          });
          setRoleDefaults(rd);
        }
      } catch (e: any) {
        push({ type: "error", message: e?.message ?? "Erreur chargement navigation" });
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.user_id, profile?.role]);

  // Fusion items + prefs utilisateur → vue éditable
  const editable = useMemo(() => {
    // Construire un tableau avec visible & position calculés (prefs > default)
    const rows = items.map((i) => {
      const pref = userPrefs[i.key];
      return {
        key: i.key,
        label: i.label,
        path: i.path,
        category: i.category ?? "Général",
        role_min: i.role_min ?? "client",
        defaultVisible: !!i.is_default_visible,
        visible: pref ? pref.visible : !!i.is_default_visible,
        position: pref ? pref.position : i.position ?? 9999,
      };
    });

    // Tri par position, puis label
    rows.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.label.localeCompare(b.label);
    });

    // Group by category
    const grouped: Record<string, typeof rows> = {};
    rows.forEach((r) => {
      grouped[r.category] ||= [];
      grouped[r.category].push(r);
    });
    return grouped;
  }, [items, userPrefs]);

  function setItemVisible(navKey: string, next: boolean) {
    if (!profile?.user_id) return;
    setUserPrefs((prev) => {
      const existing = prev[navKey];
      const baseItem = items.find((i) => i.key === navKey);
      const position = existing?.position ?? baseItem?.position ?? 9999;
      return {
        ...prev,
        [navKey]: {
          user_id: profile.user_id,
          nav_key: navKey,
          visible: next,
          position,
        },
      };
    });
  }

  function setItemPosition(navKey: string, nextPos: number) {
    if (!profile?.user_id) return;
    setUserPrefs((prev) => {
      const existing = prev[navKey];
      const baseItem = items.find((i) => i.key === navKey);
      const visible =
        existing?.visible ??
        (baseItem?.is_default_visible ? true : false);
      return {
        ...prev,
        [navKey]: {
          user_id: profile.user_id,
          nav_key: navKey,
          visible,
          position: Number.isFinite(nextPos) ? nextPos : (existing?.position ?? baseItem?.position ?? 9999),
        },
      };
    });
  }

  async function saveUserPrefs() {
    if (!profile?.user_id) return;
    try {
      setSaving(true);

      // Construire la liste complète à upsert: pour chaque item, on prend l'entrée en state
      // Si l’utilisateur n’a pas modifié un item, on applique le default courant
      const toUpsert: UserNavPref[] = items.map((i) => {
        const cur = userPrefs[i.key];
        return {
          user_id: profile.user_id,
          nav_key: i.key,
          visible: cur?.visible ?? !!i.is_default_visible,
          position: cur?.position ?? i.position ?? 9999,
        };
      });

      const { error } = await supabase
        .from("user_nav_prefs")
        .upsert(toUpsert, { onConflict: "user_id,nav_key" });

      if (error) throw error;

      push({ type: "success", message: "Préférences enregistrées ✅" });
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur à l’enregistrement" });
    } finally {
      setSaving(false);
    }
  }

  async function resetUserPrefs() {
    if (!profile?.user_id) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from("user_nav_prefs")
        .delete()
        .eq("user_id", profile.user_id);
      if (error) throw error;

      // reset local
      setUserPrefs({});
      push({ type: "success", message: "Préférences réinitialisées" });
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur réinitialisation" });
    } finally {
      setSaving(false);
    }
  }

  // --- Defaults par rôle (ADMIN) ---
  function setRoleDefault(role: RoleVisibility["role"], navKey: string, next: boolean) {
    setRoleDefaults((prev) => {
      const roleMap = { ...(prev[role] || {}) };
      roleMap[navKey] = next;
      return { ...prev, [role]: roleMap };
    });
  }

  async function saveRoleDefaults() {
    if (profile?.role !== "admin") return;
    try {
      setSaving(true);

      // Aplatir -> array
      const payload: RoleVisibility[] = [];
      for (const r of ROLES) {
        const map = roleDefaults[r] || {};
        for (const nav_key of items.map((i) => i.key)) {
          if (typeof map[nav_key] === "boolean") {
            payload.push({ role: r, nav_key, visible: map[nav_key] });
          }
        }
      }

      if (payload.length === 0) {
        push({ type: "info", message: "Aucun changement à sauvegarder" });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("role_nav_visibility")
        .upsert(payload, { onConflict: "role,nav_key" });

      if (error) throw error;

      push({ type: "success", message: "Visibilité par rôle enregistrée ✅" });
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur enregistrement par rôle" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <header className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-slate-700" />
        <h1 className="text-2xl font-bold">Personnalisation de la navigation</h1>
      </header>

      {/* Bloc préférences utilisateur */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ListOrdered className="w-5 h-5" /> Préférences personnelles
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={resetUserPrefs}
              disabled={saving}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border hover:bg-slate-50"
            >
              <RotateCcw className="w-4 h-4" /> Réinitialiser
            </button>
            <button
              onClick={saveUserPrefs}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            >
              <Save className="w-4 h-4" /> {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(editable).map(([category, rows]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">
                {category}
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {rows.map((r) => (
                  <div
                    key={r.key}
                    className="flex items-center justify-between rounded-xl border p-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.label}</div>
                      <div className="text-xs text-slate-500">
                        clé: <code>{r.key}</code> • rôle min: {r.role_min}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={userPrefs[r.key]?.visible ?? r.visible}
                          onChange={(e) => setItemVisible(r.key, e.target.checked)}
                        />
                        {userPrefs[r.key]?.visible ?? r.visible ? (
                          <span className="inline-flex items-center gap-1 text-green-700">
                            <Eye className="w-4 h-4" /> visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <EyeOff className="w-4 h-4" /> caché
                          </span>
                        )}
                      </label>

                      <input
                        type="number"
                        className="w-20 px-2 py-1 border rounded-lg text-sm"
                        value={userPrefs[r.key]?.position ?? r.position}
                        onChange={(e) => setItemPosition(r.key, parseInt(e.target.value, 10))}
                        title="Ordre"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bloc defaults par rôle (visible uniquement pour admin) */}
      {profile?.role === "admin" && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Visibilité par rôle (défaut)</h2>
            <button
              onClick={saveRoleDefaults}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Save className="w-4 h-4" /> {saving ? "Enregistrement…" : "Enregistrer les defaults"}
            </button>
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium mr-2">Rôle :</label>
            <select
              className="px-3 py-2 border rounded-xl"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as RoleVisibility["role"])}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {items.map((i) => {
              const cur = roleDefaults[selectedRole]?.[i.key];
              const current = typeof cur === "boolean" ? cur : !!i.is_default_visible;
              return (
                <div key={i.key} className="flex items-center justify-between rounded-xl border p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{i.label}</div>
                    <div className="text-xs text-slate-500">
                      clé: <code>{i.key}</code> • rôle min: {i.role_min ?? "client"}
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={current}
                      onChange={(e) => setRoleDefault(selectedRole, i.key, e.target.checked)}
                    />
                    {current ? (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <Eye className="w-4 h-4" /> visible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <EyeOff className="w-4 h-4" /> caché
                      </span>
                    )}
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
