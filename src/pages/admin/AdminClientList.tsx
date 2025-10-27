import { BackButton } from "@/components/navigation/BackButton";
import UserTable from "@/components/admin/UserTable";

export default function AdminClientList() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        <BackButton to="/admin/clients" label="Retour aux Clients & Contrats" />

        <UserTable
          roleFilter={["client", "CLIENT"]}
          title="Clients"
          description="Base clients (particuliers, entreprises, prospects)"
          showCreateButton={true}
        />
      </div>
    </div>
  );
}
