#!/usr/bin/env node

/**
 * Script to convert routes to use lazy loading with Suspense
 * This properly wraps all page components with React.lazy() and Suspense
 */

const fs = require('fs');
const path = require('path');

const routesFile = path.join(__dirname, 'src/routes/index.jsx');
let content = fs.readFileSync(routesFile, 'utf-8');

// Step 1: Add imports at the top
const importSection = `import { Routes, Route, Navigate, Suspense } from "react-router-dom";
import { lazy } from "react";
import PWAShell from "../pages/app/PWAShell";
import MobileAppShell from "../pages/mobileapp/MobileAppShell";
import { useAuth } from "../context/AuthContext";
import { RouteLoadingFallback } from "../components/RouteWrapper";

// Layouts
import MainLayout from "../components/layout/MainLayout";
import AuthLayout from "../components/layout/AuthLayout";

// Protected Routes
import ProtectedRoute from "./ProtectedRoute";
import PermissionRoute from "./PermissionRoute";

// Auth Pages - Keep eager loaded (needed immediately)
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";`;

// Step 2: Replace all page imports with lazy() versions
const pageImports = [
  'SuperAdminDashboard', 'AdminDashboard', 'HRDashboard', 'AccountsDashboard',
  'EmployeeDashboard', 'ClientDashboard', 'HoDDashboard',
  'MyProjects', 'MyWorkPage', 'AssignedWorkPage', 'MyMeetings', 'TeamDirectory',
  'MySalarySlips', 'MySalaryPreview', 'SalaryManagement', 'HRSalaryPreviewManagement',
  'TemplateManagement', 'Announcements', 'EmployeeMyAttendance', 'EmployeeMyLeaves',
  'EmployeeAttendanceReport', 'TimeTracking', 'Policies', 'Settings', 'HRSettings',
  'AdminSettings', 'HODSettings', 'UserList', 'UserDetails', 'EmployeeList',
  'AddEmployee', 'EnhancedEmployeeWorkView', 'EmployeeProfileManagement',
  'DepartmentList', 'DepartmentDetails', 'MyLeaves', 'LeaveRequests', 'LeaveManagement',
  'MyAttendance', 'AttendanceTracking', 'OvertimeStatistics', 'MyWorkLog',
  'WorkLogHistory', 'WorkLogManagement', 'HoDWorkLogReview', 'ClientList',
  'ClientDetails', 'RawDataList', 'CallerQueuePage', 'RawDataDashboard',
  'LeadList', 'LeadDetails', 'ProjectList', 'ProjectListPage', 'ProjectDetails',
  'ProjectWorkspace', 'CalendarPage', 'MyWorkCalendar', 'AdminWorkCalendarOverview',
  'EnhancedAdminWorkCalendarOverview', 'MyProfile', 'AdminBillingDashboard',
  'ServiceManagement', 'PlanManagement', 'SubscriptionManagement', 'InvoiceManagement',
  'PaymentVerification', 'ClientBillingDashboard', 'ClientSubscriptions',
  'ClientInvoices', 'ClientPayments', 'NotificationManagement', 'NotificationDashboard',
  'NotificationSettings', 'HolidayManagement', 'MyExpenses', 'CreateExpense',
  'ExpenseDetails', 'EditExpense', 'ExpenseManagementConsolidated', 'BudgetManagement',
  'AssetDashboard', 'AssetList', 'AddAsset', 'EditAsset', 'AssetDetails',
  'AssignAsset', 'SendToRepair', 'AssignmentHistory', 'RepairLog', 'WarrantyTracker',
  'MyAssets', 'AssetManagement', 'SoftwareLicenseDashboard', 'SoftwareLicenseList',
  'AddSoftwareLicense', 'EditSoftwareLicense', 'SoftwareLicenseDetails',
  'AssignSoftwareLicense', 'LicenseHistory', 'LicenseExpiryAlerts', 'MyLicenses',
  'SoftwareLicenseManagement', 'MeetingManagement', 'PolicyManagement',
  'AnnouncementManagement', 'ReportsAnalytics', 'ProcurementDashboard',
  'VendorList', 'VendorDetails', 'CreateVendor', 'EditVendor', 'MyPurchaseRequests',
  'PurchaseRequestApprovals', 'CreatePurchaseRequest', 'PurchaseRequestDetails',
  'EditPurchaseRequest', 'PurchaseOrderList', 'CreatePurchaseOrder',
  'PurchaseOrderDetails', 'GoodsReceiptList', 'CreateGoodsReceipt',
  'GoodsReceiptDetails', 'ProcurementInvoiceList', 'CreateProcurementInvoice',
  'ProcurementInvoiceDetails', 'ProcurementPaymentList', 'RecordPayment',
  'ProcurementReports', 'NotFound', 'Unauthorized', 'GrowthSummitFinal',
  'SupportPage', 'SupportManagement'
];

let lazyImports = '';
pageImports.forEach(comp => {
  const path = getComponentPath(comp);
  lazyImports += `const ${comp} = lazy(() => import("${path}"));\n`;
});

// Replace the old imports section
const oldImportEnd = content.indexOf('const AppRoutes = () => {');
const newImports = importSection + '\n\n' + lazyImports + '\n';
content = content.substring(0, content.indexOf('import')) + newImports + content.substring(oldImportEnd);

// Step 3: Wrap all component elements with Suspense
// This is complex, so we'll do it with a more targeted approach
content = content.replace(
  /element=\{<([A-Z][a-zA-Z0-9]*)\s*\/>/g,
  'element={<Suspense fallback={<RouteLoadingFallback />}><$1 /></Suspense>}'
);

fs.writeFileSync(routesFile, content);
console.log('✓ Routes converted to lazy loading successfully!');

function getComponentPath(comp) {
  const paths = {
    'SuperAdminDashboard': '../pages/dashboard/SuperAdminDashboard',
    'AdminDashboard': '../pages/dashboard/AdminDashboard',
    'HRDashboard': '../pages/dashboard/HRDashboard',
    'AccountsDashboard': '../pages/dashboard/AccountsDashboard',
    'EmployeeDashboard': '../pages/employee/EmployeeDashboard',
    'ClientDashboard': '../pages/dashboard/ClientDashboard',
    'HoDDashboard': '../pages/hod/HoDDashboard',
    'MyProjects': '../pages/employee/MyProjects',
    'MyWorkPage': '../pages/employee/MyWorkPage',
    'AssignedWorkPage': '../pages/employee/AssignedWorkPage',
    'MyMeetings': '../pages/employee/MyMeetings',
    'TeamDirectory': '../pages/employee/TeamDirectory',
    'MySalarySlips': '../pages/employee/MySalarySlips',
    'MySalaryPreview': '../pages/employee/MySalaryPreview',
    'SalaryManagement': '../pages/hr/SalaryManagement',
    'HRSalaryPreviewManagement': '../components/salary/HRSalaryPreviewManagement',
    'TemplateManagement': '../components/salary/TemplateManagement',
    'Announcements': '../pages/employee/Announcements',
    'EmployeeMyAttendance': '../pages/employee/MyAttendance',
    'EmployeeMyLeaves': '../pages/employee/MyLeaves',
    'EmployeeAttendanceReport': '../pages/employee/EmployeeAttendanceReport',
    'TimeTracking': '../pages/employee/TimeTracking',
    'Policies': '../pages/employee/Policies',
    'Settings': '../pages/employee/Settings',
    'HRSettings': '../pages/hr/HRSettings',
    'AdminSettings': '../pages/admin/AdminSettings',
    'HODSettings': '../pages/hod/HODSettings',
    'UserList': '../pages/users/UserList',
    'UserDetails': '../pages/users/UserDetails',
    'EmployeeList': '../pages/employees/EmployeeList',
    'AddEmployee': '../pages/employees/AddEmployee',
    'EnhancedEmployeeWorkView': '../pages/employees/EnhancedEmployeeWorkView',
    'EmployeeProfileManagement': '../components/hr/EmployeeProfileManagement',
    'DepartmentList': '../pages/departments/DepartmentList',
    'DepartmentDetails': '../pages/departments/DepartmentDetails',
    'MyLeaves': '../pages/leaves/MyLeaves',
    'LeaveRequests': '../pages/leaves/LeaveRequests',
    'LeaveManagement': '../pages/leaves/LeaveManagement',
    'MyAttendance': '../pages/attendance/MyAttendance',
    'AttendanceTracking': '../pages/attendance/AttendanceTracking',
    'OvertimeStatistics': '../pages/attendance/OvertimeStatistics',
    'MyWorkLog': '../pages/worklog/MyWorkLog',
    'WorkLogHistory': '../pages/worklog/WorkLogHistory',
    'WorkLogManagement': '../pages/worklog/WorkLogManagement',
    'HoDWorkLogReview': '../pages/worklog/HoDWorkLogReview',
    'ClientList': '../pages/clients/ClientList',
    'ClientDetails': '../pages/clients/ClientDetails',
    'RawDataList': '../pages/raw-data/RawDataList',
    'CallerQueuePage': '../pages/raw-data/CallerQueuePage',
    'RawDataDashboard': '../pages/raw-data/RawDataDashboard',
    'LeadList': '../pages/leads/LeadList',
    'LeadDetails': '../pages/leads/LeadDetails',
    'ProjectList': '../pages/projects/ProjectList',
    'ProjectListPage': '../pages/projects/ProjectListPage',
    'ProjectDetails': '../pages/projects/ProjectDetails',
    'ProjectWorkspace': '../pages/projects/ProjectWorkspace',
    'CalendarPage': '../pages/calendar/CalendarPage',
    'MyWorkCalendar': '../pages/work-calendar/MyWorkCalendar',
    'AdminWorkCalendarOverview': '../pages/work-calendar/AdminWorkCalendarOverview',
    'EnhancedAdminWorkCalendarOverview': '../pages/work-calendar/EnhancedAdminWorkCalendarOverview',
    'MyProfile': '../pages/profile/MyProfile',
    'AdminBillingDashboard': '../pages/admin/AdminBillingDashboard',
    'ServiceManagement': '../pages/admin/ServiceManagement',
    'PlanManagement': '../pages/admin/PlanManagement',
    'SubscriptionManagement': '../pages/admin/SubscriptionManagement',
    'InvoiceManagement': '../pages/admin/InvoiceManagement',
    'PaymentVerification': '../pages/admin/PaymentVerification',
    'ClientBillingDashboard': '../pages/client/ClientBillingDashboard',
    'ClientSubscriptions': '../pages/client/ClientSubscriptions',
    'ClientInvoices': '../pages/client/ClientInvoices',
    'ClientPayments': '../pages/client/ClientPayments',
    'NotificationManagement': '../components/admin/NotificationManagement',
    'NotificationDashboard': '../components/notifications/NotificationDashboard',
    'NotificationSettings': '../components/notifications/NotificationSettings',
    'HolidayManagement': '../components/hr/HolidayManagement',
    'MyExpenses': '../pages/expenses/MyExpenses',
    'CreateExpense': '../pages/expenses/CreateExpense',
    'ExpenseDetails': '../pages/expenses/ExpenseDetails',
    'EditExpense': '../pages/expenses/EditExpense',
    'ExpenseManagementConsolidated': '../pages/expenses/ExpenseManagementConsolidated',
    'BudgetManagement': '../pages/expenses/BudgetManagement',
    'AssetDashboard': '../pages/assets/AssetDashboard',
    'AssetList': '../pages/assets/AssetList',
    'AddAsset': '../pages/assets/AddAsset',
    'EditAsset': '../pages/assets/EditAsset',
    'AssetDetails': '../pages/assets/AssetDetails',
    'AssignAsset': '../pages/assets/AssignAsset',
    'SendToRepair': '../pages/assets/SendToRepair',
    'AssignmentHistory': '../pages/assets/AssignmentHistory',
    'RepairLog': '../pages/assets/RepairLog',
    'WarrantyTracker': '../pages/assets/WarrantyTracker',
    'MyAssets': '../pages/assets/MyAssets',
    'AssetManagement': '../pages/assets/AssetManagement',
    'SoftwareLicenseDashboard': '../pages/licenses/SoftwareLicenseDashboard',
    'SoftwareLicenseList': '../pages/licenses/SoftwareLicenseList',
    'AddSoftwareLicense': '../pages/licenses/AddSoftwareLicense',
    'EditSoftwareLicense': '../pages/licenses/EditSoftwareLicense',
    'SoftwareLicenseDetails': '../pages/licenses/SoftwareLicenseDetails',
    'AssignSoftwareLicense': '../pages/licenses/AssignSoftwareLicense',
    'LicenseHistory': '../pages/licenses/LicenseHistory',
    'LicenseExpiryAlerts': '../pages/licenses/LicenseExpiryAlerts',
    'MyLicenses': '../pages/licenses/MyLicenses',
    'SoftwareLicenseManagement': '../pages/licenses/SoftwareLicenseManagement',
    'MeetingManagement': '../pages/meetings/MeetingManagement',
    'PolicyManagement': '../pages/policies/PolicyManagement',
    'AnnouncementManagement': '../pages/announcements/AnnouncementManagement',
    'ReportsAnalytics': '../pages/reports/ReportsAnalytics',
    'ProcurementDashboard': '../pages/procurement/ProcurementDashboard',
    'VendorList': '../pages/procurement/vendors/VendorList',
    'VendorDetails': '../pages/procurement/vendors/VendorDetails',
    'CreateVendor': '../pages/procurement/vendors/CreateVendor',
    'EditVendor': '../pages/procurement/vendors/EditVendor',
    'MyPurchaseRequests': '../pages/procurement/purchase-requests/MyPurchaseRequests',
    'PurchaseRequestApprovals': '../pages/procurement/purchase-requests/PurchaseRequestApprovals',
    'CreatePurchaseRequest': '../pages/procurement/purchase-requests/CreatePurchaseRequest',
    'PurchaseRequestDetails': '../pages/procurement/purchase-requests/PurchaseRequestDetails',
    'EditPurchaseRequest': '../pages/procurement/purchase-requests/EditPurchaseRequest',
    'PurchaseOrderList': '../pages/procurement/purchase-orders/PurchaseOrderList',
    'CreatePurchaseOrder': '../pages/procurement/purchase-orders/CreatePurchaseOrder',
    'PurchaseOrderDetails': '../pages/procurement/purchase-orders/PurchaseOrderDetails',
    'GoodsReceiptList': '../pages/procurement/goods-receipts/GoodsReceiptList',
    'CreateGoodsReceipt': '../pages/procurement/goods-receipts/CreateGoodsReceipt',
    'GoodsReceiptDetails': '../pages/procurement/goods-receipts/GoodsReceiptDetails',
    'ProcurementInvoiceList': '../pages/procurement/invoices/ProcurementInvoiceList',
    'CreateProcurementInvoice': '../pages/procurement/invoices/CreateProcurementInvoice',
    'ProcurementInvoiceDetails': '../pages/procurement/invoices/ProcurementInvoiceDetails',
    'ProcurementPaymentList': '../pages/procurement/payments/ProcurementPaymentList',
    'RecordPayment': '../pages/procurement/payments/RecordPayment',
    'ProcurementReports': '../pages/procurement/reports/ProcurementReports',
    'NotFound': '../pages/errors/NotFound',
    'Unauthorized': '../pages/errors/Unauthorized',
    'GrowthSummitFinal': '../pages/GrowthSummitFinal',
    'SupportPage': '../pages/support/SupportPage',
    'SupportManagement': '../pages/support/SupportManagement'
  };
  return paths[comp] || `../pages/${comp}`;
}
