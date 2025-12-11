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
import EmployeeDashboard from "../pages/employee/EmployeeDashboard";
import ClientDashboard from "../pages/dashboard/ClientDashboard";
import HoDDashboard from "../pages/hod/HoDDashboard";

// Employee Pages
import MyProjects from "../pages/employee/MyProjects";
import MyWorkPage from "../pages/employee/MyWorkPage";
import TeamDirectory from "../pages/employee/TeamDirectory";
import Announcements from "../pages/employee/Announcements";
import EmployeeMyAttendance from "../pages/employee/MyAttendance";
import EmployeeMyLeaves from "../pages/employee/MyLeaves";
import EmployeeAttendanceReport from "../pages/employee/EmployeeAttendanceReport";
import TimeTracking from "../pages/employee/TimeTracking";
import Policies from "../pages/employee/Policies";
import Settings from "../pages/employee/Settings";
// Removed old imports: MySlots, MyWork, MyTasks, MyProfileEnhanced
import HRSettings from "../pages/hr/HRSettings";
import AdminSettings from "../pages/admin/AdminSettings";
import HODSettings from "../pages/hod/HODSettings";

// User Pages
import UserList from "../pages/users/UserList";
import UserDetails from "../pages/users/UserDetails";

// Employee Management Pages
import EmployeeList from "../pages/employees/EmployeeList";
import AddEmployee from "../pages/employees/AddEmployee";
import EditEmployee from "../pages/employees/EditEmployee";
import EmployeeWorkDetails from "../pages/employees/EmployeeWorkDetails";

// Department Pages
import DepartmentList from "../pages/departments/DepartmentList";
import DepartmentDetails from "../pages/departments/DepartmentDetails";

// Leave Pages
import MyLeaves from "../pages/leaves/MyLeaves";
import LeaveRequests from "../pages/leaves/LeaveRequests";
import LeaveManagement from "../pages/leaves/LeaveManagement";

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
import ProjectListPage from "../pages/projects/ProjectListPage";
import ProjectDetails from "../pages/projects/ProjectDetails";
import ProjectWorkspace from "../pages/projects/ProjectWorkspace";

// Calendar Pages
import CalendarPage from "../pages/calendar/CalendarPage";
// Removed old import: ContentCalendar

// Work Calendar Pages
import MyWorkCalendar from "../pages/work-calendar/MyWorkCalendar";
import AdminWorkCalendarOverview from "../pages/work-calendar/AdminWorkCalendarOverview";

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
        // Employee dashboard with HoD/HoP sections if applicable
        return <EmployeeDashboard />;
    }
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Route>
      
      {/* Registration route - Only accessible from inside app by admins */}
      <Route path="/register" element={<Register />} />

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

        {/* Employee Management - HR/Admin */}
        <Route
          path="/employees"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr"]}>
              <EmployeeList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/employees/add"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr"]}>
              <AddEmployee />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/employees/:id/edit"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr"]}>
              <EditEmployee />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/employees/:id/work"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr"]}>
              <EmployeeWorkDetails />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/employees/:id"
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
        <Route path="/leaves" element={<LeaveManagement />} />
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

        {/* Employee Portal Routes */}
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/employee/my-work" element={<MyWorkPage />} />
        <Route path="/employee/attendance" element={<EmployeeMyAttendance />} />
        <Route path="/employee/attendance-report/:employeeId" element={<EmployeeAttendanceReport />} />
        <Route path="/employee/leaves" element={<EmployeeMyLeaves />} />
        <Route path="/employee/projects" element={<MyProjects />} />
        <Route path="/employee/time-tracking" element={<TimeTracking />} />
        <Route path="/employee/team" element={<TeamDirectory />} />
        <Route path="/employee/announcements" element={<Announcements />} />
        <Route path="/employee/policies" element={<Policies />} />
        <Route path="/employee/settings" element={<Settings />} />
        <Route path="/employee/profile" element={<MyProfile />} />
        {/* Removed old routes: /my-work-old, /slots, /tasks */}

        {/* Settings Routes for Different Roles */}
        <Route
          path="/hr/settings"
          element={
            <RoleBasedRoute allowedRoles={["hr"]}>
              <HRSettings />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
              <AdminSettings />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/hod/settings"
          element={
            <RoleBasedRoute allowedRoles={["hod"]}>
              <HODSettings />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/hod/dashboard"
          element={
            <RoleBasedRoute allowedRoles={["hod"]}>
              <HoDDashboard />
            </RoleBasedRoute>
          }
        />

        {/* Client Management */}
        <Route
          path="/clients"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr"]}>
              <ClientList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr"]}>
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
        <Route path="/projects" element={<ProjectListPage />} />
        <Route path="/projects-old" element={<ProjectList />} />
        <Route path="/projects/:id" element={<ProjectWorkspace />} />
        <Route path="/projects/:id/old" element={<ProjectDetails />} />

        {/* Calendar Views */}
        <Route path="/calendar" element={<CalendarPage />} />

        {/* Work Calendar Routes */}
        <Route
          path="/work-calendar/my-calendar"
          element={
            <RoleBasedRoute allowedRoles={["employee", "admin", "superadmin", "hr", "hod"]}>
              <MyWorkCalendar />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/work-calendar/admin-overview"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr"]}>
              <AdminWorkCalendarOverview />
            </RoleBasedRoute>
          }
        />

        {/* Profile - Unified */}
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/my-profile" element={<MyProfile />} />
        {/* Removed old routes: /content-calendar, MyProfileEnhanced */}

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
