import { can } from '../authz/policyEngine.js';
import { SCOPES } from '../authz/scopes.js';
import { AiAccessError } from './aiErrors.js';

const WIDE_SCOPES = new Set([SCOPES.COMPANY, SCOPES.PLATFORM]);
const NO_PERSONAL_ATTENDANCE = new Set(['client', 'admin', 'superadmin']);

/**
 * @param {string} scope
 * @returns {boolean}
 */
export function isWideScope(scope) {
  return WIDE_SCOPES.has(scope);
}

/**
 * @param {object} user
 * @returns {string}
 */
export function ownDepartmentId(user) {
  const id = user?.department || user?.headOfDepartment;
  return id ? String(id) : '';
}

/**
 * @param {object} user
 * @param {string} permission
 * @param {string} message
 */
export function requirePermission(user, permission, message) {
  const decision = can(user, permission);
  if (!decision.allowed) {
    throw new AiAccessError(
      403,
      message || 'You do not have permission to view that information.'
    );
  }
  return decision;
}

/**
 * Non-company scopes may only read their own department.
 * @param {object} user
 * @param {{ scope?: string }} decision
 * @param {string|object|null|undefined} departmentId
 */
export function assertDepartmentInScope(user, decision, departmentId) {
  if (isWideScope(decision?.scope)) return;
  const own = ownDepartmentId(user);
  if (!departmentId || !own || String(departmentId) !== own) {
    throw new AiAccessError(403, 'You can only view information for your own department.');
  }
}

/**
 * Matches getMyAttendance: admin, superadmin, and client have no personal attendance rows.
 * @param {object} user
 * @returns {boolean}
 */
export function hasPersonalAttendance(user) {
  return !NO_PERSONAL_ATTENDANCE.has(user?.role);
}
