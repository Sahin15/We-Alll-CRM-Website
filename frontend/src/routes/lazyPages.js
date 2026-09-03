import { lazy } from "react";

/** All route-level pages — code-split per route (not in main bundle). */
const lp = (factory) => lazy(factory);

// Diagnostics
export const NotificationDiagnostics = lp(() => import("../pages/NotificationDiagnostics"));

// Employee
export const MyProjects = lp(() => import("../pages/employee/MyProjects"));
export const MyWorkPage = lp(() => import("../pages/employee/MyWorkPage"));
export const AssignedWorkPage = lp(() => import("../pages/employee/AssignedWorkPage"));
export const MyMeetings = lp(() => import("../pages/employee/MyMeetings"));
export const TeamDirectory = lp(() => import("../pages/employee/TeamDirectory"));
export const MySalarySlips = lp(() => import("../pages/employee/MySalarySlips"));
export const MySalaryPreview = lp(() => import("../pages/employee/MySalaryPreview"));
export const Announcements = lp(() => import("../pages/employee/Announcements"));
export const EmployeeMyAttendance = lp(() => import("../pages/employee/MyAttendance"));
export const EmployeeMyLeaves = lp(() => import("../pages/employee/MyLeaves"));
export const EmployeeAttendanceReport = lp(() => import("../pages/employee/EmployeeAttendanceReport"));
export const TimeTracking = lp(() => import("../pages/employee/TimeTracking"));
export const Policies = lp(() => import("../pages/employee/Policies"));
export const Settings = lp(() => import("../pages/employee/Settings"));

// HR
export const SalaryManagement = lp(() => import("../pages/hr/SalaryManagement"));
export const HRSalaryPreviewManagement = lp(() => import("../components/salary/HRSalaryPreviewManagement"));
export const TemplateManagement = lp(() => import("../components/salary/TemplateManagement"));
export const HRSettings = lp(() => import("../pages/hr/HRSettings"));
export const HiringDashboard = lp(() => import("../pages/hr/HiringDashboard"));
export const HiringRequestsManagement = lp(() => import("../pages/hr/HiringRequestsManagement"));
export const HiringRequestDetail = lp(() => import("../pages/hr/HiringRequestDetail"));
export const HiringApplicationDetail = lp(() => import("../pages/hr/HiringApplicationDetail"));
export const ApplicantCVBank = lp(() => import("../pages/hr/ApplicantCVBank"));
export const HiringOfferLetters = lp(() => import("../pages/hr/HiringOfferLetters"));

// HoD
export const HoDHiringRequests = lp(() => import("../pages/hod/HoDHiringRequests"));
export const HoDCreateHiringRequest = lp(() => import("../pages/hod/HoDCreateHiringRequest"));
export const HoDHiringRequestDetail = lp(() => import("../pages/hod/HoDHiringRequestDetail"));
export const AdminSettings = lp(() => import("../pages/admin/AdminSettings"));
export const PermissionAssignment = lp(() => import("../pages/admin/PermissionAssignment"));
export const HODSettings = lp(() => import("../pages/hod/HODSettings"));

// Users
export const UserList = lp(() => import("../pages/users/UserList"));
export const UserDetails = lp(() => import("../pages/users/UserDetails"));

// Employees
export const EmployeeList = lp(() => import("../pages/employees/EmployeeList"));
export const AddEmployee = lp(() => import("../pages/employees/AddEmployee"));
export const EnhancedEmployeeWorkView = lp(() => import("../pages/employees/EnhancedEmployeeWorkView"));
export const EmployeeProfileManagement = lp(() => import("../components/hr/EmployeeProfileManagement"));

// Departments
export const DepartmentList = lp(() => import("../pages/departments/DepartmentList"));
export const DepartmentDetails = lp(() => import("../pages/departments/DepartmentDetails"));

// Leaves
export const MyLeaves = lp(() => import("../pages/leaves/MyLeaves"));
export const LeaveRequests = lp(() => import("../pages/leaves/LeaveRequests"));
export const LeaveManagement = lp(() => import("../pages/leaves/LeaveManagement"));

// WFH & work-on-leave
export const WFHManagement = lp(() => import("../pages/wfh/WFHManagement"));
export const WorkOnLeaveDayManagement = lp(() => import("../pages/hr/WorkOnLeaveDayManagement"));

// Attendance
export const MyAttendance = lp(() => import("../pages/attendance/MyAttendance"));
export const AttendanceTracking = lp(() => import("../pages/attendance/AttendanceTracking"));
export const OvertimeStatistics = lp(() => import("../pages/attendance/OvertimeStatistics"));

// Work log
export const MyWorkLog = lp(() => import("../pages/worklog/MyWorkLog"));
export const WorkLogHistory = lp(() => import("../pages/worklog/WorkLogHistory"));
export const WorkLogManagement = lp(() => import("../pages/worklog/WorkLogManagement"));
export const HoDWorkLogReview = lp(() => import("../pages/worklog/HoDWorkLogReview"));

// Clients
export const ClientList = lp(() => import("../pages/clients/ClientList"));
export const ClientDetails = lp(() => import("../pages/clients/ClientDetails"));

// Raw data
export const RawDataList = lp(() => import("../pages/raw-data/RawDataList"));
export const CallerQueuePage = lp(() => import("../pages/raw-data/CallerQueuePage"));
export const RawDataDashboard = lp(() => import("../pages/raw-data/RawDataDashboard"));

// Leads
export const LeadList = lp(() => import("../pages/leads/LeadList"));
export const LeadDetails = lp(() => import("../pages/leads/LeadDetails"));

// Projects
export const ProjectList = lp(() => import("../pages/projects/ProjectList"));
export const ProjectListPage = lp(() => import("../pages/projects/ProjectListPage"));
export const ProjectDetails = lp(() => import("../pages/projects/ProjectDetails"));
export const ProjectWorkspace = lp(() => import("../pages/projects/ProjectWorkspace"));

// Calendar
export const CalendarPage = lp(() => import("../pages/calendar/CalendarPage"));

// Work calendar
export const MyWorkCalendar = lp(() => import("../pages/work-calendar/MyWorkCalendar"));
export const AdminWorkCalendarOverview = lp(() => import("../pages/work-calendar/AdminWorkCalendarOverview"));
export const EnhancedAdminWorkCalendarOverview = lp(() => import("../pages/work-calendar/EnhancedAdminWorkCalendarOverview"));

// Profile
export const MyProfile = lp(() => import("../pages/profile/MyProfile"));

// Admin billing
export const AdminBillingDashboard = lp(() => import("../pages/admin/AdminBillingDashboard"));
export const ServiceManagement = lp(() => import("../pages/admin/ServiceManagement"));
export const PlanManagement = lp(() => import("../pages/admin/PlanManagement"));
export const SubscriptionManagement = lp(() => import("../pages/admin/SubscriptionManagement"));
export const InvoiceManagement = lp(() => import("../pages/admin/InvoiceManagement"));
export const PaymentVerification = lp(() => import("../pages/admin/PaymentVerification"));

// Client billing
export const ClientBillingDashboard = lp(() => import("../pages/client/ClientBillingDashboard"));
export const ClientSubscriptions = lp(() => import("../pages/client/ClientSubscriptions"));
export const ClientInvoices = lp(() => import("../pages/client/ClientInvoices"));
export const ClientPayments = lp(() => import("../pages/client/ClientPayments"));

// Notifications admin
export const NotificationManagement = lp(() => import("../components/admin/NotificationManagement"));
export const NotificationDashboard = lp(() => import("../components/notifications/NotificationDashboard"));
export const NotificationSettings = lp(() => import("../components/notifications/NotificationSettings"));

// Holiday
export const HolidayManagement = lp(() => import("../components/hr/HolidayManagement"));

// Expenses
export const MyExpenses = lp(() => import("../pages/expenses/MyExpenses"));
export const CreateExpense = lp(() => import("../pages/expenses/CreateExpense"));
export const ExpenseDetails = lp(() => import("../pages/expenses/ExpenseDetails"));
export const EditExpense = lp(() => import("../pages/expenses/EditExpense"));
export const ExpenseManagementConsolidated = lp(() => import("../pages/expenses/ExpenseManagementConsolidated"));
export const BudgetManagement = lp(() => import("../pages/expenses/BudgetManagement"));

// Assets
export const AssetDashboard = lp(() => import("../pages/assets/AssetDashboard"));
export const AssetList = lp(() => import("../pages/assets/AssetList"));
export const AddAsset = lp(() => import("../pages/assets/AddAsset"));
export const EditAsset = lp(() => import("../pages/assets/EditAsset"));
export const AssetDetails = lp(() => import("../pages/assets/AssetDetails"));
export const AssignAsset = lp(() => import("../pages/assets/AssignAsset"));
export const SendToRepair = lp(() => import("../pages/assets/SendToRepair"));
export const AssignmentHistory = lp(() => import("../pages/assets/AssignmentHistory"));
export const RepairLog = lp(() => import("../pages/assets/RepairLog"));
export const WarrantyTracker = lp(() => import("../pages/assets/WarrantyTracker"));
export const MyAssets = lp(() => import("../pages/assets/MyAssets"));
export const AssetManagement = lp(() => import("../pages/assets/AssetManagement"));

// Licenses
export const SoftwareLicenseDashboard = lp(() => import("../pages/licenses/SoftwareLicenseDashboard"));
export const SoftwareLicenseList = lp(() => import("../pages/licenses/SoftwareLicenseList"));
export const AddSoftwareLicense = lp(() => import("../pages/licenses/AddSoftwareLicense"));
export const EditSoftwareLicense = lp(() => import("../pages/licenses/EditSoftwareLicense"));
export const SoftwareLicenseDetails = lp(() => import("../pages/licenses/SoftwareLicenseDetails"));
export const AssignSoftwareLicense = lp(() => import("../pages/licenses/AssignSoftwareLicense"));
export const LicenseHistory = lp(() => import("../pages/licenses/LicenseHistory"));
export const LicenseExpiryAlerts = lp(() => import("../pages/licenses/LicenseExpiryAlerts"));
export const MyLicenses = lp(() => import("../pages/licenses/MyLicenses"));
export const SoftwareLicenseManagement = lp(() => import("../pages/licenses/SoftwareLicenseManagement"));

// Company mgmt
export const MeetingManagement = lp(() => import("../pages/meetings/MeetingManagement"));
export const PolicyManagement = lp(() => import("../pages/policies/PolicyManagement"));
export const AnnouncementManagement = lp(() => import("../pages/announcements/AnnouncementManagement"));
export const ReportsAnalytics = lp(() => import("../pages/reports/ReportsAnalytics"));

// Errors & public
export const NotFound = lp(() => import("../pages/errors/NotFound"));
export const Unauthorized = lp(() => import("../pages/errors/Unauthorized"));
export const GrowthSummitFinal = lp(() => import("../pages/GrowthSummitFinal"));
export const SupportPage = lp(() => import("../pages/support/SupportPage"));
export const SupportManagement = lp(() => import("../pages/support/SupportManagement"));

// Procurement
export const ProcurementDashboard = lp(() => import("../pages/procurement/ProcurementDashboard"));
export const MyPurchaseRequests = lp(() => import("../pages/procurement/purchase-requests/MyPurchaseRequests"));
export const CreatePurchaseRequest = lp(() => import("../pages/procurement/purchase-requests/CreatePurchaseRequest"));
export const EditPurchaseRequest = lp(() => import("../pages/procurement/purchase-requests/EditPurchaseRequest"));
export const PurchaseRequestDetails = lp(() => import("../pages/procurement/purchase-requests/PurchaseRequestDetails"));
export const PurchaseRequestApprovals = lp(() => import("../pages/procurement/purchase-requests/PurchaseRequestApprovals"));
export const PurchaseOrderList = lp(() => import("../pages/procurement/purchase-orders/PurchaseOrderList"));
export const CreatePurchaseOrder = lp(() => import("../pages/procurement/purchase-orders/CreatePurchaseOrder"));
export const PurchaseOrderDetails = lp(() => import("../pages/procurement/purchase-orders/PurchaseOrderDetails"));
export const GoodsReceiptList = lp(() => import("../pages/procurement/goods-receipts/GoodsReceiptList"));
export const CreateGoodsReceipt = lp(() => import("../pages/procurement/goods-receipts/CreateGoodsReceipt"));
export const GoodsReceiptDetails = lp(() => import("../pages/procurement/goods-receipts/GoodsReceiptDetails"));
export const VendorList = lp(() => import("../pages/procurement/vendors/VendorList"));
export const CreateVendor = lp(() => import("../pages/procurement/vendors/CreateVendor"));
export const EditVendor = lp(() => import("../pages/procurement/vendors/EditVendor"));
export const VendorDetails = lp(() => import("../pages/procurement/vendors/VendorDetails"));
export const ProcurementInvoiceList = lp(() => import("../pages/procurement/invoices/ProcurementInvoiceList"));
export const CreateProcurementInvoice = lp(() => import("../pages/procurement/invoices/CreateProcurementInvoice"));
export const ProcurementInvoiceDetails = lp(() => import("../pages/procurement/invoices/ProcurementInvoiceDetails"));
export const ProcurementPaymentList = lp(() => import("../pages/procurement/payments/ProcurementPaymentList"));
export const RecordPayment = lp(() => import("../pages/procurement/payments/RecordPayment"));
export const ProcurementReports = lp(() => import("../pages/procurement/reports/ProcurementReports"));

// Dashboards (lazy — loaded on /dashboard only)
export const SuperAdminDashboard = lp(() => import("../pages/dashboard/SuperAdminDashboard"));
export const AdminDashboard = lp(() => import("../pages/dashboard/AdminDashboard"));
export const HRDashboard = lp(() => import("../pages/dashboard/HRDashboard"));
export const AccountsDashboard = lp(() => import("../pages/dashboard/AccountsDashboard"));
export const EmployeeDashboard = lp(() => import("../pages/employee/EmployeeDashboard"));
export const ClientDashboard = lp(() => import("../pages/dashboard/ClientDashboard"));
export const HoDDashboard = lp(() => import("../pages/hod/HoDDashboard"));
