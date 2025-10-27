import { BackButton } from "@/components/navigation/BackButton";
import UserTable from "@/components/admin/UserTable";

export default function AdminAllUsers() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        <BackButton to="/admin/home" label="Retour à l'admin" />

        <UserTable
          title="Tous les utilisateurs"
          description="Vue complète de tous les comptes (debug)"
          showCreateButton={false}
        />
      </div>
    </div>
  );
}
