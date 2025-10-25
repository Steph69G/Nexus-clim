import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/ui/toast/ToastProvider";
import { mapDbRoleToUi, mapUiRoleToDb, type UiRole } from "@/lib/roles";
import { getRoleColors } from "@/lib/roleColors";
import {
  MoreVertical,
  Edit3,
  Trash2,
  Shield,
  UserPlus,
  History,
  Search,
  Loader2,
  Copy,
  MailCheck,
  KeyRound
} from "lucide-react";
import CreateUserModal from "@/components/CreateUserModal";
import SubcontractorHistoryModal from "@/components/SubcontractorHistoryModal";

interface User {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: UiRole | null;
  db_role: string | null;
  city: string | null;
  created_at: string;
}

interface UserTableProps {
  roleFilter?: string[];
  title?: string;
  description?: string;
  showCreateButton?: boolean;
}

export default function UserTable({
  roleFilter,
  title = "Utilisateurs",
  description,
  showCreateButton = true
}: UserTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<{ id: string; name: string } | null>(null);
  const { push } = useToast();

  async function loadUsers() {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("user_id, email, full_name, phone, role, city, created_at")
        .order("created_at", { ascending: false });

      if (roleFilter && roleFilter.length > 0) {
        query = query.in("role", roleFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped = (data ?? []).map((row: any) => ({
        ...row,
        db_role: row.role,
        role: mapDbRoleToUi(row.role),
      })) as User[];

      setUsers(mapped);
      setFilteredUsers(mapped);
    } catch (error: any) {
      push({ type: "error", message: error.message || "Erreur lors du chargement" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.full_name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.role?.toLowerCase().includes(term) ||
        user.phone?.toLowerCase().includes(term)
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  async function handleSetRole(user_id: string, uiRole: UiRole) {
    const dbRole = mapUiRoleToDb(uiRole);
    if (!dbRole) {
      push({ type: "error", message: "Rôle invalide" });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: dbRole })
      .eq("user_id", user_id);

    if (error) {
      push({ type: "error", message: error.message });
    } else {
      push({ type: "success", message: "Rôle mis à jour" });
      await loadUsers();
    }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${userName} ?`)) return;

    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);

    if (error) {
      push({ type: "error", message: error.message });
    } else {
      push({ type: "success", message: "Utilisateur supprimé" });
      await loadUsers();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          {description && (
            <p className="text-slate-600 mt-1">{description}</p>
          )}
        </div>
        {showCreateButton && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl"
          >
            <UserPlus className="w-5 h-5" />
            Créer un utilisateur
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, email, rôle..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-visible">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-slate-800">
                  Nom
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-slate-800">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-slate-800">
                  Téléphone
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-slate-800">
                  Rôle
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-slate-800">
                  Créé le
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-slate-800">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    {searchTerm ? "Aucun résultat trouvé" : "Aucun utilisateur"}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.user_id}
                    className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {user.full_name || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {user.email || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {user.phone || "—"}
                    </td>
                    <td className="px-6 py-4">
                      {user.role ? (
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            getRoleColors(user.role).gradientLight
                          } ${getRoleColors(user.role).text} border ${
                            getRoleColors(user.role).border
                          }`}
                        >
                          {user.role}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {new Date(user.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <UserMenu
                        user={user}
                        onRoleChange={handleSetRole}
                        onDelete={handleDeleteUser}
                        onViewHistory={(userId, userName) =>
                          setSelectedUserForHistory({ id: userId, name: userName })
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-slate-500 text-center">
        {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? "s" : ""} affiché
        {filteredUsers.length > 1 ? "s" : ""}
        {searchTerm && ` sur ${users.length} au total`}
      </div>

      {isCreateModalOpen && (
        <CreateUserModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            loadUsers();
          }}
        />
      )}

      {selectedUserForHistory && (
        <SubcontractorHistoryModal
          isOpen={!!selectedUserForHistory}
          userId={selectedUserForHistory.id}
          userName={selectedUserForHistory.name}
          onClose={() => setSelectedUserForHistory(null)}
        />
      )}
    </div>
  );
}

interface UserMenuProps {
  user: User;
  onRoleChange: (userId: string, role: UiRole) => void;
  onDelete: (userId: string, userName: string) => void;
  onViewHistory: (userId: string, userName: string) => void;
}

function UserMenu({ user, onRoleChange, onDelete, onViewHistory }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { push } = useToast();

  const roles: UiRole[] = ["admin", "tech", "sal", "st", "client"];

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 224
      });
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
      () => push({ type: "error", message: "Impossible de copier l'ID." })
    );
  }

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <MoreVertical className="w-5 h-5 text-slate-600" />
      </button>

      {isOpen && menuPosition && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`
            }}>
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">
                Changer le rôle
              </div>
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    onRoleChange(user.user_id, role);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                    user.role === role ? "bg-blue-50" : ""
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span className="capitalize">{role}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-slate-200 p-2">
              <a
                href={`/admin/profile/${user.user_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2 text-slate-700 hover:text-blue-700 transition-all rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                <Edit3 className="w-4 h-4" />
                Voir le profil complet
              </a>

              <button
                className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 transition-all rounded-lg"
                onClick={copyId}
              >
                <Copy className="w-4 h-4" />
                Copier l'ID utilisateur
              </button>

              <button
                className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 transition-all rounded-lg"
                onClick={resendConfirmation}
                disabled={!user.email}
                title={!user.email ? "Aucun email sur ce compte" : undefined}
              >
                <MailCheck className="w-4 h-4" />
                Renvoyer la confirmation
              </button>

              <button
                className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 transition-all rounded-lg"
                onClick={sendResetPassword}
                disabled={!user.email}
                title={!user.email ? "Aucun email sur ce compte" : undefined}
              >
                <KeyRound className="w-4 h-4" />
                Réinitialiser le mot de passe
              </button>

              {user.role === "st" && (
                <button
                  onClick={() => {
                    onViewHistory(user.user_id, user.full_name || "");
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-2 text-emerald-700"
                >
                  <History className="w-4 h-4" />
                  Historique missions
                </button>
              )}
            </div>

            <div className="border-t border-slate-200 p-2">
              <button
                onClick={() => {
                  onDelete(user.user_id, user.full_name || user.email || "cet utilisateur");
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer l'utilisateur
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
