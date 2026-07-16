/**
 * Page-level access rules: permission key + legacy role fallback.
 * Used with AuthContext.canAccess() during Phase 11 migration.
 */

/** @typedef {{ permission: string, fallbackRoles: string[] }} PageAccessRule */

/** @type {Record<string, PageAccessRule>} */
export const PAGE_ACCESS = {
  platformAdmin: {
    permission: 'auth.role.manage',
    fallbackRoles: ['admin', 'superadmin'],
  },
  departmentAdmin: {
    permission: 'team.department.manage',
    fallbackRoles: ['admin', 'superadmin', 'hr'],
  },
  teamManage: {
    permission: 'team.user.update',
    fallbackRoles: ['admin', 'superadmin', 'hr', 'manager'],
  },
  teamUserAdmin: {
    permission: 'team.user.view',
    fallbackRoles: ['admin', 'superadmin'],
  },
  projectManage: {
    permission: 'projects.project.manage',
    fallbackRoles: ['admin', 'superadmin', 'hr', 'manager', 'hod'],
  },
  projectFilterAdmin: {
    permission: 'projects.project.manage',
    fallbackRoles: ['admin', 'superadmin', 'hr', 'hod', 'manager'],
  },
  workManage: {
    permission: 'work.item.update',
    fallbackRoles: ['admin', 'superadmin', 'hr', 'manager'],
  },
  crmLeadManage: {
    permission: 'crm.lead.manage',
    fallbackRoles: ['admin', 'superadmin', 'manager', 'hod'],
  },
  crmLeadView: {
    permission: 'crm.lead.view',
    fallbackRoles: ['admin', 'superadmin', 'manager', 'employee', 'hod'],
  },
  crmRawDataAnalyticsView: {
    permission: 'crm.rawdata.analytics.view',
    fallbackRoles: ['admin', 'superadmin', 'manager'],
  },
  crmClientManage: {
    permission: 'crm.client.manage',
    fallbackRoles: ['hr', 'manager', 'admin', 'superadmin'],
  },
  crmRawDataManage: {
    permission: 'crm.rawdata.manage',
    fallbackRoles: ['admin', 'superadmin', 'manager', 'hod'],
  },
  procurementWrite: {
    permission: 'procurement.po.manage',
    fallbackRoles: ['admin', 'superadmin', 'accounts'],
  },
  procurementOpsWrite: {
    permission: 'procurement.po.manage',
    fallbackRoles: ['admin', 'superadmin', 'accounts', 'hr', 'manager'],
  },
  procurementDashboard: {
    permission: 'procurement.pr.view',
    fallbackRoles: ['admin', 'superadmin', 'accounts'],
  },
  expenseApprove: {
    permission: 'expense.claim.approve',
    fallbackRoles: ['admin', 'superadmin', 'hr', 'manager'],
  },
  assetsManage: {
    permission: 'assets.asset.manage',
    fallbackRoles: ['hr', 'admin', 'superadmin', 'manager', 'hod'],
  },
  licensesManage: {
    permission: 'licenses.license.manage',
    fallbackRoles: ['hr', 'admin', 'superadmin', 'manager', 'hod'],
  },
  attendanceHrManage: {
    permission: 'attendance.record.manage',
    fallbackRoles: ['hr', 'admin', 'superadmin'],
  },
  attendanceHodView: {
    permission: 'attendance.record.view',
    fallbackRoles: ['hr', 'admin', 'superadmin', 'hod'],
  },
  wfhManage: {
    permission: 'leave.request.approve',
    fallbackRoles: ['admin', 'superadmin', 'hr', 'manager', 'hod'],
  },
  companyAnnounceManage: {
    permission: 'company.announcement.manage',
    fallbackRoles: ['admin', 'superadmin', 'hr'],
  },
  companyHolidayManage: {
    permission: 'company.policy.manage',
    fallbackRoles: ['admin', 'superadmin', 'hr'],
  },
  reportsAnalytics: {
    permission: 'reports.analytics.view',
    fallbackRoles: ['admin', 'superadmin', 'hr', 'manager', 'hod'],
  },
  workDashboard: {
    permission: 'work.dashboard.view',
    fallbackRoles: ['admin', 'superadmin', 'hr', 'manager'],
  },
  payrollManage: {
    permission: 'payroll.structure.manage',
    fallbackRoles: ['admin', 'superadmin'],
  },
  profileHrView: {
    permission: 'team.user.update',
    fallbackRoles: ['hr', 'admin', 'superadmin'],
  },
  profileStaffView: {
    permission: 'profile.view',
    fallbackRoles: ['employee', 'hod', 'hr', 'manager'],
  },
  feedbackAdmin: {
    permission: 'team.user.update',
    fallbackRoles: ['admin', 'superadmin', 'hr'],
  },
  navbarStaffMenu: {
    permission: 'dashboard.view',
    fallbackRoles: ['employee', 'hr', 'hod', 'accounts', 'manager'],
  },
  clientAssignStaff: {
    permission: 'crm.client.view_assigned',
    fallbackRoles: ['employee', 'hod'],
  },
};

/**
 * @param {(permission: string, fallbackRoles?: string[]) => boolean} canAccess
 * @param {PageAccessRule} rule
 * @returns {boolean}
 */
export function checkPageAccess(canAccess, rule) {
  return canAccess(rule.permission, rule.fallbackRoles);
}
