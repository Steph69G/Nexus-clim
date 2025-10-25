import { useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { CreateContractModal } from "@/components/contracts/CreateContractModal";
import SubPageLayout from "@/layouts/SubPageLayout";

export default function ContractCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(true);

  const clientId = searchParams.get("client_id");

  const handleSuccess = () => {
    navigate("/admin/contracts");
  };

  const handleClose = () => {
    setIsModalOpen(false);
    navigate("/admin/contracts");
  };

  return (
    <SubPageLayout fallbackPath="/admin/contracts">
      <CreateContractModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
        initialClientId={clientId || undefined}
      />
    </SubPageLayout>
  );
}
