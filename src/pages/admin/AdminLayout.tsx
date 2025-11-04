import { Outlet } from "react-router-dom";
import ChatBootstrap from "@/app/ChatBootstrap";

export default function AdminLayout() {
  return (
    <div className="p-6">
      <ChatBootstrap />
      <header className="mb-4 font-medium">Zone Admin</header>
      <Outlet />
    </div>
  );
}
