import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AssetListPage from './pages/assets/AssetListPage';
import AssetDetailPage from './pages/assets/AssetDetailPage';
import AssetFormPage from './pages/assets/AssetFormPage';
import IssueListPage from './pages/issues/IssueListPage';
import IssueFormPage from './pages/issues/IssueFormPage';
import IssueDetailPage from './pages/issues/IssueDetailPage';
import WorkOrderListPage from './pages/work-orders/WorkOrderListPage';
import WorkOrderFormPage from './pages/work-orders/WorkOrderFormPage';
import WorkOrderDetailPage from './pages/work-orders/WorkOrderDetailPage';
import ServiceVisitListPage from './pages/service-visits/ServiceVisitListPage';
import ServiceVisitDetailPage from './pages/service-visits/ServiceVisitDetailPage';
import PMPage from './pages/pm/PMPage';
import ReportsPage from './pages/reports/ReportsPage';
import PartsPage from './pages/parts/PartsPage';
import CostsPage from './pages/costs/CostsPage';
import AuditLogPage from './pages/audit/AuditLogPage';
import SettingsPage from './pages/settings/SettingsPage';
import VendorListPage from './pages/vendors/VendorListPage';
import VendorDetailPage from './pages/vendors/VendorDetailPage';
import TechnicianListPage from './pages/technicians/TechnicianListPage';
import MyJobsPage from './pages/jobs/MyJobsPage';
import UserProfilePage from './pages/users/UserProfilePage';
import LiveStaffPage from './pages/admin/LiveStaffPage';
import TechnicianPortalPage from './pages/portal/TechnicianPortalPage';
import TaskListPage from './pages/tasks/TaskListPage';
import TaskDetailPage from './pages/tasks/TaskDetailPage';
import AssetAnalyticsPage from './pages/assets/AssetAnalyticsPage';
import PrintHubLayout from './pages/print-hub/PrintHubLayout';
import WhatsAppInboxPage from './pages/print-hub/WhatsAppInboxPage';
import PrintQueuePage from './pages/print-hub/PrintQueuePage';
import SelfServiceOrdersPage from './pages/print-hub/SelfServiceOrdersPage';
import CustomerTokensPage from './pages/print-hub/CustomerTokensPage';
import AdvertisementsPage from './pages/print-hub/AdvertisementsPage';
import BranchQRCodesPage from './pages/print-hub/BranchQRCodesPage';
import PrintAnalyticsPage from './pages/print-hub/PrintAnalyticsPage';
import SystemDiagnosticsPage from './pages/admin/SystemDiagnosticsPage';
import BranchListPage from './pages/branches/BranchListPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore(s => s.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore(s => s.accessToken);
  if (accessToken) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  { path: '/login', element: <PublicRoute><LoginPage /></PublicRoute> },
  { path: '/portal/service/:token', element: <TechnicianPortalPage /> },
  {
    path: '/',
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'branches', element: <BranchListPage /> },
      { path: 'profile', element: <UserProfilePage /> },
      // Internal Tasks (Operational Work Assignments)
      { path: 'tasks', element: <TaskListPage /> },
      { path: 'tasks/:id', element: <TaskDetailPage /> },
      // Print & WhatsApp Service Hub (Plugin Module)
      {
        path: 'print-hub',
        element: <PrintHubLayout />,
        children: [
          { index: true, element: <Navigate to="queue" replace /> },
          { path: 'queue', element: <PrintQueuePage /> },
          { path: 'inbox', element: <WhatsAppInboxPage /> },
          { path: 'self-service', element: <SelfServiceOrdersPage /> },
          { path: 'tokens', element: <CustomerTokensPage /> },
          { path: 'ads', element: <AdvertisementsPage /> },
          { path: 'qr', element: <BranchQRCodesPage /> },
          { path: 'analytics', element: <PrintAnalyticsPage /> },
        ],
      },
      // Assets
      { path: 'assets', element: <AssetListPage /> },
      { path: 'assets/analytics', element: <AssetAnalyticsPage /> },
      { path: 'assets/new', element: <AssetFormPage /> },
      { path: 'assets/:id', element: <AssetDetailPage /> },
      { path: 'assets/:id/edit', element: <AssetFormPage /> },
      // Issues
      { path: 'issues', element: <IssueListPage /> },
      { path: 'issues/raise', element: <IssueFormPage /> },
      { path: 'issues/:id', element: <IssueDetailPage /> },
      // Work Orders
      { path: 'work-orders', element: <WorkOrderListPage /> },
      { path: 'work-orders/new', element: <WorkOrderFormPage /> },
      { path: 'work-orders/:id', element: <WorkOrderDetailPage /> },
      // Service Visits
      { path: 'service-visits', element: <ServiceVisitListPage /> },
      { path: 'service-visits/:id', element: <ServiceVisitDetailPage /> },
      // My Jobs (TECHNICIAN role)
      { path: 'jobs', element: <MyJobsPage /> },
      // PM
      { path: 'pm', element: <PMPage /> },
      // Vendors
      { path: 'vendors', element: <VendorListPage /> },
      { path: 'vendors/:id', element: <VendorDetailPage /> },
      // Technicians
      { path: 'technicians', element: <TechnicianListPage /> },
      // Admin
      { path: 'admin/live-staff', element: <LiveStaffPage /> },
      { path: 'admin/diagnostics', element: <SystemDiagnosticsPage /> },
      // My Jobs (Technician)
      { path: 'my-jobs', element: <MyJobsPage /> },
      // Parts / Costs
      { path: 'parts', element: <PartsPage /> },
      { path: 'costs', element: <CostsPage /> },
      // Reports
      { path: 'reports', element: <ReportsPage /> },
      // Audit
      { path: 'audit', element: <AuditLogPage /> },
      // Settings
      { path: 'settings', element: <SettingsPage /> },
      // Fallback
      { path: '*', element: <div className="p-8 text-center text-gray-500">Page not found.</div> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
