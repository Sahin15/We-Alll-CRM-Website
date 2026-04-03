import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Layouts
import MainLayout from "../components/layout/MainLayout";
import AuthLayout from "../components/layout/AuthLayout";

// Protected Routes
import ProtectedRoute from "./ProtectedRoute";
import RoleBasedRoute from "./RoleBasedRoute";

// Diagnostics
import NotificationDiagnostics from "../pages/NotificationDiagnostics";

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
import AssignedWorkPage from "../pages/employee/AssignedWorkPage";
import MyMeetings from "../pages/employee/MyMeetings";
import TeamDirectory from "../pages/employee/TeamDirectory";
import MySalarySlips from "../pages/employee/MySalarySlips";
import MySalaryPreview from "../pages/employee/MySalaryPreview";

// HR Pages
import SalaryManagement from "../pages/hr/SalaryManagement";
import HRSalaryPreviewManagement from "../components/salary/HRSalaryPreviewManagement";
import TemplateManagement from "../components/salary/TemplateManagement";
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
import EnhancedEmployeeWorkView from "../pages/employees/EnhancedEmployeeWorkView";
import EmployeeProfileManagement from "../components/hr/EmployeeProfileManagement";

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
import OvertimeStatistics from "../pages/attendance/OvertimeStatistics";

// Work Log Pages
import MyWorkLog from "../pages/worklog/MyWorkLog";
import WorkLogHistory from "../pages/worklog/WorkLogHistory";
import WorkLogManagement from "../pages/worklog/WorkLogManagement";
import HoDWorkLogReview from "../pages/worklog/HoDWorkLogReview";

// Client Pages
import ClientList from "../pages/clients/ClientList";
import ClientDetails from "../pages/clients/ClientDetails";

// Raw Data Sheet
import RawDataList from "../pages/raw-data/RawDataList";
import CallerQueuePage from "../pages/raw-data/CallerQueuePage";
import RawDataDashboard from "../pages/raw-data/RawDataDashboard";

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
import EnhancedAdminWorkCalendarOverview from "../pages/work-calendar/EnhancedAdminWorkCalendarOverview";

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

// Notification Management Pages
import NotificationManagement from "../components/admin/NotificationManagement";
import NotificationDashboard from "../components/notifications/NotificationDashboard";
import NotificationSettings from "../components/notifications/NotificationSettings";

// Holiday Management
import HolidayManagement from "../components/hr/HolidayManagement";

// Expense Pages
import MyExpenses from "../pages/expenses/MyExpenses";
import CreateExpense from "../pages/expenses/CreateExpense";
import ExpenseDetails from "../pages/expenses/ExpenseDetails";
import EditExpense from "../pages/expenses/EditExpense";
import ExpenseManagementConsolidated from "../pages/expenses/ExpenseManagementConsolidated";
import BudgetManagement from "../pages/expenses/BudgetManagement";

// Company Management Pages
import MeetingManagement from "../pages/meetings/MeetingManagement";
import PolicyManagement from "../pages/policies/PolicyManagement";
import AnnouncementManagement from "../pages/announcements/AnnouncementManagement";
import ReportsAnalytics from "../pages/reports/ReportsAnalytics";

// Error Pages
import NotFound from "../pages/errors/NotFound";
import Unauthorized from "../pages/errors/Unauthorized";
import GrowthSummitFinal from "../pages/GrowthSummitFinal";

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
      
      {/* Growth Summit 2026 Landing Page - Public Route */}
      <Route path="/growth-summit-2026" element={<GrowthSummitFinal />} />
      

      
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
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <UserList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <UserDetails />
            </RoleBasedRoute>
          }
        />

        {/* Employee Management - HR/Admin */}
        <Route
          path="/employees"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <EmployeeList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/employees/add"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <AddEmployee />
            </RoleBasedRoute>
          }
        />

        <Route
          path="/employees/:userId/profile"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <EmployeeProfileManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/employees/:userId/work"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <EnhancedEmployeeWorkView />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/employees/:userId"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <EmployeeProfileManagement />
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
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <LeaveRequests />
            </RoleBasedRoute>
          }
        />

        {/* Salary Management */}
        <Route
          path="/salary-management"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "accounts", "manager"]}>
              <SalaryManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/salary-preview-management"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "accounts", "manager"]}>
              <HRSalaryPreviewManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/salary-templates"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "accounts", "manager"]}>
              <TemplateManagement />
            </RoleBasedRoute>
          }
        />

        {/* Attendance Management */}
        <Route path="/attendance/my-attendance" element={<MyAttendance />} />
        <Route
          path="/attendance/tracking"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "hod", "manager"]}>
              <AttendanceTracking />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/attendance/overtime-statistics"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <OvertimeStatistics />
            </RoleBasedRoute>
          }
        />

        {/* Work Log Management */}
        <Route path="/worklog/today" element={<MyWorkLog />} />
        <Route path="/worklog/history" element={<WorkLogHistory />} />
        <Route
          path="/admin/worklog-management"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <WorkLogManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/hod/worklog-review"
          element={
            <RoleBasedRoute allowedRoles={["hod"]}>
              <HoDWorkLogReview />
            </RoleBasedRoute>
          }
        />

        {/* Employee Portal Routes */}
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/employee/my-work" element={<MyWorkPage />} />
        <Route path="/employee/assigned-work" element={<AssignedWorkPage />} />
        <Route path="/employee/meetings" element={<MyMeetings />} />
        <Route path="/employee/attendance" element={<EmployeeMyAttendance />} />
        <Route path="/employee/attendance-report/:employeeId" element={<EmployeeAttendanceReport />} />
        <Route path="/employee/leaves" element={<EmployeeMyLeaves />} />
        <Route path="/employee/salary-slips" element={<MySalarySlips />} />
        <Route path="/employee/salary-preview" element={<MySalaryPreview />} />
        <Route path="/employee/projects" element={<MyProjects />} />
        <Route path="/employee/time-tracking" element={<TimeTracking />} />
        <Route path="/employee/team" element={<TeamDirectory />} />
        <Route path="/employee/announcements" element={<Announcements />} />
        <Route path="/employee/notifications" element={<Announcements />} />
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
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "manager"]}>
              <AdminSettings />
            </RoleBasedRoute>
          }
        />
        
        {/* Holiday Management Routes */}
        <Route
          path="/hr/holidays"
          element={
            <RoleBasedRoute allowedRoles={["hr"]}>
              <HolidayManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/holidays"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "manager"]}>
              <HolidayManagement />
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
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "employee", "hod", "manager"]}>
              <ClientList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "employee", "hod", "manager"]}>
              <ClientDetails />
            </RoleBasedRoute>
          }
        />

        {/* Raw Data Sheet - Before Leads */}
        <Route
          path="/raw-data"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "employee", "hod", "manager"]}>
              <RawDataList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/raw-data/queue"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "employee", "hod", "manager"]}>
              <CallerQueuePage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/raw-data/dashboard"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <RawDataDashboard />
            </RoleBasedRoute>
          }
        />

        {/* Lead Management */}
        <Route
          path="/leads"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "employee", "hod", "accounts", "manager"]}>
              <LeadList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/leads/:id"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "employee", "hod", "accounts", "manager"]}>
              <LeadDetails />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/leads/:id/edit"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "employee", "hod", "accounts", "manager"]}>
              <LeadList />
            </RoleBasedRoute>
          }
        />



        {/* Project Management */}
        <Route path="/projects" element={<ProjectListPage />} />
        <Route path="/projects-old" element={<ProjectList />} />
        <Route path="/projects/:id" element={<ProjectWorkspace />} />
        <Route path="/projects/:id/old" element={<ProjectDetails />} />

        {/* Work Items Management - For Notification Links */}
        <Route path="/work-items/:id" element={<MyWorkPage />} />
        
        {/* Employee Slots - For Notification Links */}
        <Route path="/employee/slots" element={<MyWorkPage />} />
        <Route path="/employee/slots/:id" element={<MyWorkPage />} />

        {/* Calendar Views */}
        <Route path="/calendar" element={<CalendarPage />} />

        {/* Work Calendar Routes */}
        <Route
          path="/work-calendar/my-calendar"
          element={
            <RoleBasedRoute allowedRoles={["employee", "admin", "superadmin", "hr", "hod", "manager"]}>
              <MyWorkCalendar />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/work-calendar/admin-overview"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <AdminWorkCalendarOverview />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/work-calendar/enhanced-admin-overview"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <EnhancedAdminWorkCalendarOverview />
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
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "manager"]}>
              <AdminBillingDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "manager"]}>
              <ServiceManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/plans"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "manager"]}>
              <PlanManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/subscriptions"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "manager"]}>
              <SubscriptionManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/invoices"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "manager"]}>
              <InvoiceManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "manager"]}>
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

        {/* Company Management Routes */}
        <Route
          path="/meetings"
          element={<MeetingManagement />}
        />
        <Route
          path="/policies"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <PolicyManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/announcements"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <AnnouncementManagement />
            </RoleBasedRoute>
          }
        />
        
        {/* Reports & Analytics */}
        <Route
          path="/reports"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <ReportsAnalytics />
            </RoleBasedRoute>
          }
        />

        {/* Notification Management Routes */}
        <Route
          path="/admin/notifications/manage"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "manager"]}>
              <NotificationManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/notifications/create"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "manager"]}>
              <NotificationManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/notifications/dashboard"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "manager"]}>
              <NotificationDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/notifications/settings"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "manager"]}>
              <NotificationSettings />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/notifications/preferences"
          element={<NotificationSettings />}
        />

        {/* Expense Management Routes */}
        <Route
          path="/expenses/my-expenses"
          element={
            <RoleBasedRoute allowedRoles={["employee", "hod", "manager", "hr", "admin", "superadmin"]}>
              <MyExpenses />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/expenses/create"
          element={
            <RoleBasedRoute allowedRoles={["employee", "hod", "manager", "hr", "admin", "superadmin"]}>
              <CreateExpense />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/expenses/:id"
          element={
            <RoleBasedRoute allowedRoles={["employee", "hod", "manager", "hr", "admin", "superadmin"]}>
              <ExpenseDetails />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/expenses/:id/edit"
          element={
            <RoleBasedRoute allowedRoles={["employee", "hod", "manager", "hr", "admin", "superadmin"]}>
              <EditExpense />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/expenses/approvals"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <ExpenseManagementConsolidated />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/expenses/management"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <ExpenseManagementConsolidated />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/expenses/reimbursement"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <ExpenseManagementConsolidated />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/expenses/search"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <ExpenseManagementConsolidated />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/expenses/analytics"
          element={
            <RoleBasedRoute allowedRoles={["employee", "hod", "manager", "hr", "admin", "superadmin"]}>
              <ExpenseManagementConsolidated />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/expenses/budget"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <ExpenseManagementConsolidated />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/expenses/reports"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <ExpenseManagementConsolidated />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/expenses/budget-management"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
              <BudgetManagement />
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


