import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type DbRole = "ADMIN" | "ST" | "SAL" | null;

export default function Navbar() {
  const [role, setRole] = useState<DbRole>(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState("");
  const loc = useLocation();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user }, error: uErr } = await supabase.auth.getUser();
      if (uErr) console.warn("[Navbar] getUser error:", uErr);
      if (!user) { if (mounted) setLoading(false); return; }
      if (mounted) setUid(user.id);

      // ⚠️ Si ta clé n'est pas 'user_id' mais 'id', adapte la ligne .eq()
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)   // ← change en .eq("id", user.id) si besoin
        .maybeSingle();

      console.debug("[Navbar] profiles select =>", { data, error });

      if (mounted) {
        if (!error && data) setRole((data.role as DbRole) ?? null);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [loc.pathname]);

  const showAdminLink = !loading && role === "ADMIN";

  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <NavLink to="/" className="font-semibold">Nexus Clim</NavLink>

        <nav className="flex items-center gap-4">
          <NavLink to="/app/profile" className="text-sm hover:underline">
            Mon profil
          </NavLink>

          {showAdminLink && (
            <NavLink to="/admin/users" className="text-sm hover:underline">
              Utilisateurs & rôles
            </NavLink>
          )}

          {/* Badge debug — retire-le quand OK */}
          <span className="ml-4 text-xs px-2 py-1 border rounded text-gray-600">
            role: {loading ? "…" : (role ?? "null")} · uid: {uid.slice(0,8)}
          </span>
        </nav>
      </div>
    </header>
  );
}
