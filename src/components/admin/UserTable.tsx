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
  KeyRound,
  FileText,
  Calendar,
  CalendarCheck,
  CalendarClock,
  UserCheck,
  FilePlus
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
  contract_id?: string | null;
  contract_number?: string | null;
  contract_start_date?: string | null;
  next_intervention_date?: string | null;
  contract_status?: string | null;
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

      if (roleFilter?.includes("client")) {
        const userIds = mapped.map(u => u.user_id);
        const { data: clientsData } = await supabase
          .from("user_clients")
          .select("user_id, id")
          .in("user_id", userIds);

        if (clientsData && clientsData.length > 0) {
          const clientIds = clientsData.map(c => c.id);
          const { data: contractsData } = await supabase
            .from("maintenance_contracts")
            .select("id, contract_number, client_id, status, start_date, end_date")
            .in("client_id", clientIds)
            .in("status", ["active", "draft"])
            .order("created_at", { ascending: false });

          const { data: interventionsData } = await supabase
            .from("contract_scheduled_interventions")
            .select("contract_id, scheduled_date, status")
            .in("status", ["scheduled", "assigned"])
            .order("scheduled_date", { ascending: true });

          if (contractsData) {
            const clientMap = new Map(clientsData.map(c => [c.user_id, c.id]));
            mapped.forEach(user => {
              const clientId = clientMap.get(user.user_id);
              if (clientId) {
                const contract = contractsData.find(c => c.client_id === clientId);
                if (contract) {
                  const nextIntervention = interventionsData?.find(
                    i => i.contract_id === contract.id
                  );

                  user.contract_id = contract.id;
                  user.contract_number = contract.contract_number;
                  user.contract_start_date = contract.start_date;
                  user.contract_status = contract.status;
                  user.next_intervention_date = nextIntervention?.scheduled_date;
                }
              }
            });
          }
        }
      }

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
                {roleFilter?.includes("client") && (
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-800">
                    Contrat
                  </th>
                )}
                <th className="px-6 py-4 text-left text-sm font-bold text-slate-800">
                  Inscrit le
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-slate-800">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={roleFilter?.includes("client") ? 7 : 6} className="px-6 py-12 text-center text-slate-500">
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
                    {roleFilter?.includes("client") && (
                      <td className="px-6 py-4">
                        {user.contract_id ? (
                          <a
                            href={`/admin/contracts/${user.contract_id}`}
                            className="inline-flex items-start gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 text-emerald-700 rounded-lg border border-emerald-200 transition-all hover:shadow-md group"
                          >
                            <FileText className="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1.5">
                              <span className="text-sm font-bold text-emerald-800">{user.contract_number}</span>
                              <div className="flex flex-col gap-1">
                                {user.contract_start_date && (
                                  <span className="text-xs text-emerald-600 flex items-center gap-1.5">
                                    <CalendarCheck className="w-3 h-3" />
                                    <span className="font-medium">Début:</span>
                                    {new Date(user.contract_start_date).toLocaleDateString("fr-FR")}
                                  </span>
                                )}
                                {user.next_intervention_date && (
                                  <span className="text-xs text-emerald-700 flex items-center gap-1.5 font-semibold">
                                    <CalendarClock className="w-3 h-3" />
                                    <span className="font-bold">Prochain:</span>
                                    {new Date(user.next_intervention_date).toLocaleDateString("fr-FR")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-sm italic">Aucun contrat</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <UserCheck className="w-4 h-4 text-slate-400" />
                        <span>{new Date(user.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
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
  const [showContractOptions, setShowContractOptions] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { push } = useToast();

  const roles: UiRole[] = ["admin", "tech", "sal", "st", "client"];

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 450;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;

      let top = rect.bottom + window.scrollY + 8;
      if (spaceBelow < menuHeight) {
        top = rect.top + window.scrollY - menuHeight - 8;
      }

      setMenuPosition({
        top: Math.max(10, top),
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
            {user.role !== "client" && (
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
            )}

            <div className={`p-2 ${user.role !== "client" ? "border-t border-slate-200" : ""}`}>
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

              {(user.role === "st" || user.role === "tech" || user.role === "sal" || user.role === "admin") && (
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

              {user.role === "client" && (
                <button
                  onClick={() => setShowContractOptions(!showContractOptions)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 text-blue-700"
                >
                  <FilePlus className="w-4 h-4" />
                  Créer un contrat
                </button>
              )}

              {showContractOptions && user.role === "client" && (
                <div className="ml-4 mt-1 space-y-1">
                  <a
                    href={`/admin/contracts/new?client_id=${user.user_id}`}
                    className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-blue-50 transition-colors text-blue-600"
                    onClick={() => setIsOpen(false)}
                  >
                    Nouveau contrat
                  </a>
                  {user.contract_id && (
                    <a
                      href={`/admin/contracts/${user.contract_id}`}
                      className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-emerald-50 transition-colors text-emerald-600"
                      onClick={() => setIsOpen(false)}
                    >
                      Voir contrat actuel
                    </a>
                  )}
                </div>
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
