import { BackButton } from "@/components/navigation/BackButton";
import UserTable from "@/components/admin/UserTable";

export default function AdminUsers() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        <BackButton to="/admin/ressources" label="Retour aux Ressources" />

        <UserTable
          roleFilter={["admin", "ADMIN", "tech", "TECH", "sal", "SAL"]}
          title="Équipe interne"
          description="Techniciens, commerciaux et administrateurs"
          showCreateButton={true}
        />
      </div>
    </div>
  );
}
