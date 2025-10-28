import { useState, useEffect } from "react";
import { Video, Phone, Users, Search, Loader2 } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import SubPageLayout from "@/layouts/SubPageLayout";

interface User {
  user_id: string;
  full_name: string;
  phone: string | null;
  role: string;
  email: string;
}

export default function VisioPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (profile?.id) {
      loadUsers();
    }
  }, [profile?.id]);

  const loadUsers = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, role, email")
        .neq("user_id", profile.id)
        .order("full_name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallUser = (user: User) => {
    if (!user.phone) {
      alert(`${user.full_name} n'a pas renseigné son numéro de téléphone.`);
      return;
    }

    const phone = user.phone.replace(/\s/g, "");
    window.open(`https://wa.me/${phone}`, "_blank");
  };

  const handleGroupCall = () => {
    const usersWithPhone = filteredUsers.filter((u) => u.phone);

    if (usersWithPhone.length === 0) {
      alert("Aucun utilisateur avec numéro de téléphone trouvé.");
      return;
    }

    const phoneList = usersWithPhone
      .map((u) => `• ${u.full_name}: wa.me/${u.phone?.replace(/\s/g, "")}`)
      .join("\n");

    const message = `📞 Liste des contacts pour appel de groupe WhatsApp :\n\n${phoneList}\n\n💡 Créez un groupe WhatsApp avec ces numéros pour organiser votre visioconférence.`;

    navigator.clipboard.writeText(message);
    alert("Liste des contacts copiée dans le presse-papiers !");
  };

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.phone?.toLowerCase().includes(term)
    );
  });

  const usersWithPhone = filteredUsers.filter((u) => u.phone);
  const usersWithoutPhone = filteredUsers.filter((u) => !u.phone);

  return (
    <SubPageLayout
      title="Visioconférence WhatsApp"
      subtitle="Appelez vos collaborateurs directement via WhatsApp"
      icon={<Video className="w-6 h-6" />}
    >
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Video className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Lancer un appel vidéo</h2>
              <p className="text-sm text-slate-600">
                Contactez vos collègues via WhatsApp pour une visioconférence
              </p>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <button
              onClick={handleGroupCall}
              disabled={usersWithPhone.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              <Users className="w-5 h-5" />
              Copier la liste
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {usersWithPhone.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Contacts disponibles ({usersWithPhone.length})
                  </h3>
                  <div className="grid gap-3">
                    {usersWithPhone.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-green-700">
                              {user.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{user.full_name}</p>
                            <p className="text-sm text-slate-600">{user.phone}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCallUser(user)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          Appeler
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {usersWithoutPhone.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Contacts sans numéro ({usersWithoutPhone.length})
                  </h3>
                  <div className="grid gap-3">
                    {usersWithoutPhone.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-amber-700">
                              {user.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{user.full_name}</p>
                            <p className="text-sm text-amber-600">Aucun numéro de téléphone</p>
                          </div>
                        </div>
                        <span className="text-sm text-amber-600 font-medium">
                          Non disponible
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">Aucun utilisateur trouvé</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Comment ça marche ?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Appel individuel :</strong> Cliquez sur "Appeler" pour lancer un appel WhatsApp direct
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Appel de groupe :</strong> Cliquez sur "Copier la liste" pour obtenir tous les numéros et créer un groupe WhatsApp
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Numéro manquant ?</strong> Les utilisateurs doivent renseigner leur numéro dans leur profil
              </span>
            </li>
          </ul>
        </div>
      </div>
    </SubPageLayout>
  );
}
