import { useAuth } from "@/auth/AuthProvider";
import { Link } from "react-router-dom";

export default function AuthStatus(){
  const { user, role, signOut, loading } = useAuth();
  if (loading) return <span className="text-sm opacity-70">…</span>;
  return user ? (
    <div className="text-sm opacity-80 flex items-center gap-2">
      <span>{user.email} • {role ?? "no-role"}</span>
      <button onClick={signOut} className="border px-2 py-1 rounded hover:bg-slate-100">Déconnexion</button>
    </div>
  ) : (
    <Link to="/login" className="border px-2 py-1 rounded hover:bg-slate-100 text-sm">Se connecter</Link>
  );
}
