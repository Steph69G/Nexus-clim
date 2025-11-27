import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get("invitation");

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<{
    conversation_id: string;
    conversation_title: string;
    inviter_name: string;
    message?: string;
  } | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(!!invitationToken);

  useEffect(() => {
    if (invitationToken) {
      loadInvitationDetails();
    }
  }, [invitationToken]);

  const loadInvitationDetails = async () => {
    try {
      const { data, error } = await supabase.rpc("validate_invitation_token", {
        p_token: invitationToken,
      });

      if (error || !data || data.length === 0) {
        setErr("Invitation invalide ou expirée");
        setLoadingInvitation(false);
        return;
      }

      const invitation = data[0];
      setEmail(invitation.invited_email);
      setInvitationDetails({
        conversation_id: invitation.conversation_id,
        conversation_title: invitation.conversation_title,
        inviter_name: invitation.inviter_name,
        message: invitation.message,
      });
    } catch (error) {
      console.error("Error loading invitation:", error);
      setErr("Erreur lors du chargement de l'invitation");
    } finally {
      setLoadingInvitation(false);
    }
  };

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

      if (invitationToken && data.user) {
        const { error: acceptError } = await supabase.rpc("accept_invitation", {
          p_token: invitationToken,
          p_user_id: data.user.id,
        });

        if (acceptError) {
          console.error("Error accepting invitation:", acceptError);
        }
      }

      if (hasSession) {
        // si l'auto-confirmation est activée, l'utilisateur est connecté
        setOk("Compte créé, bienvenue !");
        // Rediriger vers la conversation si invitation, sinon page d'accueil
        if (invitationDetails?.conversation_id) {
          nav(`/communication/tchat?conversation=${invitationDetails.conversation_id}`, { replace: true });
        } else {
          nav("/", { replace: true });
        }
      } else {
        // si confirmation email requise : informer puis rediriger vers /login
        setOk("Compte créé. Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.");
        setTimeout(() => nav("/login", { replace: true }), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingInvitation) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="text-slate-600">Chargement de l'invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-slate-50">
      <div className="w-full max-w-md space-y-4">
        {invitationDetails && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center">
                <span className="text-xl">💬</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Invitation à une conversation</h3>
                <p className="text-sm text-slate-600">
                  {invitationDetails.inviter_name} vous invite
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-700 font-medium mb-1">
                {invitationDetails.conversation_title}
              </p>
              {invitationDetails.message && (
                <p className="text-sm text-slate-600 italic">"{invitationDetails.message}"</p>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Créez votre compte pour rejoindre cette conversation
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h1 className="text-2xl font-semibold text-slate-900">
            {invitationDetails ? "Finaliser votre inscription" : "Créer un compte"}
          </h1>

          <input
            className="w-full border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
            placeholder="Nom complet"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />

          <input
            className="w-full border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            disabled={!!invitationDetails}
          />

          <div className="relative">
            <input
              className="w-full border border-slate-300 p-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe (minimum 6 caractères)"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
              {err}
            </div>
          )}
          {ok && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 rounded-lg">
              {ok}
            </div>
          )}

          <button
            disabled={loading}
            onClick={register}
            className="w-full py-3 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              "S'inscrire"
            )}
          </button>

          <div className="text-sm text-center text-slate-600">
            Déjà inscrit ?{" "}
            <Link to="/login" className="text-sky-600 hover:text-sky-700 font-medium">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
