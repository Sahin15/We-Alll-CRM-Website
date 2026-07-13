import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";

const PWAShell = lazy(() => import("../pages/app/PWAShell"));
const MobileAppShell = lazy(() => import("../pages/mobileapp/MobileAppShell"));
import { useAuth } from "../context/AuthContext";
import { RouteLoadingFallback } from "../components/RouteWrapper";

// Layouts
import MainLayout from "../components/layout/MainLayout";
import AuthLayout from "../components/layout/AuthLayout";

// Protected Routes
import ProtectedRoute from "./ProtectedRoute";
import RoleBasedRoute from "./RoleBasedRoute";
import PermissionRoute from "./PermissionRoute";

// Auth Pages (eager — small, needed for first paint on /login)
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

// All feature pages — lazy-loaded per route (see lazyPages.js)
import * as Pages from "./lazyPages";

const {
  NotificationDiagnostics,
  MyProjects,
  MyWorkPage,
  AssignedWorkPage,
  MyMeetings,
  TeamDirectory,
  MySalarySlips,
  MySalaryPreview,
  Announcements,
  EmployeeMyAttendance,
  EmployeeMyLeaves,
  EmployeeAttendanceReport,
  TimeTracking,
  Policies,
  Settings,
  SalaryManagement,
  HRSalaryPreviewManagement,
  TemplateManagement,
  HRSettings,
  HiringDashboard,
  HiringRequestsManagement,
  HiringRequestDetail,
  HiringApplicationDetail,
  ApplicantCVBank,
  HiringOfferLetters,
  HoDHiringRequests,
  HoDCreateHiringRequest,
  HoDHiringRequestDetail,
  AdminSettings,
  HODSettings,
  UserList,
  UserDetails,
  EmployeeList,
  AddEmployee,
  EnhancedEmployeeWorkView,
  EmployeeProfileManagement,
  DepartmentList,
  DepartmentDetails,
  MyLeaves,
  LeaveRequests,
  LeaveManagement,
  WFHManagement,
  WorkOnLeaveDayManagement,
  MyAttendance,
  AttendanceTracking,
  OvertimeStatistics,
  MyWorkLog,
  WorkLogHistory,
  WorkLogManagement,
  HoDWorkLogReview,
  ClientList,
  ClientDetails,
  RawDataList,
  CallerQueuePage,
  RawDataDashboard,
  LeadList,
  LeadDetails,
  ProjectList,
  ProjectListPage,
  ProjectDetails,
  ProjectWorkspace,
  CalendarPage,
  MyWorkCalendar,
  AdminWorkCalendarOverview,
  EnhancedAdminWorkCalendarOverview,
  MyProfile,
  AdminBillingDashboard,
  ServiceManagement,
  PlanManagement,
  SubscriptionManagement,
  InvoiceManagement,
  PaymentVerification,
  ClientBillingDashboard,
  ClientSubscriptions,
  ClientInvoices,
  ClientPayments,
  NotificationManagement,
  NotificationDashboard,
  NotificationSettings,
  HolidayManagement,
  MyExpenses,
  CreateExpense,
  ExpenseDetails,
  EditExpense,
  ExpenseManagementConsolidated,
  BudgetManagement,
  AssetDashboard,
  AssetList,
  AddAsset,
  EditAsset,
  AssetDetails,
  AssignAsset,
  SendToRepair,
  AssignmentHistory,
  RepairLog,
  WarrantyTracker,
  MyAssets,
  AssetManagement,
  SoftwareLicenseDashboard,
  SoftwareLicenseList,
  AddSoftwareLicense,
  EditSoftwareLicense,
  SoftwareLicenseDetails,
  AssignSoftwareLicense,
  LicenseHistory,
  LicenseExpiryAlerts,
  MyLicenses,
  SoftwareLicenseManagement,
  MeetingManagement,
  PolicyManagement,
  AnnouncementManagement,
  ReportsAnalytics,
  NotFound,
  Unauthorized,
  GrowthSummitFinal,
  SupportPage,
  SupportManagement,
  ProcurementDashboard,
  MyPurchaseRequests,
  CreatePurchaseRequest,
  EditPurchaseRequest,
  PurchaseRequestDetails,
  PurchaseRequestApprovals,
  PurchaseOrderList,
  CreatePurchaseOrder,
  PurchaseOrderDetails,
  GoodsReceiptList,
  CreateGoodsReceipt,
  GoodsReceiptDetails,
  VendorList,
  CreateVendor,
  EditVendor,
  VendorDetails,
  ProcurementInvoiceList,
  CreateProcurementInvoice,
  ProcurementInvoiceDetails,
  ProcurementPaymentList,
  RecordPayment,
  ProcurementReports,
  SuperAdminDashboard,
  AdminDashboard,
  HRDashboard,
  AccountsDashboard,
  EmployeeDashboard,
  ClientDashboard,
  HoDDashboard,
} = Pages;

const RoleDashboard = () => {
  const { user } = useAuth();

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

const AppRoutes = () => {
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

      {/* PWA Mobile App Route - outside MainLayout */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <PWAShell />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Work Mobile App Route - outside MainLayout, handles its own auth */}
      <Route
        path="/mobileapp"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <MobileAppShell />
          </Suspense>
        }
      />
      

      
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
        {/* Dashboard - Role-based (Authorization V2 pilot) */}
        <Route path="/dashboard" element={
          <PermissionRoute permission="dashboard.view" module="dashboard">
            <Suspense fallback={<RouteLoadingFallback />}>
              <RoleDashboard />
            </Suspense>
          </PermissionRoute>
        } />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* User Management (Authorization V2 pilot) */}
        <Route
          path="/users"
          element={
            <PermissionRoute
              permission="team.user.view"
              module="team"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <UserList />
            </PermissionRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <PermissionRoute
              permission="team.user.view"
              module="team"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <UserDetails />
            </PermissionRoute>
          }
        />

        {/* Employee Management (Authorization V2 pilot) */}
        <Route
          path="/employees"
          element={
            <PermissionRoute
              permission="team.user.view"
              module="team"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <EmployeeList />
            </PermissionRoute>
          }
        />
        <Route
          path="/employees/add"
          element={
            <PermissionRoute
              permission="team.user.create"
              module="team"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <AddEmployee />
            </PermissionRoute>
          }
        />

        <Route
          path="/employees/:userId/profile"
          element={
            <PermissionRoute
              permission="team.user.view"
              module="team"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <EmployeeProfileManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/employees/:userId/work"
          element={
            <PermissionRoute
              permission="team.user.view"
              module="team"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <EnhancedEmployeeWorkView />
            </PermissionRoute>
          }
        />
        <Route
          path="/employees/:userId"
          element={
            <PermissionRoute
              permission="team.user.view"
              module="team"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <EmployeeProfileManagement />
            </PermissionRoute>
          }
        />

        {/* Department Management (Authorization V2 pilot) */}
        <Route
          path="/departments"
          element={
            <PermissionRoute permission="team.department.view" module="team">
              <DepartmentList />
            </PermissionRoute>
          }
        />
        <Route
          path="/departments/:id"
          element={
            <PermissionRoute permission="team.department.view" module="team">
              <DepartmentDetails />
            </PermissionRoute>
          }
        />

        {/* Leave Management (Authorization V2 pilot) */}
        <Route path="/leaves" element={
          <PermissionRoute
            permission="leave.request.view"
            module="leave"
            fallbackRoles={["admin", "superadmin", "hr", "hod", "manager"]}
          >
            <LeaveManagement />
          </PermissionRoute>
        } />
        <Route path="/leaves/my-leaves" element={
          <PermissionRoute permission="leave.request.view_self" module="leave">
            <MyLeaves />
          </PermissionRoute>
        } />
        <Route
          path="/leaves/requests"
          element={
            <PermissionRoute
              permission="leave.request.approve"
              module="leave"
              fallbackRoles={["admin", "superadmin", "hr", "hod", "manager"]}
            >
              <LeaveRequests />
            </PermissionRoute>
          }
        />

        {/* WFH & Work-on-Leave (Authorization V2 pilot — wired orphaned pages) */}
        <Route path="/wfh" element={
          <PermissionRoute permission="leave.request.view_self" module="wfh">
            <WFHManagement />
          </PermissionRoute>
        } />
        <Route
          path="/admin/work-on-leave-day"
          element={
            <PermissionRoute
              permission="leave.request.approve"
              module="wfh"
              fallbackRoles={["admin", "superadmin", "hr"]}
            >
              <WorkOnLeaveDayManagement />
            </PermissionRoute>
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

        {/* Attendance Management (Authorization V2 pilot) */}
        <Route path="/attendance/my-attendance" element={
          <PermissionRoute permission="attendance.record.view_self" module="attendance">
            <MyAttendance />
          </PermissionRoute>
        } />
        <Route
          path="/attendance/tracking"
          element={
            <PermissionRoute
              permission="attendance.record.view"
              module="attendance"
              fallbackRoles={["admin", "superadmin", "hr", "hod", "manager"]}
            >
              <AttendanceTracking />
            </PermissionRoute>
          }
        />
        <Route
          path="/attendance/overtime-statistics"
          element={
            <PermissionRoute
              permission="attendance.record.manage"
              module="attendance"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <OvertimeStatistics />
            </PermissionRoute>
          }
        />

        {/* Work Log Management (Authorization V2 pilot) */}
        <Route path="/worklog/today" element={
          <PermissionRoute permission="worklog.entry.view_self" module="worklog">
            <MyWorkLog />
          </PermissionRoute>
        } />
        <Route path="/worklog/history" element={
          <PermissionRoute permission="worklog.entry.view_self" module="worklog">
            <WorkLogHistory />
          </PermissionRoute>
        } />
        <Route
          path="/admin/worklog-management"
          element={
            <PermissionRoute
              permission="worklog.entry.review"
              module="worklog"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <WorkLogManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/hod/worklog-review"
          element={
            <PermissionRoute
              permission="worklog.entry.review"
              module="worklog"
              fallbackRoles={["hod"]}
            >
              <HoDWorkLogReview />
            </PermissionRoute>
          }
        />

        {/* Employee Portal Routes */}
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route
          path="/employee/my-work"
          element={
            <PermissionRoute permission="work.item.view" module="work">
              <MyWorkPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/employee/assigned-work"
          element={
            <PermissionRoute permission="work.item.view" module="work">
              <AssignedWorkPage />
            </PermissionRoute>
          }
        />
        <Route path="/employee/meetings" element={
          <PermissionRoute permission="company.meeting.view" module="company">
            <MyMeetings />
          </PermissionRoute>
        } />
        <Route path="/employee/attendance" element={<Navigate to="/attendance/my-attendance" replace />} />
        <Route path="/employee/attendance-report/:employeeId" element={
          <PermissionRoute
            permission="attendance.record.view"
            module="attendance"
            fallbackRoles={["admin", "superadmin", "hr", "hod", "manager"]}
          >
            <EmployeeAttendanceReport />
          </PermissionRoute>
        } />
        <Route path="/employee/leaves" element={
          <PermissionRoute permission="leave.request.view_self" module="leave">
            <EmployeeMyLeaves />
          </PermissionRoute>
        } />
        <Route path="/employee/salary-slips" element={<MySalarySlips />} />
        <Route path="/employee/salary-preview" element={<MySalaryPreview />} />
        <Route
          path="/employee/projects"
          element={
            <PermissionRoute permission="projects.project.view" module="projects">
              <MyProjects />
            </PermissionRoute>
          }
        />
        <Route path="/employee/time-tracking" element={<TimeTracking />} />
        <Route path="/employee/team" element={<TeamDirectory />} />
        <Route path="/employee/announcements" element={
          <PermissionRoute permission="company.announcement.view" module="company">
            <Announcements />
          </PermissionRoute>
        } />
        <Route path="/employee/notifications" element={
          <PermissionRoute permission="company.announcement.view" module="company">
            <Announcements />
          </PermissionRoute>
        } />
        <Route path="/employee/policies" element={
          <PermissionRoute permission="company.policy.view" module="company">
            <Policies />
          </PermissionRoute>
        } />
        <Route path="/employee/settings" element={<Settings />} />
        <Route path="/employee/profile" element={
          <PermissionRoute permission="profile.view">
            <MyProfile />
          </PermissionRoute>
        } />
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
          path="/hr/offers"
          element={<Navigate to="/hr/hiring/offer-letters" replace />}
        />
        {/* Hiring (Authorization V2 pilot) */}
        <Route
          path="/hr/hiring"
          element={
            <PermissionRoute
              permission="hiring.pipeline.manage"
              module="hiring"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <Suspense fallback={<RouteLoadingFallback />}>
                <HiringDashboard />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/hr/hiring/requests"
          element={
            <PermissionRoute
              permission="hiring.pipeline.manage"
              module="hiring"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <Suspense fallback={<RouteLoadingFallback />}>
                <HiringRequestsManagement />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/hr/hiring/requests/:id"
          element={
            <PermissionRoute
              permission="hiring.pipeline.manage"
              module="hiring"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <Suspense fallback={<RouteLoadingFallback />}>
                <HiringRequestDetail />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/hr/hiring/applications/:id"
          element={
            <PermissionRoute
              permission="hiring.pipeline.manage"
              module="hiring"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <Suspense fallback={<RouteLoadingFallback />}>
                <HiringApplicationDetail />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/hr/hiring/applicants"
          element={
            <PermissionRoute
              permission="hiring.pipeline.manage"
              module="hiring"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <Suspense fallback={<RouteLoadingFallback />}>
                <ApplicantCVBank />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/hr/hiring/offer-letters"
          element={
            <PermissionRoute
              permission="hiring.pipeline.manage"
              module="hiring"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <Suspense fallback={<RouteLoadingFallback />}>
                <HiringOfferLetters />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/hod/hiring/requests"
          element={
            <PermissionRoute
              permission="hiring.request.view"
              module="hiring"
              fallbackRoles={["hod"]}
            >
              <Suspense fallback={<RouteLoadingFallback />}>
                <HoDHiringRequests />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/hod/hiring/requests/:id"
          element={
            <PermissionRoute
              permission="hiring.request.view"
              module="hiring"
              fallbackRoles={["hod"]}
            >
              <Suspense fallback={<RouteLoadingFallback />}>
                <HoDHiringRequestDetail />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/hod/hiring/requests/new"
          element={
            <PermissionRoute
              permission="hiring.request.create"
              module="hiring"
              fallbackRoles={["hod"]}
            >
              <Suspense fallback={<RouteLoadingFallback />}>
                <HoDCreateHiringRequest />
              </Suspense>
            </PermissionRoute>
          }
        />
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



        {/* Project Management (Authorization V2 pilot) */}
        <Route
          path="/projects"
          element={
            <PermissionRoute permission="projects.project.view" module="projects">
              <ProjectListPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/projects-old"
          element={
            <PermissionRoute permission="projects.project.view" module="projects">
              <ProjectList />
            </PermissionRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <PermissionRoute permission="projects.project.view" module="projects">
              <ProjectWorkspace />
            </PermissionRoute>
          }
        />
        <Route
          path="/projects/:id/old"
          element={
            <PermissionRoute permission="projects.project.view" module="projects">
              <ProjectDetails />
            </PermissionRoute>
          }
        />

        {/* Work Items Management - For Notification Links (Authorization V2 pilot) */}
        <Route
          path="/work-items/:id"
          element={
            <PermissionRoute permission="work.item.view" module="work">
              <MyWorkPage />
            </PermissionRoute>
          }
        />

        {/* Employee Slots - For Notification Links */}
        <Route
          path="/employee/slots"
          element={
            <PermissionRoute permission="work.item.view" module="work">
              <MyWorkPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/employee/slots/:id"
          element={
            <PermissionRoute permission="work.item.view" module="work">
              <MyWorkPage />
            </PermissionRoute>
          }
        />

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

        {/* Profile - Unified (Authorization V2 pilot) */}
        <Route path="/profile" element={
          <PermissionRoute permission="profile.view">
            <MyProfile />
          </PermissionRoute>
        } />
        <Route path="/my-profile" element={
          <PermissionRoute permission="profile.view">
            <MyProfile />
          </PermissionRoute>
        } />
        {/* Removed old routes: /content-calendar, MyProfileEnhanced */}

        {/* Admin Billing Routes */}
        <Route
          path="/admin/billing"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "manager", "hod"]}>
              <AdminBillingDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "manager", "hod"]}>
              <ServiceManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/plans"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "manager", "hod"]}>
              <PlanManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/subscriptions"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "manager", "hod"]}>
              <SubscriptionManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/invoices"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "manager", "hod"]}>
              <InvoiceManagement />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "manager", "hod"]}>
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

        {/* Company Management Routes (Authorization V2 pilot) */}
        <Route
          path="/meetings"
          element={
            <PermissionRoute permission="company.meeting.view" module="company">
              <MeetingManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/policies"
          element={
            <PermissionRoute
              permission="company.policy.manage"
              module="company"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <PolicyManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/announcements"
          element={
            <PermissionRoute
              permission="company.announcement.manage"
              module="company"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <AnnouncementManagement />
            </PermissionRoute>
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
        {/* Redirect /expenses to /expenses/my-expenses (old notification links) */}
        <Route path="/expenses" element={<Navigate to="/expenses/my-expenses" replace />} />
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
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <BudgetManagement />
            </RoleBasedRoute>
          }
        />

        {/* Asset Management Routes */}
        {/* Static routes MUST come before dynamic :id routes */}
        <Route
          path="/assets/dashboard"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager", "hod"]}>
              <AssetDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/assets/add"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <AddAsset />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/assets/assignments/history"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager", "hod"]}>
              <AssignmentHistory />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/assets/history"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager", "hod"]}>
              <AssignmentHistory />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/assets/repairs"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager", "hod"]}>
              <RepairLog />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/assets/warranty"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager", "hod"]}>
              <WarrantyTracker />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/assets/my-assets"
          element={
            <RoleBasedRoute allowedRoles={["employee", "admin", "superadmin", "hr", "manager", "hod"]}>
              <MyAssets />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/assets/management"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager", "employee", "hod"]}>
              <AssetManagement />
            </RoleBasedRoute>
          }
        />
        {/* Dynamic routes MUST come after static routes */}
        <Route
          path="/assets/:id/assign"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <AssignAsset />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/assets/:id/repair"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <SendToRepair />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/assets/:id/edit"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <EditAsset />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/assets/:id"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager", "hod"]}>
              <AssetDetails />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/assets"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager", "hod"]}>
              <AssetList />
            </RoleBasedRoute>
          }
        />

        {/* Software License Management Routes */}
        <Route
          path="/licenses/dashboard"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager", "hod"]}>
              <SoftwareLicenseDashboard />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/licenses"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager", "hod"]}>
              <SoftwareLicenseList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/licenses/add"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <AddSoftwareLicense />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/licenses/:id"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager", "hod"]}>
              <SoftwareLicenseDetails />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/licenses/:id/edit"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <EditSoftwareLicense />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/licenses/:id/assign"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <AssignSoftwareLicense />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/licenses/:id/history"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager"]}>
              <LicenseHistory />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/licenses/expiry-alerts"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager", "hod"]}>
              <LicenseExpiryAlerts />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/licenses/my-licenses"
          element={
            <RoleBasedRoute allowedRoles={["employee", "admin", "superadmin", "hr", "manager", "hod"]}>
              <MyLicenses />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/licenses/management"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "hr", "manager", "employee", "hod"]}>
              <SoftwareLicenseManagement />
            </RoleBasedRoute>
          }
        />

        {/* Support Routes (Authorization V2 pilot) */}
        <Route path="/support" element={
          <PermissionRoute permission="support.view" module="support">
            <SupportPage />
          </PermissionRoute>
        } />
        <Route
          path="/admin/support-management"
          element={
            <PermissionRoute
              permission="support.manage"
              module="support"
              fallbackRoles={["admin", "superadmin"]}
            >
              <SupportManagement />
            </PermissionRoute>
          }
        />

        {/* Procurement Management Routes */}
        <Route
          path="/procurement"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "hod", "manager", "hr", "employee"]}>
              <ProcurementDashboard />
            </RoleBasedRoute>
          }
        />
        
        {/* Purchase Requests - All roles can view/create their own */}
        <Route
          path="/procurement/purchase-requests/create"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "manager", "accounts", "employee", "hr", "hod"]}>
              <CreatePurchaseRequest />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/purchase-requests/approvals"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "hod"]}>
              <PurchaseRequestApprovals />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/purchase-requests/my"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "manager", "accounts", "employee", "hr", "hod"]}>
              <MyPurchaseRequests />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/purchase-requests/:id/edit"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "manager", "accounts", "employee", "hr", "hod"]}>
              <EditPurchaseRequest />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/purchase-requests/:id"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "manager", "accounts", "employee", "hr", "hod"]}>
              <PurchaseRequestDetails />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/purchase-requests"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "manager", "accounts", "employee", "hr", "hod"]}>
              <MyPurchaseRequests />
            </RoleBasedRoute>
          }
        />

        {/* Purchase Orders - Admin/Accounts can write; HR/HoD/Manager can read */}
        <Route
          path="/procurement/purchase-orders"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "hr", "hod", "manager"]}>
              <PurchaseOrderList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/purchase-orders/create"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts"]}>
              <CreatePurchaseOrder />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/purchase-orders/:id"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "hr", "hod", "manager"]}>
              <PurchaseOrderDetails />
            </RoleBasedRoute>
          }
        />

        {/* Goods Receipts - Admin/Accounts/HR can create, others read-only */}
        <Route
          path="/procurement/goods-receipts"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "hr", "hod", "manager"]}>
              <GoodsReceiptList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/goods-receipts/create"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "hr"]}>
              <CreateGoodsReceipt />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/goods-receipts/:id"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "hr", "hod", "manager"]}>
              <GoodsReceiptDetails />
            </RoleBasedRoute>
          }
        />

        {/* Vendors - Admin/Accounts only */}
        <Route
          path="/procurement/vendors"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts"]}>
              <VendorList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/vendors/create"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts"]}>
              <CreateVendor />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/vendors/:id"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts"]}>
              <VendorDetails />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/vendors/:id/edit"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts"]}>
              <EditVendor />
            </RoleBasedRoute>
          }
        />

        {/* Procurement Invoices - Admin/Accounts can write; HR/HoD/Manager can read */}
        <Route
          path="/procurement/invoices"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "hr", "hod", "manager"]}>
              <ProcurementInvoiceList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/invoices/create"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts"]}>
              <CreateProcurementInvoice />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/invoices/:id"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "hr", "hod", "manager"]}>
              <ProcurementInvoiceDetails />
            </RoleBasedRoute>
          }
        />

        {/* Procurement Payments - Admin/Accounts can write; HR/HoD/Manager can read */}
        <Route
          path="/procurement/payments"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts", "hr", "hod", "manager"]}>
              <ProcurementPaymentList />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/procurement/payments/record"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts"]}>
              <RecordPayment />
            </RoleBasedRoute>
          }
        />

        {/* Procurement Reports - Admin/Accounts only */}
        <Route
          path="/procurement/reports"
          element={
            <RoleBasedRoute allowedRoles={["admin", "superadmin", "accounts"]}>
              <ProcurementReports />
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


