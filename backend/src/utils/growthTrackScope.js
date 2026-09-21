import { getOwnedDepartmentIdForRoster, isOwnDepartmentTeamViewer } from './teamRosterScope.js';

/**
 * @param {object|null|undefined} userLike
 * @returns {string|null}
 */
export function departmentIdString(userLike) {
  if (!userLike?.department) return null;
  const dept = userLike.department;
  const id = dept._id || dept;
  return id ? String(id) : null;
}

/**
 * HR / platform roles with company-wide Growth Track management.
 *
 * @param {object|null|undefined} user
 * @returns {boolean}
 */
export function isCompanyGrowthTrackManager(user) {
  if (!user) return false;
  return ['hr', 'admin', 'superadmin'].includes(user.role);
}

/**
 * Whether the actor may initiate or manage a track for the given employee document.
 *
 * @param {object} actor - req.user
 * @param {object} employee - User document with department and reportingManager
 * @returns {Promise<boolean>}
 */
export async function canManageGrowthTrackForEmployee(actor, employee) {
  if (!actor || !employee) return false;
  if (isCompanyGrowthTrackManager(actor)) return true;

  const actorId = String(actor._id);
  const reportsToActor =
    String(employee.reportingManager?._id || employee.reportingManager || '') === actorId;
  if (reportsToActor) return true;

  if (isOwnDepartmentTeamViewer(actor)) {
    const ownedDept = await getOwnedDepartmentIdForRoster(actor);
    const employeeDept = departmentIdString(employee);
    if (ownedDept && employeeDept && String(ownedDept) === employeeDept) {
      return true;
    }
  }

  return false;
}

/**
 * Whether the actor may manage an existing track (targets, reviews, finalize).
 *
 * @param {object} actor
 * @param {object} track - GrowthTrack doc; employee may be populated
 * @param {object|null} [employeeDoc] - optional User when track.employee is only an id
 * @returns {Promise<boolean>}
 */
export async function canManageGrowthTrackRecord(actor, track, employeeDoc = null) {
  if (!actor || !track) return false;
  if (isCompanyGrowthTrackManager(actor)) return true;

  const managerId = String(track.manager?._id || track.manager || '');
  if (managerId && managerId === String(actor._id)) return true;

  const employee = employeeDoc || track.employee;
  if (employee && typeof employee === 'object' && employee.department !== undefined) {
    return canManageGrowthTrackForEmployee(actor, employee);
  }

  return false;
}
