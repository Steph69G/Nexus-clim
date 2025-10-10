import { createBrowserRouter, RouterProvider } from "react-router-dom";

import AuthProvider from "@/auth/AuthProvider";
import RootLayout from "@/layouts/RootLayout";
import ToastProvider from "@/ui/toast/ToastProvider";

import AppHome from "@/pages/app/AppHome";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminMissionCreate from "@/pages/admin/AdminMissionCreate";
import AdminOffersPage from "@/pages/admin/AdminOffersPage";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminUserProfile from "@/pages/admin/AdminUserProfile";
import MissionEditPage from "@/pages/admin/MissionEditPage";
import ClientDashboard from "@/pages/client/ClientDashboard";
import ClientRequests from "@/pages/client/ClientRequests";
import ClientInvoices from "@/pages/client/ClientInvoices";
import TechDashboard from "@/pages/tech/TechDashboard";
import TechOffersPage from "@/pages/tech/TechOffersPage";
import TechMissionsPage from "@/pages/tech/TechMissionsPage";
import GestionEquipe from "@/pages/features/GestionEquipe";
import GeolocationIntelligente from "@/pages/features/GeolocationIntelligente";
import ApplicationMobile from "@/pages/features/ApplicationMobile";
import PlanificationAvancee from "@/pages/features/PlanificationAvancee";
import SecuriteDonnees from "@/pages/features/SecuriteDonnees";
import SuiviInterventions from "@/pages/features/SuiviInterventions";
import TechMapPage from "@/pages/tech/TechMapPage";
import ManagerHome from "@/pages/manager/ManagerHome";
import MissionsPage from "@/pages/tech/MissionsPage";
import MapPage from "@/pages/map/MapPage";
import OffersPage from "@/pages/offers/OffersPage";
import SubcontractorOffersPage from "@/pages/subcontractor/SubcontractorOffersPage";
import ProfilePage from "@/pages/account/ProfilePage";
import MyMissionsPage from "@/pages/missions/MyMissionsPage";
import MissionDetailPage from "@/pages/missions/MissionDetailPage";
import AdminMapPage from "@/pages/map/AdminMapPage";
import MentionsLegales from "@/pages/legal/MentionsLegales";
import PolitiqueConfidentialite from "@/pages/legal/PolitiqueConfidentialite";
import ConditionsUtilisation from "@/pages/legal/ConditionsUtilisation";
import PolitiqueCookies from "@/pages/legal/PolitiqueCookies";

import RoleRedirect from "@/routes/RoleRedirect";
import RequireRole from "@/routes/RequireRole";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <RootLayout />,
      children: [
        // Accueil
        { index: true, element: <AppHome /> },

        // Auth / utilitaires
        { path: "login", element: <LoginPage /> },
        { path: "redirect", element: <RoleRedirect /> },

        // Carte
        { path: "map", element: <MapPage /> },
        { path: "admin/map", element: <RequireRole allow={["admin"]} element={<AdminMapPage />} /> },

        // Admin (protégé)
        { path: "admin", element: <RequireRole allow={["admin"]} element={<AdminDashboard />} /> },
        { path: "admin/create", element: <RequireRole allow={["admin"]} element={<AdminMissionCreate />} /> },
        { path: "admin/offers", element: <RequireRole allow={["admin"]} element={<AdminOffersPage />} /> },
        { path: "admin/users", element: <RequireRole allow={["admin"]} element={<AdminUsers />} /> },
        { path: "admin/profile/:userId", element: <RequireRole allow={["admin"]} element={<AdminUserProfile />} /> },
        { path: "admin/missions/:id", element: <RequireRole allow={["admin"]} element={<MissionEditPage />} /> },

        // Manager (ouvert pour l'instant)
        { path: "manager", element: <ManagerHome /> },

        // Tech
        {
          path: "tech",
          element: <RequireRole allow={["tech"]} element={<TechDashboard />} />,
          children: [
            { path: "offers", element: <TechOffersPage /> },
            { path: "missions", element: <TechMissionsPage /> },
            { path: "map", element: <TechMapPage /> },
          ],
        },

        // Client
        { path: "client", element: <RequireRole allow={["client"]} element={<ClientDashboard />} /> },
        { path: "client/requests", element: <RequireRole allow={["client"]} element={<ClientRequests />} /> },
        { path: "client/invoices", element: <RequireRole allow={["client"]} element={<ClientInvoices />} /> },

        // Offres (ST/SAL/Admin)
        { path: "offers", element: <RequireRole allow={["st", "sal", "admin"]} element={<OffersPage />} /> },

        // Mes missions
        { path: "app/missions/my", element: <RequireRole allow={["st", "sal", "tech", "admin"]} element={<MyMissionsPage />} /> },
        { path: "app/missions/:id", element: <RequireRole allow={["st", "sal", "tech", "admin"]} element={<MissionDetailPage />} /> },

        // Profil
        { path: "account/profile", element: <RequireRole allow={["admin", "st", "sal", "tech", "client"]} element={<ProfilePage />} /> },

        // Pages légales
        { path: "legal/mentions-legales", element: <MentionsLegales /> },
        { path: "legal/politique-confidentialite", element: <PolitiqueConfidentialite /> },
        { path: "legal/conditions-utilisation", element: <ConditionsUtilisation /> },
        { path: "legal/cookies", element: <PolitiqueCookies /> },

        // 404
        { path: "*", element: <div className="p-6">404</div> },
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider
          router={router}
          future={{ v7_startTransition: true }}
        />
      </ToastProvider>
    </AuthProvider>
  );
}
