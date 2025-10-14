// src/pages/LoginPage.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/ui/toast/ToastProvider";
import { Building2, Mail, Lock, ArrowRight, Zap } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup" | "magic">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { user, loading, refresh } = useAuth();

  // Calcul propre de la cible de redirection
  const fromPath = location.state?.from?.pathname;
  const redirectTo =
    !fromPath || fromPath === "/login" ? "/" : fromPath;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Rafraîchir le contexte auth pour éviter l'écran de login bloqué
        await refresh();

        push({ type: "success", message: "Connecté ✅" });
        navigate("/redirect", { replace: true });

      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        push({ type: "info", message: "Compte créé. Vérifie tes emails pour confirmer." });

      } else if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin + "/" },
        });
        if (error) throw error;
        push({ type: "info", message: "Magic link envoyé. Check ta boîte mail." });
      }
    } catch (err: any) {
      let errorMessage = "Erreur d'authentification";
      if (err?.message?.includes("Email not confirmed")) {
        errorMessage = "Email non confirmé. Vérifie ta boîte mail et clique sur le lien de confirmation.";
      } else if (err?.message?.includes("Email logins are disabled") || err?.code === "email_provider_disabled") {
        errorMessage = "L'authentification par email est désactivée. Contactez l'administrateur (Supabase → Authentication → Providers → Email).";
      } else if (err?.message) {
        errorMessage = err.message;
      }
      push({ type: "error", message: errorMessage });
    } finally {
      setBusy(false);
    }
  }

  // Garde-fou : si déjà connecté, éjecter /login
  useEffect(() => {
    if (!loading && user) navigate(redirectTo, { replace: true });
  }, [loading, user, navigate, redirectTo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Nexus Clim</h1>
          </div>

          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 mb-4">
            <Zap className="w-4 h-4 text-blue-300" />
            <span className="text-sm font-medium text-blue-100">Plateforme de gestion d'interventions</span>
          </div>

          <h2 className="text-2xl font-semibold text-white mb-2">
            {mode === "login" ? "Connexion" : mode === "signup" ? "Créer un compte" : "Magic Link"}
          </h2>
          <p className="text-slate-300">
            {mode === "login"
              ? "Accédez à votre espace professionnel"
              : mode === "signup"
                ? "Rejoignez la plateforme Nexus Clim"
                : "Recevez un lien de connexion par email"
            }
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-1 mb-8 bg-white/10 backdrop-blur-sm rounded-2xl p-1 border border-white/20">
          <button
            type="button"
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              mode === "login" ? "bg-white text-slate-900 shadow-lg" : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
            onClick={() => setMode("login")}
          >
            Se connecter
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              mode === "signup" ? "bg-white text-slate-900 shadow-lg" : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
            onClick={() => setMode("signup")}
          >
            S'inscrire
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              mode === "magic" ? "bg-white text-slate-900 shadow-lg" : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
            onClick={() => setMode("magic")}
          >
            Magic Link
          </button>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-2xl">
          <form onSubmit={onSubmit} className="space-y-6" autoComplete="on">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                <input
                  type="email"
                  name="username"
                  autoComplete="username"
                  inputMode="email"
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/60 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            {mode !== "magic" && (
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                  <input
                    type="password"
                    name={mode === "signup" ? "new-password" : "current-password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/60 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:outline-none transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-white text-slate-900 py-4 rounded-2xl font-semibold hover:bg-slate-50 disabled:opacity-50 transition-all transform hover:scale-105 shadow-2xl flex items-center justify-center gap-3"
            >
              {busy ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  Chargement…
                </>
              ) : (
                <>
                  {mode === "login" ? "Se connecter" : mode === "signup" ? "Créer le compte" : "Envoyer le magic link"}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/20 text-center">
            <Link
              to="/"
              className="text-white/80 hover:text-white text-sm transition-colors inline-flex items-center gap-2"
            >
              ← Retour à l'accueil
            </Link>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-8 text-center">
          <p className="text-white/60 text-sm">
            {mode === "login"
              ? "Première fois ? Créez votre compte pour accéder à la plateforme."
              : mode === "signup"
                ? "Déjà inscrit ? Connectez-vous avec vos identifiants."
                : "Le magic link vous permettra de vous connecter sans mot de passe."
            }
          </p>
        </div>
      </div>
    </div>
  );
}
