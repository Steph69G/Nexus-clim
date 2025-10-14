// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "@/auth/AuthProvider";
import ProtectedRoute from "@/routes/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import AdminMapPage from "@/pages/map/AdminMapPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminMapPage />
              </ProtectedRoute>
            }
          />
          {/* Ajoute tes autres pages privées de la même façon */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
