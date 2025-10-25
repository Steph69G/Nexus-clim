import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { CreateContractModal } from "@/components/contracts/CreateContractModal";
import SubPageLayout from "@/layouts/SubPageLayout";

export default function ContractCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(true);

  const clientId = searchParams.get("client_id");

  useEffect(() => {
    if (!isModalOpen) {
      navigate("/admin/contracts");
    }
  }, [isModalOpen, navigate]);

  const handleSuccess = () => {
    navigate("/admin/contracts");
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  return (
    <SubPageLayout fallbackPath="/admin/contracts">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Créer un nouveau contrat
        </h1>
        <p className="text-gray-600 mb-8">
          Remplissez le formulaire pour créer un contrat de maintenance.
        </p>

        <CreateContractModal
          isOpen={isModalOpen}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      </div>
    </SubPageLayout>
  );
}
