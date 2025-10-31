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

// Leave Pages
import MyLeaves from "../pages/leaves/MyLeaves";
import LeaveRequests from "../pages/leaves/LeaveRequests";

// Attendance Pages
import MyAttendance from "../pages/attendance/MyAttendance";
import AttendanceTracking from "../pages/attendance/AttendanceTracking";

// Client Pages
import ClientList from "../pages/clients/ClientList";
import ClientDetails from "../pages/clients/ClientDetails";

// Project Pages
import ProjectList from "../pages/projects/ProjectList";
import ProjectDetails from "../pages/projects/ProjectDetails";

// Profile Pages
import MyProfile from "../pages/profile/MyProfile";

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
        <Route
          path="/departments"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr"]}>
              <DepartmentList />
            </RoleBasedRoute>
          }
        />

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

        {/* Project Management */}
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />

        {/* Profile */}
        <Route path="/profile" element={<MyProfile />} />

        {/* Error Pages */}
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Route>

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
