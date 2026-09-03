/**
 * Whether the user can list all company projects (admin-style), not personal assignments only.
 *
 * @param {string | undefined} userRole
 * @returns {boolean}
 */
export function canViewAllCompanyProjectsByRole(userRole) {
  return ['admin', 'superadmin', 'hr', 'manager'].includes(userRole);
}

/** Role-only helper; use resourceVisibility.canViewAllCompanyProjects when authz is loaded. */
export function canViewAllCompanyProjects(userRole) {
  return canViewAllCompanyProjectsByRole(userRole);
}
