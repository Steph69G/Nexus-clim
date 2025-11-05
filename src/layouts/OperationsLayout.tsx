import { Outlet } from "react-router-dom";
import useSyncFiltersWithUrl from "@/hooks/useSyncFiltersWithUrl";
import usePersistOperationsFilters from "@/hooks/usePersistOperationsFilters";

export default function OperationsLayout() {
  useSyncFiltersWithUrl();
  usePersistOperationsFilters();
  return <Outlet />;
}
