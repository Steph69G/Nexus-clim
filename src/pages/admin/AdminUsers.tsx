import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/ui/toast/ToastProvider";
import { mapDbRoleToUi, mapUiRoleToDb, type UiRole } from "@/lib/roles";
import { getRoleColors } from "@/lib/roleColors";
import { MoreVertical, CreditCard as Edit3, Trash2, X, MailCheck, KeyRound, Copy, Shield, UserPlus, History } from "lucide-react";
import CreateUserModal from "@/components/CreateUserModal";
import SubcontractorHistoryModal from "@/components/SubcontractorHistoryModal";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Row = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: UiRole | null;  // rôle UI mappé
  db_role: string | null; // rôle brut DB
  city: string | null;
  created_at: string;
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<{ id: string; name: string } | null>(null);
  const { push } = useToast();

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, email, full_name, role, city, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      push({ type: "error", message: error.message });
    } else {
      const mapped = (data ?? []).map((row: any) => ({
        ...row,
        db_role: row.role,
        role: mapDbRoleToUi(row.role),
      })) as Row[];
      setRows(mapped);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setRole(user_id: string, uiRole: UiRole) {
    const dbRole = mapUiRoleToDb(uiRole);
    if (!dbRole) {
      push({ type: "error", message: "Rôle invalide" });
      return;
    }
    const { error } = await supabase.from("profiles").update({ role: dbRole }).eq("user_id", user_id);
    if (error) {
      push({ type: "error", message: error.message });
    } else {
      push({ type: "success", message: "Rôle mis à jour" });
      await load();
    }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${userName} ?`)) return;
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (error) {
      push({ type: "error", message: error.message });
    } else {
      push({ type: "success", message: "Utilisateur supprimé" });
      await load();
    }
  }

  if (loading) return <div className="p-6">Chargement…</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <header className="text-center">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 border border-slate-200 shadow-xl mb-6">
            <span className="text-blue-600 text-xl">👥</span>
            <span className="text-sm font-medium text-slate-700">Gestion des utilisateurs</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Utilisateurs & rôles</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Gérez les accès et permissions de votre équipe depuis une interface centralisée
          </p>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <UserPlus className="w-5 h-5" />
              Créer un utilisateur
            </button>
          </div>
        </header>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-visible">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
                <tr>
                  <th className="px-8 py-6 text-left font-bold text-slate-800">Nom</th>
                  <th className="px-8 py-6 text-left font-bold text-slate-800">Email</th>
                  <th className="px-8 py-6 text-left font-bold text-slate-800">Ville</th>
                  <th className="px-8 py-6 text-left font-bold text-slate-800">Rôle</th>
                  <th className="px-8 py-6 text-right font-bold text-slate-800">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.user_id} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all">
                    <td className="px-8 py-6 font-bold text-slate-900">{r.full_name || "—"}</td>
                    <td className="px-8 py-6 text-slate-600 font-medium">{r.email || "—"}</td>
                    <td className="px-8 py-6 text-slate-600 font-medium">{r.city || "—"}</td>
                    <td className="px-8 py-6">
                      {r.role && (
                        <span className={`px-4 py-2 bg-gradient-to-r ${getRoleColors(r.role).gradientLight} ${getRoleColors(r.role).text} text-sm font-bold rounded-full border ${getRoleColors(r.role).border} shadow-sm`}>
                          {r.role}
                        </span>
                      )}
                      {!r.role && <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-8 py-6 text-right">
                      {/* ---- UN SEUL BOUTON "⋯" QUI REGROUPE TOUT ---- */}
                      <UserMenu
                        user={r}
                        onRoleChange={setRole}
                        onDelete={handleDeleteUser}
                        onViewHistory={(userId, userName) => setSelectedUserForHistory({ id: userId, name: userName })}
                      />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center">
                      <div className="text-6xl mb-4">👥</div>
                      <div className="text-lg font-medium text-slate-500">Aucun utilisateur</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <CreateUserModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={load}
        />

        {selectedUserForHistory && (
          <SubcontractorHistoryModal
            userId={selectedUserForHistory.id}
            userName={selectedUserForHistory.name}
            onClose={() => setSelectedUserForHistory(null)}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Menu unique (⋯) : rôles + actions                                   */
/* ------------------------------------------------------------------ */

function UserMenu({
  user,
  onRoleChange,
  onDelete,
  onViewHistory,
}: {
  user: Row;
  onRoleChange: (userId: string, role: UiRole) => void;
  onDelete: (userId: string, userName: string) => void;
  onViewHistory: (userId: string, userName: string) => void;
}) {
  const { push } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const roles: { value: UiRole; label: string }[] = [
    { value: "admin", label: "Admin" },
    { value: "tech", label: "Tech" },
    { value: "st", label: "ST" },
    { value: "sal", label: "SAL" },
  ];

  const toggle = () => {
    if (!isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
    setIsOpen(!isOpen);
  };

  async function resendConfirmation() {
    if (!user.email) {
      push({ type: "error", message: "Aucun email pour cet utilisateur." });
      return;
    }
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
    if (error) push({ type: "error", message: error.message });
    else push({ type: "success", message: "Email de confirmation renvoyé." });
    setIsOpen(false);
  }

  async function sendResetPassword() {
    if (!user.email) {
      push({ type: "error", message: "Aucun email pour cet utilisateur." });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) push({ type: "error", message: error.message });
    else push({ type: "success", message: "Lien de réinitialisation envoyé." });
    setIsOpen(false);
  }

  function copyId() {
    navigator.clipboard.writeText(user.user_id).then(
      () => push({ type: "success", message: "ID copié dans le presse-papiers." }),
      () => push({ type: "error", message: "Impossible de copier l’ID." })
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        className="px-3 py-3 bg-white border-2 border-slate-300 rounded-2xl hover:bg-slate-50 transition-all transform hover:scale-105 shadow-lg inline-flex items-center justify-center"
        title="Actions"
      >
        <MoreVertical className="w-4 h-4 text-slate-600" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="fixed bg-white/95 backdrop-blur-sm border-2 border-slate-200 rounded-2xl shadow-2xl min-w-[260px] z-50 overflow-y-auto max-h-[80vh]"
            style={{
              top: buttonRect ? Math.min(buttonRect.bottom + 4, window.innerHeight - 600) : 0,
              left: buttonRect ? buttonRect.right - 260 : 0,
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="font-medium text-slate-900 text-sm">{user.full_name || "Utilisateur"}</div>
              <div className="text-xs text-slate-600">{user.email || "—"}</div>
            </div>

            {/* SECTION : Rôle */}
            <div className="px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm mb-2">
                <Shield className="w-4 h-4" />
                Rôle
              </div>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => {
                  const selected = user.role === r.value;
                  return (
                    <button
                      key={r.value}
                      onClick={async () => {
                        if (r.value !== user.role) {
                          await onRoleChange(user.user_id, r.value);
                        }
                        setIsOpen(false);
                      }}
                      className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                        selected
                          ? `bg-gradient-to-r ${getRoleColors(r.value).gradientLight} ${getRoleColors(r.value).text} ${getRoleColors(r.value).border}`
                          : `bg-white hover:bg-slate-50 text-slate-700 border-slate-300 ${getRoleColors(r.value).borderHover}`
                      }`}
                    >
                      {r.label} {selected && <span className="ml-1">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <a
              href={`/admin/profile/${user.user_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 font-medium text-slate-700 hover:text-blue-700 transition-all"
              onClick={() => setIsOpen(false)}
            >
              <Edit3 className="w-4 h-4" />
              Voir le profil complet
            </a>

            <button
              className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 font-medium text-slate-700 transition-all"
              onClick={copyId}
            >
              <Copy className="w-4 h-4" />
              Copier l’ID utilisateur
            </button>

            <button
              className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 font-medium text-slate-700 transition-all"
              onClick={resendConfirmation}
              disabled={!user.email}
              title={!user.email ? "Aucun email sur ce compte" : undefined}
            >
              <MailCheck className="w-4 h-4" />
              Renvoyer la confirmation
            </button>

            <button
              className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 font-medium text-slate-700 transition-all"
              onClick={sendResetPassword}
              disabled={!user.email}
              title={!user.email ? "Aucun email sur ce compte" : undefined}
            >
              <KeyRound className="w-4 h-4" />
              Réinitialiser le mot de passe
            </button>

            <button
              className="w-full px-4 py-3 text-left hover:bg-emerald-50 flex items-center gap-3 font-medium text-slate-700 hover:text-emerald-700 transition-all"
              onClick={() => {
                onViewHistory(user.user_id, user.full_name || "Utilisateur");
                setIsOpen(false);
              }}
            >
              <History className="w-4 h-4" />
              Voir l'historique
            </button>

            <div className="border-t border-slate-200" />

            <button
              className="w-full px-4 py-3 text-left hover:bg-red-50 text-red-600 hover:text-red-700 flex items-center gap-3 font-medium transition-all"
              onClick={() => {
                onDelete(user.user_id, user.full_name || "cet utilisateur");
                setIsOpen(false);
              }}
            >
              <Trash2 className="w-4 h-4" />
              Supprimer l’utilisateur
            </button>
          </div>
        </>
      )}
    </>
  );
}

