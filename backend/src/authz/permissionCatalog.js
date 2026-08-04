/**
 * Authorization V2 — Permission catalog (data-only registry).
 * Naming: {module}.{resource}.{action}
 *
 * @typedef {Object} PermissionDefinition
 * @property {string} key
 * @property {string} module
 * @property {string} description
 */

/** @type {PermissionDefinition[]} */
export const PERMISSION_CATALOG = [
  // Platform
  { key: 'platform.admin', module: 'platform', description: 'Full platform administration' },

  // Dashboard
  { key: 'dashboard.view', module: 'dashboard', description: 'View role dashboard' },

  // Profile
  { key: 'profile.view', module: 'profile', description: 'View own profile' },
  { key: 'profile.update', module: 'profile', description: 'Update own profile' },

  // Support
  { key: 'support.view', module: 'support', description: 'View support contacts' },
  { key: 'support.manage', module: 'support', description: 'Manage support categories' },

  // Team / Users — sidebar: Users=update, Employees=view, Departments=department.*
  { key: 'team.user.view', module: 'team', description: 'Team menu — Employees list (/employees)' },
  { key: 'team.user.create', module: 'team', description: 'Create users / add employees' },
  { key: 'team.user.update', module: 'team', description: 'Team menu — Users admin list (/users). Superadmin only by default; assign via Permission Assignment if needed.' },
  { key: 'team.department.view', module: 'team', description: 'Team menu — Departments admin tab (/departments). Not granted to all employees by default; assign via Permission Assignment.' },
  { key: 'team.department.manage', module: 'team', description: 'Manage departments (includes view)' },

  // Attendance
  { key: 'attendance.record.view_self', module: 'attendance', description: 'View own attendance' },
  { key: 'attendance.record.view', module: 'attendance', description: 'View attendance records' },
  { key: 'attendance.record.manage', module: 'attendance', description: 'Manage attendance records' },
  { key: 'attendance.clock', module: 'attendance', description: 'Clock in and out' },

  // Leave
  { key: 'leave.request.create', module: 'leave', description: 'Create leave requests' },
  { key: 'leave.request.view_self', module: 'leave', description: 'View own leave requests' },
  { key: 'leave.request.view', module: 'leave', description: 'View leave requests' },
  { key: 'leave.request.approve', module: 'leave', description: 'Approve or reject leave' },

  // Work log
  { key: 'worklog.entry.create', module: 'worklog', description: 'Create work log entries' },
  { key: 'worklog.entry.view_self', module: 'worklog', description: 'View own work logs' },
  { key: 'worklog.entry.review', module: 'worklog', description: 'Team menu — Work Log Management (/admin/worklog-management)' },

  // Projects
  { key: 'projects.project.view', module: 'projects', description: 'View projects' },
  { key: 'projects.project.manage', module: 'projects', description: 'Manage projects' },

  // Work items
  { key: 'work.item.view', module: 'work', description: 'View work items' },
  { key: 'work.item.create', module: 'work', description: 'Create work items' },
  { key: 'work.item.update', module: 'work', description: 'Update work items' },
  { key: 'work.item.approve', module: 'work', description: 'Approve work in review' },
  { key: 'work.dashboard.view', module: 'work', description: 'View company Work Management Dashboard' },

  // Company
  { key: 'company.meeting.view', module: 'company', description: 'View meetings' },
  { key: 'company.meeting.manage', module: 'company', description: 'Manage meetings' },
  { key: 'company.policy.view', module: 'company', description: 'View policies' },
  { key: 'company.policy.manage', module: 'company', description: 'Manage policies' },
  { key: 'company.announcement.view', module: 'company', description: 'View announcements' },
  { key: 'company.announcement.manage', module: 'company', description: 'Manage announcements' },

  // Hiring — HoD uses Daily Work Log; HR uses Hiring menu (COMPANY scope)
  { key: 'hiring.request.create', module: 'hiring', description: 'Daily Work Log → Hiring Requests — create & submit (/hod/hiring/requests/new). Scope: OWN_DEPARTMENT for HoD.' },
  { key: 'hiring.request.view', module: 'hiring', description: 'Daily Work Log → Hiring Requests list (/hod/hiring/requests). HR pipeline tab needs COMPANY scope (not OWN_DEPARTMENT).' },
  { key: 'hiring.pipeline.manage', module: 'hiring', description: 'HR → Hiring menu — overview, CV bank, offer letters (/hr/hiring/*). Company-wide HR pipeline.' },

  // Procurement
  { key: 'procurement.pr.create', module: 'procurement', description: 'Create purchase requests' },
  { key: 'procurement.pr.view_self', module: 'procurement', description: 'View own purchase requests' },
  { key: 'procurement.pr.view', module: 'procurement', description: 'View purchase requests' },
  { key: 'procurement.pr.approve_hod', module: 'procurement', description: 'HoD approve purchase requests' },
  { key: 'procurement.pr.approve_admin', module: 'procurement', description: 'Admin approve purchase requests' },
  { key: 'procurement.po.manage', module: 'procurement', description: 'Manage purchase orders' },
  { key: 'procurement.vendor.manage', module: 'procurement', description: 'Manage vendors' },

  // CRM
  { key: 'crm.lead.view', module: 'crm', description: 'Business Management — view Leads list and details' },
  { key: 'crm.lead.manage', module: 'crm', description: 'Business Management — create and edit leads' },
  { key: 'crm.client.view', module: 'crm', description: 'Business Management — view all clients' },
  { key: 'crm.client.view_assigned', module: 'crm', description: 'Business Management — view assigned clients only' },
  { key: 'crm.client.manage', module: 'crm', description: 'Business Management — manage clients' },
  { key: 'crm.rawdata.manage', module: 'crm', description: 'Business Management — Raw Data Sheet and Calling Queue' },
  { key: 'crm.rawdata.analytics.view', module: 'crm', description: 'Business Management — Raw Data Analytics dashboard' },

  // Billing
  { key: 'billing.invoice.view', module: 'billing', description: 'View invoices' },
  { key: 'billing.invoice.manage', module: 'billing', description: 'Manage invoices' },
  { key: 'billing.subscription.view', module: 'billing', description: 'View subscriptions' },
  { key: 'billing.subscription.manage', module: 'billing', description: 'Manage subscriptions' },
  { key: 'billing.payment.verify', module: 'billing', description: 'Verify client payments' },

  // Finance / Payroll
  { key: 'expense.claim.create', module: 'finance', description: 'Submit expense claims' },
  { key: 'expense.claim.approve', module: 'finance', description: 'Approve expense claims' },
  { key: 'payroll.structure.manage', module: 'finance', description: 'Manage salary structures' },
  { key: 'payroll.slip.view_self', module: 'finance', description: 'View own salary slips' },
  { key: 'payroll.slip.manage', module: 'finance', description: 'Manage salary slips' },
  { key: 'payroll.period.manage', module: 'finance', description: 'Open, freeze, lock, and unlock payroll periods' },
  { key: 'payroll.component.manage', module: 'finance', description: 'Manage salary component catalog' },
  { key: 'payroll.run.process', module: 'finance', description: 'Run payroll dual-run / processing tools' },
  { key: 'payroll.approval.manage', module: 'finance', description: 'Create and act on payroll approval workflows' },
  { key: 'payroll.bank.export', module: 'finance', description: 'Export payroll bank NEFT CSV and compliance registers' },

  // Resources
  { key: 'assets.asset.view', module: 'resources', description: 'View assets' },
  { key: 'assets.asset.manage', module: 'resources', description: 'Manage assets' },
  { key: 'licenses.license.view', module: 'resources', description: 'View software licenses' },
  { key: 'licenses.license.manage', module: 'resources', description: 'Manage software licenses' },

  // Reports
  { key: 'reports.analytics.view', module: 'reports', description: 'View reports and analytics' },

  // Auth admin (future)
  { key: 'auth.role.manage', module: 'auth', description: 'Manage access roles' },
  { key: 'auth.permission.assign', module: 'auth', description: 'Assign permissions to users' },
];

/** @type {Set<string>} */
export const VALID_PERMISSION_KEYS = new Set(PERMISSION_CATALOG.map((p) => p.key));

/**
 * @param {string} key
 * @returns {boolean}
 */
export function isValidPermissionKey(key) {
  return VALID_PERMISSION_KEYS.has(key);
}

/**
 * @returns {Record<string, PermissionDefinition[]>}
 */
export function getPermissionsByModule() {
  return PERMISSION_CATALOG.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {});
}
