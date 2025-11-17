import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Layouts
import MainLayout from "../components/layout/MainLayout";
import AuthLayout from "../components/layout/AuthLayout";

// Protected Routes
import ProtectedRoute from "./ProtectedRoute";
import RoleBasedRoute from "./RoleBasedRoute";

// Auth Pages
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

// Dashboard Pages
import SuperAdminDashboard from "../pages/dashboard/SuperAdminDashboard";
import AdminDashboard from "../pages/dashboard/AdminDashboard";
import HRDashboard from "../pages/dashboard/HRDashboard";
import AccountsDashboard from "../pages/dashboard/AccountsDashboard";
import EmployeeDashboard from "../pages/dashboard/EmployeeDashboard";
import ClientDashboard from "../pages/dashboard/ClientDashboard";

// User Pages
import UserList from "../pages/users/UserList";
import UserDetails from "../pages/users/UserDetails";

// Department Pages
import DepartmentList from "../pages/departments/DepartmentList";
import DepartmentDetails from "../pages/departments/DepartmentDetails";

// Leave Pages
import MyLeaves from "../pages/leaves/MyLeaves";
import LeaveRequests from "../pages/leaves/LeaveRequests";

// Attendance Pages
import MyAttendance from "../pages/attendance/MyAttendance";
import AttendanceTracking from "../pages/attendance/AttendanceTracking";

// Client Pages
import ClientList from "../pages/clients/ClientList";
import ClientDetails from "../pages/clients/ClientDetails";

// Lead Pages
import LeadList from "../pages/leads/LeadList";
import LeadDetails from "../pages/leads/LeadDetails";

// Project Pages
import ProjectList from "../pages/projects/ProjectList";
import ProjectDetails from "../pages/projects/ProjectDetails";

// Profile Pages
import MyProfile from "../pages/profile/MyProfile";

// Admin Billing Pages
import AdminBillingDashboard from "../pages/admin/AdminBillingDashboard";
import ServiceManagement from "../pages/admin/ServiceManagement";
import PlanManagement from "../pages/admin/PlanManagement";
import SubscriptionManagement from "../pages/admin/SubscriptionManagement";
import InvoiceManagement from "../pages/admin/InvoiceManagement";
import PaymentVerification from "../pages/admin/PaymentVerification";

// Client Billing Pages
import ClientBillingDashboard from "../pages/client/ClientBillingDashboard";
import ClientSubscriptions from "../pages/client/ClientSubscriptions";
import ClientInvoices from "../pages/client/ClientInvoices";
import ClientPayments from "../pages/client/ClientPayments";

// Error Pages
import NotFound from "../pages/errors/NotFound";
import Unauthorized from "../pages/errors/Unauthorized";

const AppRoutes = () => {
  const { user } = useAuth();

  const getDashboardByRole = () => {
    if (!user) return <Navigate to="/login" replace />;

    switch (user.role) {
      case "superadmin":
        return <SuperAdminDashboard />;
      case "admin":
        return <AdminDashboard />;
      case "hr":
        return <HRDashboard />;
      case "accounts":
        return <AccountsDashboard />;
      case "client":
        return <ClientDashboard />;
      default:
        return <EmployeeDashboard />;
    }
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Route>

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard - Role-based */}
        <Route path="/dashboard" element={getDashboardByRole()} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* User Management - Admin/SuperAdmin */}
        <Route
          path="/users"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr"]}>
              <UserList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr"]}>
              <UserDetails />
            </RoleBasedRoute>
          }
        />

        {/* Department Management */}
        <Route path="/departments" element={<DepartmentList />} />
        <Route path="/departments/:id" element={<DepartmentDetails />} />

        {/* Leave Management */}
        <Route path="/leaves/my-leaves" element={<MyLeaves />} />
        <Route
          path="/leaves/requests"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "hod"]}>
              <LeaveRequests />
            </RoleBasedRoute>
          }
        />

        {/* Attendance Management */}
        <Route path="/attendance/my-attendance" element={<MyAttendance />} />
        <Route
          path="/attendance/tracking"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "hod"]}>
              <AttendanceTracking />
            </RoleBasedRoute>
          }
        />

        {/* Client Management */}
        <Route
          path="/clients"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
              <ClientList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
              <ClientDetails />
            </RoleBasedRoute>
          }
        />

        {/* Lead Management */}
        <Route
          path="/leads"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
              <LeadList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/leads/:id"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
              <LeadDetails />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/leads/:id/edit"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
              <LeadList />
            </RoleBasedRoute>
          }
        />

        {/* Project Management */}
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />

        {/* Profile */}
        <Route path="/profile" element={<MyProfile />} />

        {/* Admin Billing Routes */}
        <Route
          path="/admin/billing"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts"]}>
              <AdminBillingDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts"]}>
              <ServiceManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/plans"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts"]}>
              <PlanManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/subscriptions"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts"]}>
              <SubscriptionManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/invoices"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts"]}>
              <InvoiceManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts"]}>
              <PaymentVerification />
            </RoleBasedRoute>
          }
        />

        {/* Client Billing Routes */}
        <Route
          path="/client/billing"
          element={
            <RoleBasedRoute allowedRoles={["client"]}>
              <ClientBillingDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/client/subscriptions"
          element={
            <RoleBasedRoute allowedRoles={["client"]}>
              <ClientSubscriptions />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/client/invoices"
          element={
            <RoleBasedRoute allowedRoles={["client"]}>
              <ClientInvoices />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/client/payments"
          element={
            <RoleBasedRoute allowedRoles={["client"]}>
              <ClientPayments />
            </RoleBasedRoute>
          }
        />

        {/* Error Pages */}
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Route>

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
