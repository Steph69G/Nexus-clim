import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate, Link } from "react-router-dom";

export default function RegisterPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [fullName, setFullName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const register = async () => {
    setErr(null);
    setOk(null);

    // petites validations côté client
    if (!email.trim()) return setErr("Merci d’indiquer un email.");
    if (pass.length < 6) return setErr("Le mot de passe doit faire au moins 6 caractères.");

    setLoading(true);
    try {
      // 1) Création du compte Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          // Ces métadonnées seront recopiées par le trigger dans public.profiles
          data: { full_name: (fullName || email).trim() }
        }
      });

      if (error) {
        // quelques messages plus clairs
        if (error.message?.includes("invalid")) {
          setErr("Adresse email invalide (essaie avec une adresse réelle, ex. Gmail).");
        } else if (error.message?.toLowerCase().includes("already registered")) {
          setErr("Un compte existe déjà avec cet email.");
        } else {
          setErr(error.message);
        }
        return;
      }

      // 2) À ce stade, la ligne auth.users est créée (même si email à confirmer)
      //    → le trigger a créé public.profiles(id, email, full_name, ...)
      const hasSession = !!data.session;

      if (hasSession) {
        // si l’auto-confirmation est activée, l’utilisateur est connecté
        setOk("Compte créé, bienvenue !");
        // tu peux rediriger direct sur l’app
        nav("/", { replace: true });
      } else {
        // si confirmation email requise : informer puis rediriger vers /login
        setOk("Compte créé. Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.");
        setTimeout(() => nav("/login", { replace: true }), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">Créer un compte</h1>

        <input
          className="w-full border p-2 rounded"
          placeholder="Nom (optionnel)"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
        />

        <input
          className="w-full border p-2 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
        />

        <input
          className="w-full border p-2 rounded"
          type="password"
          placeholder="Mot de passe"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="new-password"
        />

        {err && <div className="text-red-600 text-sm">{err}</div>}
        {ok && <div className="text-emerald-700 text-sm">{ok}</div>}

        <button
          disabled={loading}
          onClick={register}
          className="w-full py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
        >
          {loading ? "Création…" : "S’inscrire"}
        </button>

        <div className="text-sm text-center opacity-80">
          Déjà inscrit ? <Link to="/login" className="underline">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
