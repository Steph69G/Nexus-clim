import { Outlet } from "react-router-dom";
export default function AdminLayout() {
  return (
    <div className="p-6">
      <header className="mb-4 font-medium">Zone Admin</header>
      <Outlet />
    </div>
  );
}
