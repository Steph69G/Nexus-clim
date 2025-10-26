import { useState, useEffect } from "react";
import { X, Users, User, Briefcase, Loader2 } from "lucide-react";
import { createConversation } from "@/api/chat";
import { supabase } from "@/lib/supabase";

type CreateConversationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
  currentUserId: string;
};

type UserOption = {
  user_id: string;
  full_name: string;
  role: string;
};

export function CreateConversationModal({
  isOpen,
  onClose,
  onCreated,
  currentUserId,
}: CreateConversationModalProps) {
  const [type, setType] = useState<"direct" | "group" | "mission">("direct");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, role")
        .neq("user_id", currentUserId);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (type === "direct" && selectedUsers.length !== 1) {
      alert("Sélectionnez exactement 1 utilisateur pour une conversation directe");
      return;
    }

    if (type === "group" && selectedUsers.length === 0) {
      alert("Sélectionnez au moins 1 utilisateur");
      return;
    }

    if (type === "group" && !title.trim()) {
      alert("Donnez un titre au groupe");
      return;
    }

    setCreating(true);
    try {
      const conversation = await createConversation(
        type,
        selectedUsers,
        title.trim() || undefined
      );
      onCreated(conversation.id);
      handleClose();
    } catch (error) {
      console.error("Error creating conversation:", error);
      alert("Erreur lors de la création de la conversation");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setType("direct");
    setSelectedUsers([]);
    setTitle("");
    onClose();
  };

  const toggleUser = (userId: string) => {
    if (type === "direct") {
      setSelectedUsers([userId]);
    } else {
      setSelectedUsers((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Nouvelle conversation</h2>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Type de conversation
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setType("direct")}
                className={`p-3 rounded-xl border-2 transition-all ${
                  type === "direct"
                    ? "border-sky-600 bg-sky-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <User className="w-5 h-5 mx-auto mb-1 text-sky-600" />
                <div className="text-xs font-medium">Direct</div>
              </button>
              <button
                onClick={() => setType("group")}
                className={`p-3 rounded-xl border-2 transition-all ${
                  type === "group"
                    ? "border-purple-600 bg-purple-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Users className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                <div className="text-xs font-medium">Groupe</div>
              </button>
              <button
                onClick={() => setType("mission")}
                className={`p-3 rounded-xl border-2 transition-all ${
                  type === "mission"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Briefcase className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <div className="text-xs font-medium">Mission</div>
              </button>
            </div>
          </div>

          {type === "group" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Titre du groupe
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Équipe Technique, Support Client..."
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {type === "direct" ? "Sélectionner un utilisateur" : "Ajouter des participants"}
            </label>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-sky-600 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {users.map((user) => (
                  <button
                    key={user.user_id}
                    onClick={() => toggleUser(user.user_id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      selectedUsers.includes(user.user_id)
                        ? "border-sky-600 bg-sky-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{user.full_name}</div>
                        <div className="text-xs text-slate-500">{user.role}</div>
                      </div>
                      {selectedUsers.includes(user.user_id) && (
                        <div className="w-5 h-5 rounded-full bg-sky-600 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleClose}
            disabled={creating}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || selectedUsers.length === 0}
            className="px-6 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}
