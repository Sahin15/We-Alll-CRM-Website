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
  PermissionAssignment,
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
          <PermissionRoute
            permission="dashboard.view"
            fallbackRoles={[
              "superadmin",
              "admin",
              "hr",
              "accounts",
              "employee",
              "client",
              "hod",
              "manager",
            ]}
          >
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
            <PermissionRoute
              permission="payroll.slip.manage"
              module="finance"
              fallbackRoles={["admin", "superadmin", "hr", "accounts", "manager"]}
            >
              <SalaryManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/salary-preview-management"
          element={
            <PermissionRoute
              permission="payroll.slip.manage"
              module="finance"
              fallbackRoles={["admin", "superadmin", "hr", "accounts", "manager"]}
            >
              <HRSalaryPreviewManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/salary-templates"
          element={
            <PermissionRoute
              permission="payroll.structure.manage"
              module="finance"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <TemplateManagement />
            </PermissionRoute>
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
        <Route path="/employee/salary-slips" element={
          <PermissionRoute permission="payroll.slip.view_self" module="finance">
            <MySalarySlips />
          </PermissionRoute>
        } />
        <Route path="/employee/salary-preview" element={
          <PermissionRoute permission="payroll.slip.view_self" module="finance">
            <MySalaryPreview />
          </PermissionRoute>
        } />
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
            <PermissionRoute permission="dashboard.view" module="dashboard" fallbackRoles={["hr"]}>
              <HRSettings />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <PermissionRoute
              permission="dashboard.view"
              module="dashboard"
              fallbackRoles={["admin", "superadmin", "manager"]}
            >
              <AdminSettings />
            </PermissionRoute>
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
            <PermissionRoute permission="leave.request.approve" module="leave" fallbackRoles={["hr"]}>
              <HolidayManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/holidays"
          element={
            <PermissionRoute
              permission="leave.request.approve"
              module="leave"
              fallbackRoles={["admin", "superadmin", "manager"]}
            >
              <HolidayManagement />
            </PermissionRoute>
          }
        />
        
        <Route
          path="/hod/settings"
          element={
            <PermissionRoute permission="dashboard.view" module="dashboard" fallbackRoles={["hod"]}>
              <HODSettings />
            </PermissionRoute>
          }
        />
        <Route
          path="/hod/dashboard"
          element={
            <PermissionRoute permission="dashboard.view" module="dashboard" fallbackRoles={["hod"]}>
              <HoDDashboard />
            </PermissionRoute>
          }
        />

        {/* Client Management (Authorization V2 pilot) */}
        <Route
          path="/clients"
          element={
            <PermissionRoute
              permission="crm.client.view"
              module="crm"
              fallbackRoles={["admin", "superadmin", "hr", "employee", "hod", "manager"]}
            >
              <ClientList />
            </PermissionRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <PermissionRoute
              permission="crm.client.view"
              module="crm"
              fallbackRoles={["admin", "superadmin", "hr", "employee", "hod", "manager"]}
            >
              <ClientDetails />
            </PermissionRoute>
          }
        />

        {/* Raw Data Sheet (Authorization V2 pilot) */}
        <Route
          path="/raw-data"
          element={
            <PermissionRoute
              permission="crm.rawdata.manage"
              module="crm"
              fallbackRoles={["admin", "superadmin", "hr", "employee", "hod", "manager"]}
            >
              <RawDataList />
            </PermissionRoute>
          }
        />
        <Route
          path="/raw-data/queue"
          element={
            <PermissionRoute
              permission="crm.rawdata.manage"
              module="crm"
              fallbackRoles={["admin", "superadmin", "hr", "employee", "hod", "manager"]}
            >
              <CallerQueuePage />
            </PermissionRoute>
          }
        />
        <Route
          path="/raw-data/dashboard"
          element={
            <PermissionRoute
              permission="crm.rawdata.manage"
              module="crm"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <RawDataDashboard />
            </PermissionRoute>
          }
        />

        {/* Lead Management (Authorization V2 pilot) */}
        <Route
          path="/leads"
          element={
            <PermissionRoute
              permission="crm.lead.view"
              module="crm"
              fallbackRoles={["admin", "superadmin", "hr", "employee", "hod", "accounts", "manager"]}
            >
              <LeadList />
            </PermissionRoute>
          }
        />
        <Route
          path="/leads/:id"
          element={
            <PermissionRoute
              permission="crm.lead.view"
              module="crm"
              fallbackRoles={["admin", "superadmin", "hr", "employee", "hod", "accounts", "manager"]}
            >
              <LeadDetails />
            </PermissionRoute>
          }
        />
        <Route
          path="/leads/:id/edit"
          element={
            <PermissionRoute
              permission="crm.lead.manage"
              module="crm"
              fallbackRoles={["admin", "superadmin", "hr", "employee", "hod", "accounts", "manager"]}
            >
              <LeadList />
            </PermissionRoute>
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
            <PermissionRoute
              permission="work.item.view"
              module="work"
              fallbackRoles={["employee", "admin", "superadmin", "hr", "hod", "manager"]}
            >
              <MyWorkCalendar />
            </PermissionRoute>
          }
        />
        <Route
          path="/work-calendar/admin-overview"
          element={
            <PermissionRoute
              permission="reports.analytics.view"
              module="reports"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <AdminWorkCalendarOverview />
            </PermissionRoute>
          }
        />
        <Route
          path="/work-calendar/enhanced-admin-overview"
          element={
            <PermissionRoute
              permission="reports.analytics.view"
              module="reports"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <EnhancedAdminWorkCalendarOverview />
            </PermissionRoute>
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

        {/* Admin Billing Routes (Authorization V2 pilot) */}
        <Route
          path="/admin/billing"
          element={
            <PermissionRoute
              permission="billing.invoice.view"
              module="billing"
              fallbackRoles={["admin", "superadmin", "accounts", "manager", "hod"]}
            >
              <AdminBillingDashboard />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <PermissionRoute
              permission="billing.subscription.manage"
              module="billing"
              fallbackRoles={["admin", "superadmin", "accounts", "manager", "hod"]}
            >
              <ServiceManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/plans"
          element={
            <PermissionRoute
              permission="billing.subscription.manage"
              module="billing"
              fallbackRoles={["admin", "superadmin", "accounts", "manager", "hod"]}
            >
              <PlanManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/subscriptions"
          element={
            <PermissionRoute
              permission="billing.subscription.view"
              module="billing"
              fallbackRoles={["admin", "superadmin", "accounts", "manager", "hod"]}
            >
              <SubscriptionManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/invoices"
          element={
            <PermissionRoute
              permission="billing.invoice.view"
              module="billing"
              fallbackRoles={["admin", "superadmin", "accounts", "manager", "hod"]}
            >
              <InvoiceManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <PermissionRoute
              permission="billing.payment.verify"
              module="billing"
              fallbackRoles={["admin", "superadmin", "accounts", "manager", "hod"]}
            >
              <PaymentVerification />
            </PermissionRoute>
          }
        />

        {/* Client Billing Routes (Authorization V2 pilot) */}
        <Route
          path="/client/billing"
          element={
            <PermissionRoute
              permission="billing.invoice.view"
              module="billing"
              fallbackRoles={["client"]}
            >
              <ClientBillingDashboard />
            </PermissionRoute>
          }
        />
        <Route
          path="/client/subscriptions"
          element={
            <PermissionRoute
              permission="billing.subscription.view"
              module="billing"
              fallbackRoles={["client"]}
            >
              <ClientSubscriptions />
            </PermissionRoute>
          }
        />
        <Route
          path="/client/invoices"
          element={
            <PermissionRoute
              permission="billing.invoice.view"
              module="billing"
              fallbackRoles={["client"]}
            >
              <ClientInvoices />
            </PermissionRoute>
          }
        />
        <Route
          path="/client/payments"
          element={
            <PermissionRoute
              permission="billing.invoice.view"
              module="billing"
              fallbackRoles={["client"]}
            >
              <ClientPayments />
            </PermissionRoute>
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
            <PermissionRoute
              permission="reports.analytics.view"
              module="reports"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <ReportsAnalytics />
            </PermissionRoute>
          }
        />

        {/* Notification Management Routes */}
        <Route
          path="/admin/notifications/manage"
          element={
            <PermissionRoute
              permission="company.announcement.manage"
              module="company"
              fallbackRoles={["admin", "superadmin", "manager"]}
            >
              <NotificationManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/notifications/create"
          element={
            <PermissionRoute
              permission="company.announcement.manage"
              module="company"
              fallbackRoles={["admin", "superadmin", "manager"]}
            >
              <NotificationManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/notifications/dashboard"
          element={
            <PermissionRoute
              permission="company.announcement.manage"
              module="company"
              fallbackRoles={["admin", "superadmin", "manager"]}
            >
              <NotificationDashboard />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/notifications/settings"
          element={
            <PermissionRoute
              permission="company.announcement.manage"
              module="company"
              fallbackRoles={["admin", "superadmin", "manager"]}
            >
              <NotificationSettings />
            </PermissionRoute>
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
            <PermissionRoute permission="expense.claim.create" module="finance">
              <MyExpenses />
            </PermissionRoute>
          }
        />
        <Route
          path="/expenses/create"
          element={
            <PermissionRoute permission="expense.claim.create" module="finance">
              <CreateExpense />
            </PermissionRoute>
          }
        />
        <Route
          path="/expenses/:id"
          element={
            <PermissionRoute permission="expense.claim.create" module="finance">
              <ExpenseDetails />
            </PermissionRoute>
          }
        />
        <Route
          path="/expenses/:id/edit"
          element={
            <PermissionRoute permission="expense.claim.create" module="finance">
              <EditExpense />
            </PermissionRoute>
          }
        />
        <Route
          path="/expenses/approvals"
          element={
            <PermissionRoute
              permission="expense.claim.approve"
              module="finance"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <ExpenseManagementConsolidated />
            </PermissionRoute>
          }
        />
        <Route
          path="/expenses/management"
          element={
            <PermissionRoute
              permission="expense.claim.approve"
              module="finance"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <ExpenseManagementConsolidated />
            </PermissionRoute>
          }
        />
        <Route
          path="/expenses/reimbursement"
          element={
            <PermissionRoute
              permission="expense.claim.approve"
              module="finance"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <ExpenseManagementConsolidated />
            </PermissionRoute>
          }
        />
        <Route
          path="/expenses/search"
          element={
            <PermissionRoute
              permission="expense.claim.approve"
              module="finance"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <ExpenseManagementConsolidated />
            </PermissionRoute>
          }
        />
        <Route
          path="/expenses/analytics"
          element={
            <PermissionRoute
              permission="expense.claim.approve"
              module="finance"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <ExpenseManagementConsolidated />
            </PermissionRoute>
          }
        />
        <Route
          path="/expenses/budget"
          element={
            <PermissionRoute
              permission="expense.claim.approve"
              module="finance"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <ExpenseManagementConsolidated />
            </PermissionRoute>
          }
        />
        <Route
          path="/expenses/reports"
          element={
            <PermissionRoute
              permission="expense.claim.approve"
              module="finance"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <ExpenseManagementConsolidated />
            </PermissionRoute>
          }
        />
        <Route
          path="/expenses/budget-management"
          element={
            <PermissionRoute
              permission="expense.claim.approve"
              module="finance"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <BudgetManagement />
            </PermissionRoute>
          }
        />

        {/* Asset Management Routes */}
        {/* Static routes MUST come before dynamic :id routes */}
        <Route
          path="/assets/dashboard"
          element={
            <PermissionRoute
              permission="assets.asset.view"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager", "hod"]}
            >
              <AssetDashboard />
            </PermissionRoute>
          }
        />
        <Route
          path="/assets/add"
          element={
            <PermissionRoute
              permission="assets.asset.manage"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <AddAsset />
            </PermissionRoute>
          }
        />
        <Route
          path="/assets/assignments/history"
          element={
            <PermissionRoute
              permission="assets.asset.view"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager", "hod"]}
            >
              <AssignmentHistory />
            </PermissionRoute>
          }
        />
        <Route
          path="/assets/history"
          element={
            <PermissionRoute
              permission="assets.asset.view"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager", "hod"]}
            >
              <AssignmentHistory />
            </PermissionRoute>
          }
        />
        <Route
          path="/assets/repairs"
          element={
            <PermissionRoute
              permission="assets.asset.view"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager", "hod"]}
            >
              <RepairLog />
            </PermissionRoute>
          }
        />
        <Route
          path="/assets/warranty"
          element={
            <PermissionRoute
              permission="assets.asset.view"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager", "hod"]}
            >
              <WarrantyTracker />
            </PermissionRoute>
          }
        />
        <Route
          path="/assets/my-assets"
          element={
            <PermissionRoute permission="assets.asset.view" module="resources">
              <MyAssets />
            </PermissionRoute>
          }
        />
        <Route
          path="/assets/management"
          element={
            <PermissionRoute
              permission="assets.asset.view"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager", "employee", "hod"]}
            >
              <AssetManagement />
            </PermissionRoute>
          }
        />
        {/* Dynamic routes MUST come after static routes */}
        <Route
          path="/assets/:id/assign"
          element={
            <PermissionRoute
              permission="assets.asset.manage"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <AssignAsset />
            </PermissionRoute>
          }
        />
        <Route
          path="/assets/:id/repair"
          element={
            <PermissionRoute
              permission="assets.asset.manage"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <SendToRepair />
            </PermissionRoute>
          }
        />
        <Route
          path="/assets/:id/edit"
          element={
            <PermissionRoute
              permission="assets.asset.manage"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <EditAsset />
            </PermissionRoute>
          }
        />
        <Route
          path="/assets/:id"
          element={
            <PermissionRoute
              permission="assets.asset.view"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager", "hod"]}
            >
              <AssetDetails />
            </PermissionRoute>
          }
        />
        <Route
          path="/assets"
          element={
            <PermissionRoute
              permission="assets.asset.view"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager", "hod"]}
            >
              <AssetList />
            </PermissionRoute>
          }
        />

        {/* Software License Management Routes */}
        <Route
          path="/licenses/dashboard"
          element={
            <PermissionRoute
              permission="licenses.license.view"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager", "hod"]}
            >
              <SoftwareLicenseDashboard />
            </PermissionRoute>
          }
        />
        <Route
          path="/licenses"
          element={
            <PermissionRoute
              permission="licenses.license.view"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager", "hod"]}
            >
              <SoftwareLicenseList />
            </PermissionRoute>
          }
        />
        <Route
          path="/licenses/add"
          element={
            <PermissionRoute
              permission="licenses.license.manage"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <AddSoftwareLicense />
            </PermissionRoute>
          }
        />
        <Route
          path="/licenses/:id"
          element={
            <PermissionRoute
              permission="licenses.license.view"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager", "hod"]}
            >
              <SoftwareLicenseDetails />
            </PermissionRoute>
          }
        />
        <Route
          path="/licenses/:id/edit"
          element={
            <PermissionRoute
              permission="licenses.license.manage"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <EditSoftwareLicense />
            </PermissionRoute>
          }
        />
        <Route
          path="/licenses/:id/assign"
          element={
            <PermissionRoute
              permission="licenses.license.manage"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <AssignSoftwareLicense />
            </PermissionRoute>
          }
        />
        <Route
          path="/licenses/:id/history"
          element={
            <PermissionRoute
              permission="licenses.license.manage"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager"]}
            >
              <LicenseHistory />
            </PermissionRoute>
          }
        />
        <Route
          path="/licenses/expiry-alerts"
          element={
            <PermissionRoute
              permission="licenses.license.view"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager", "hod"]}
            >
              <LicenseExpiryAlerts />
            </PermissionRoute>
          }
        />
        <Route
          path="/licenses/my-licenses"
          element={
            <PermissionRoute permission="licenses.license.view" module="resources">
              <MyLicenses />
            </PermissionRoute>
          }
        />
        <Route
          path="/licenses/management"
          element={
            <PermissionRoute
              permission="licenses.license.view"
              module="resources"
              fallbackRoles={["admin", "superadmin", "hr", "manager", "employee", "hod"]}
            >
              <SoftwareLicenseManagement />
            </PermissionRoute>
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
        <Route
          path="/admin/permission-assignments"
          element={
            <PermissionRoute
              permission="auth.permission.assign"
              module="auth"
              fallbackRoles={["admin", "superadmin"]}
            >
              <PermissionAssignment />
            </PermissionRoute>
          }
        />

        {/* Procurement Management Routes (Authorization V2 pilot) */}
        <Route
          path="/procurement"
          element={
            <PermissionRoute
              permission="procurement.pr.create"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts", "hod", "manager", "hr", "employee"]}
            >
              <ProcurementDashboard />
            </PermissionRoute>
          }
        />

        <Route
          path="/procurement/purchase-requests/create"
          element={
            <PermissionRoute
              permission="procurement.pr.create"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "manager", "accounts", "employee", "hr", "hod"]}
            >
              <CreatePurchaseRequest />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/purchase-requests/approvals"
          element={
            <PermissionRoute
              permission="procurement.pr.approve_hod"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts", "hod"]}
            >
              <PurchaseRequestApprovals />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/purchase-requests/my"
          element={
            <PermissionRoute
              permission="procurement.pr.create"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "manager", "accounts", "employee", "hr", "hod"]}
            >
              <MyPurchaseRequests />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/purchase-requests/:id/edit"
          element={
            <PermissionRoute
              permission="procurement.pr.create"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "manager", "accounts", "employee", "hr", "hod"]}
            >
              <EditPurchaseRequest />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/purchase-requests/:id"
          element={
            <PermissionRoute
              permission="procurement.pr.create"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "manager", "accounts", "employee", "hr", "hod"]}
            >
              <PurchaseRequestDetails />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/purchase-requests"
          element={
            <PermissionRoute
              permission="procurement.pr.create"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "manager", "accounts", "employee", "hr", "hod"]}
            >
              <MyPurchaseRequests />
            </PermissionRoute>
          }
        />

        <Route
          path="/procurement/purchase-orders"
          element={
            <PermissionRoute
              permission="procurement.pr.view_self"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts", "hr", "hod", "manager"]}
            >
              <PurchaseOrderList />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/purchase-orders/create"
          element={
            <PermissionRoute
              permission="procurement.po.manage"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts"]}
            >
              <CreatePurchaseOrder />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/purchase-orders/:id"
          element={
            <PermissionRoute
              permission="procurement.pr.view_self"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts", "hr", "hod", "manager"]}
            >
              <PurchaseOrderDetails />
            </PermissionRoute>
          }
        />

        <Route
          path="/procurement/goods-receipts"
          element={
            <PermissionRoute
              permission="procurement.pr.view_self"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts", "hr", "hod", "manager"]}
            >
              <GoodsReceiptList />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/goods-receipts/create"
          element={
            <PermissionRoute
              permission="procurement.po.manage"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts", "hr"]}
            >
              <CreateGoodsReceipt />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/goods-receipts/:id"
          element={
            <PermissionRoute
              permission="procurement.pr.view_self"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts", "hr", "hod", "manager"]}
            >
              <GoodsReceiptDetails />
            </PermissionRoute>
          }
        />

        <Route
          path="/procurement/vendors"
          element={
            <PermissionRoute
              permission="procurement.vendor.manage"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts"]}
            >
              <VendorList />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/vendors/create"
          element={
            <PermissionRoute
              permission="procurement.vendor.manage"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts"]}
            >
              <CreateVendor />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/vendors/:id"
          element={
            <PermissionRoute
              permission="procurement.vendor.manage"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts"]}
            >
              <VendorDetails />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/vendors/:id/edit"
          element={
            <PermissionRoute
              permission="procurement.vendor.manage"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts"]}
            >
              <EditVendor />
            </PermissionRoute>
          }
        />

        <Route
          path="/procurement/invoices"
          element={
            <PermissionRoute
              permission="procurement.pr.view_self"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts", "hr", "hod", "manager"]}
            >
              <ProcurementInvoiceList />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/invoices/create"
          element={
            <PermissionRoute
              permission="procurement.po.manage"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts"]}
            >
              <CreateProcurementInvoice />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/invoices/:id"
          element={
            <PermissionRoute
              permission="procurement.pr.view_self"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts", "hr", "hod", "manager"]}
            >
              <ProcurementInvoiceDetails />
            </PermissionRoute>
          }
        />

        <Route
          path="/procurement/payments"
          element={
            <PermissionRoute
              permission="procurement.pr.view_self"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts", "hr", "hod", "manager"]}
            >
              <ProcurementPaymentList />
            </PermissionRoute>
          }
        />
        <Route
          path="/procurement/payments/record"
          element={
            <PermissionRoute
              permission="procurement.po.manage"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts"]}
            >
              <RecordPayment />
            </PermissionRoute>
          }
        />

        <Route
          path="/procurement/reports"
          element={
            <PermissionRoute
              permission="procurement.po.manage"
              module="procurement"
              fallbackRoles={["admin", "superadmin", "accounts"]}
            >
              <ProcurementReports />
            </PermissionRoute>
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


