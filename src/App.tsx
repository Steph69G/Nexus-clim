import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

import AuthProvider from "@/auth/AuthProvider";
import RootLayout from "@/layouts/RootLayout";
import ToastProvider from "@/ui/toast/ToastProvider";

import AppHome from "@/pages/app/AppHome";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import Forbidden from "@/pages/Forbidden";
import AdminHome from "@/pages/admin/AdminHome";
import AdminMissions from "@/pages/admin/AdminMissions";
import AdminMissionCreate from "@/pages/admin/AdminMissionCreate";
import AdminOffersPage from "@/pages/admin/AdminOffersPage";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminClientList from "@/pages/admin/AdminClientList";
import AdminSubcontractors from "@/pages/admin/AdminSubcontractors";
import AdminUserProfile from "@/pages/admin/AdminUserProfile";
import MissionEditPage from "@/pages/admin/MissionEditPage";
import AdminAccounting from "@/pages/admin/AdminAccounting";
import AdminContracts from "@/pages/admin/AdminContracts";
import CommunicationPage from "@/pages/communication/CommunicationPage";
import TchatPage from "@/pages/communication/TchatPage";
import MessagesPage from "@/pages/communication/MessagesPage";
import NotificationsPage from "@/pages/communication/NotificationsPage";
import AdminKpiDashboard from "@/pages/admin/AdminKpiDashboard";
import AdminEmergencyRequests from "@/pages/admin/AdminEmergencyRequests";
import AdminInvoices from "@/pages/admin/AdminInvoices";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminPlanning from "@/pages/admin/AdminPlanning";
import AdminPlanningMultiTech from "@/pages/admin/AdminPlanningMultiTech";
import AdminSatisfaction from "@/pages/admin/AdminSatisfaction";
import AdminSurveySender from "@/pages/admin/AdminSurveySender";
import AdminStock from "@/pages/admin/AdminStock";
import GenerateInvoicePage from "@/pages/admin/GenerateInvoicePage";
import AdminTimesheet from "@/pages/admin/AdminTimesheet";
import CreateInterventionReport from "@/pages/admin/CreateInterventionReport";
import AdminVehicles from "@/pages/admin/AdminVehicles";
import AdminOperations from "@/pages/admin/AdminOperations";
import AdminComptabilite from "@/pages/admin/AdminComptabilite";
import AdminClients from "@/pages/admin/AdminClients";
import AdminRessources from "@/pages/admin/AdminRessources";
import AdminLogistique from "@/pages/admin/AdminLogistique";
import AdminPilotage from "@/pages/admin/AdminPilotage";
import SatisfactionSurvey from "@/pages/public/SatisfactionSurvey";
import SatisfactionSurveyDynamic from "@/pages/public/SatisfactionSurveyDynamic";
import AdminSurveyTemplates from "@/pages/admin/AdminSurveyTemplates";
import ContractDetailPage from "@/pages/contracts/ContractDetailPage";
import ClientDashboard from "@/pages/client/ClientDashboard";
import ClientPortal from "@/pages/client/ClientPortal";
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
import ProfilePage from "@/pages/account/ProfilePage";
import AdminInvoicesPage from "@/pages/admin/accounting/AdminInvoices";
import InvoiceDetailPage from "@/pages/admin/accounting/InvoiceDetailPage";
import AdminQuotesPage from "@/pages/admin/accounting/AdminQuotes";
import QuoteDetailPage from "@/pages/admin/accounting/QuoteDetailPage";
import CreateQuotePage from "@/pages/admin/accounting/CreateQuotePage";
import AdminPayments from "@/pages/admin/accounting/AdminPayments";
import AdminReminders from "@/pages/admin/accounting/AdminReminders";
import AdminReports from "@/pages/admin/accounting/AdminReports";
import AdminPilotageReports from "@/pages/admin/AdminPilotageReports";
import AdminStockPage from "@/pages/admin/logistics/AdminStockPage";
import AdminEquipments from "@/pages/admin/AdminEquipments";
import AdminDocuments from "@/pages/admin/AdminDocuments";
import MyMissionsPage from "@/pages/missions/MyMissionsPage";
import MissionDetailPage from "@/pages/missions/MissionDetailPage";
import MissionPhotosPage from "@/pages/missions/MissionPhotosPage";
import AdminMapPage from "@/pages/map/AdminMapPage";
import CalendarPage from "@/pages/calendar/CalendarPage";
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
        { path: "register", element: <RegisterPage /> },
        { path: "forbidden", element: <Forbidden /> },
        { path: "redirect", element: <RoleRedirect /> },

        // Enquête de satisfaction publique
        { path: "survey", element: <SatisfactionSurveyDynamic /> },

        // Alias pour l'ancien lien /my/missions
{ path: "my/missions", element: <Navigate to="/app/missions/my" replace /> },

// Alias pratique si on tape /app/missions sans /my
{ path: "app/missions", element: <Navigate to="/app/missions/my" replace /> },



        // Carte
        { path: "map", element: <MapPage /> },
        { path: "admin/map", element: <RequireRole allow={["admin"]} element={<AdminMapPage />} /> },

        // Calendrier
        { path: "calendar", element: <RequireRole allow={["admin", "sal", "tech", "st"]} element={<CalendarPage />} /> },

        // Admin (protégé)
        { path: "admin", element: <RequireRole allow={["admin"]} element={<AdminHome />} /> },
        { path: "admin/missions", element: <RequireRole allow={["admin"]} element={<AdminMissions />} /> },
        { path: "admin/operations", element: <RequireRole allow={["admin", "sal"]} element={<AdminOperations />} /> },
        { path: "admin/comptabilite", element: <RequireRole allow={["admin", "sal"]} element={<AdminComptabilite />} /> },
        { path: "admin/clients", element: <RequireRole allow={["admin"]} element={<AdminClients />} /> },
        { path: "admin/ressources", element: <RequireRole allow={["admin", "sal"]} element={<AdminRessources />} /> },
        { path: "admin/logistique", element: <RequireRole allow={["admin", "sal"]} element={<AdminLogistique />} /> },
        { path: "admin/pilotage", element: <RequireRole allow={["admin"]} element={<AdminPilotage />} /> },
        { path: "admin/create", element: <RequireRole allow={["admin"]} element={<AdminMissionCreate />} /> },
        { path: "admin/offers", element: <RequireRole allow={["admin"]} element={<AdminOffersPage />} /> },
        { path: "admin/users", element: <RequireRole allow={["admin"]} element={<AdminUsers />} /> },
        { path: "admin/client-list", element: <RequireRole allow={["admin"]} element={<AdminClientList />} /> },
        { path: "admin/subcontractors", element: <RequireRole allow={["admin"]} element={<AdminSubcontractors />} /> },
        { path: "admin/profile/:userId", element: <RequireRole allow={["admin"]} element={<AdminUserProfile />} /> },
        { path: "admin/missions/:id", element: <RequireRole allow={["admin"]} element={<MissionEditPage />} /> },
        { path: "admin/accounting", element: <RequireRole allow={["admin"]} element={<AdminAccounting />} /> },
        { path: "admin/communication", element: <RequireRole allow={["admin"]} element={<CommunicationPage />} /> },
        { path: "admin/communication/tchat", element: <RequireRole allow={["admin"]} element={<TchatPage />} /> },
        { path: "admin/communication/messages", element: <RequireRole allow={["admin"]} element={<MessagesPage />} /> },
        { path: "admin/communication/notifications", element: <RequireRole allow={["admin"]} element={<NotificationsPage />} /> },
        { path: "admin/contracts", element: <RequireRole allow={["admin"]} element={<AdminContracts />} /> },
        { path: "admin/contracts/:id", element: <RequireRole allow={["admin"]} element={<ContractDetailPage />} /> },
        { path: "admin/equipments", element: <RequireRole allow={["admin"]} element={<AdminEquipments />} /> },
        { path: "admin/documents", element: <RequireRole allow={["admin"]} element={<AdminDocuments />} /> },
        { path: "admin/invoices", element: <RequireRole allow={["admin"]} element={<AdminInvoices />} /> },
        { path: "admin/emergency", element: <RequireRole allow={["admin"]} element={<AdminEmergencyRequests />} /> },
        { path: "admin/kpis", element: <RequireRole allow={["admin"]} element={<AdminKpiDashboard />} /> },
        { path: "admin/analytics", element: <RequireRole allow={["admin"]} element={<AdminAnalytics />} /> },
        { path: "admin/planning", element: <RequireRole allow={["admin"]} element={<AdminPlanning />} /> },
        { path: "admin/planning-tech", element: <RequireRole allow={["admin"]} element={<AdminPlanningMultiTech />} /> },
        { path: "admin/satisfaction", element: <RequireRole allow={["admin"]} element={<AdminSatisfaction />} /> },
        { path: "admin/surveys", element: <RequireRole allow={["admin"]} element={<AdminSurveySender />} /> },
        { path: "admin/survey-templates", element: <RequireRole allow={["admin", "sal"]} element={<AdminSurveyTemplates />} /> },
        { path: "admin/pilotage/reports", element: <RequireRole allow={["admin"]} element={<AdminPilotageReports />} /> },
        { path: "admin/stock", element: <RequireRole allow={["admin", "sal"]} element={<AdminStock />} /> },

        // Comptabilité - deep routes
        { path: "admin/comptabilite/invoices", element: <RequireRole allow={["admin", "sal"]} element={<AdminInvoicesPage />} /> },
        { path: "admin/comptabilite/invoices/:id", element: <RequireRole allow={["admin", "sal"]} element={<InvoiceDetailPage />} /> },
        { path: "admin/comptabilite/quotes", element: <RequireRole allow={["admin", "sal"]} element={<AdminQuotesPage />} /> },
        { path: "admin/comptabilite/quotes/:id", element: <RequireRole allow={["admin", "sal"]} element={<QuoteDetailPage />} /> },
        { path: "admin/comptabilite/quotes/new", element: <RequireRole allow={["admin", "sal"]} element={<CreateQuotePage />} /> },
        { path: "admin/comptabilite/payments", element: <RequireRole allow={["admin", "sal"]} element={<AdminPayments />} /> },
        { path: "admin/comptabilite/reminders", element: <RequireRole allow={["admin", "sal"]} element={<AdminReminders />} /> },
        { path: "admin/comptabilite/reports", element: <RequireRole allow={["admin", "sal"]} element={<AdminReports />} /> },

        // Logistique - deep routes
        { path: "admin/logistique/stock", element: <RequireRole allow={["admin", "sal"]} element={<AdminStockPage />} /> },
        { path: "admin/timesheet", element: <RequireRole allow={["admin", "sal"]} element={<AdminTimesheet />} /> },
        { path: "admin/vehicles", element: <RequireRole allow={["admin", "sal"]} element={<AdminVehicles />} /> },
        { path: "admin/missions/:id/generate-invoice", element: <RequireRole allow={["admin", "sal"]} element={<GenerateInvoicePage />} /> },
        { path: "admin/missions/:id/create-report", element: <RequireRole allow={["admin", "sal", "tech"]} element={<CreateInterventionReport />} /> },

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
        { path: "client/portal", element: <RequireRole allow={["client"]} element={<ClientPortal />} /> },
        { path: "client/requests", element: <RequireRole allow={["client"]} element={<ClientRequests />} /> },
        { path: "client/invoices", element: <RequireRole allow={["client"]} element={<ClientInvoices />} /> },

        // Offres (ST/SAL/Admin)
        { path: "offers", element: <RequireRole allow={["st", "sal", "admin"]} element={<OffersPage />} /> },

        // Mes missions
        { path: "app/missions/my", element: <RequireRole allow={["st", "sal", "tech", "admin"]} element={<MyMissionsPage />} /> },
        { path: "app/missions/:id", element: <RequireRole allow={["st", "sal", "tech", "admin"]} element={<MissionDetailPage />} /> },
        { path: "app/missions/:id/photos", element: <RequireRole allow={["st", "sal", "tech", "admin"]} element={<MissionPhotosPage />} /> },

        // Profil
        { path: "account/profile", element: <RequireRole allow={["admin", "st", "sal", "tech", "client"]} element={<ProfilePage />} /> },

        // Pages légales
        { path: "legal/mentions-legales", element: <MentionsLegales /> },
        { path: "legal/politique-confidentialite", element: <PolitiqueConfidentialite /> },
        { path: "legal/conditions-utilisation", element: <ConditionsUtilisation /> },
        { path: "legal/cookies", element: <PolitiqueCookies /> },

        // 404
        { path: "*", element: <div className="p-6">Page non trouvée</div> },
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
