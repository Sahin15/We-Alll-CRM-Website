/**
 * Client-side initiate eligibility — mirrors backend growthTrackScope.js (sync subset).
 */

/** @param {unknown} value */
export function resolveEntityId(value) {
  if (!value) return "";
  if (typeof value === "object" && value !== null) {
    return String(value._id || value.id || "");
  }
  return String(value);
}

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
 * @param {object|null|undefined} user
 * @returns {boolean}
 */
export function isCompanyGrowthTrackManager(user) {
  if (!user) return false;
  return ["hr", "admin", "superadmin"].includes(user.role);
}

/**
 * Whether the actor may appear in the initiate-employee dropdown for this employee.
 *
 * @param {object} actor
 * @param {object} employee
 * @returns {boolean}
 */
export function canInitiateGrowthTrackForEmployee(actor, employee) {
  if (!actor || !employee) return false;
  if (isCompanyGrowthTrackManager(actor)) return true;

  const actorId = resolveEntityId(actor._id || actor.id);
  const reportsToActor =
    resolveEntityId(employee.reportingManager) === actorId;
  if (reportsToActor) return true;

  const isDeptViewer =
    actor.role === "hod" ||
    actor.isHeadOfDepartment === true ||
    Boolean(actor.headOfDepartment);

  if (isDeptViewer) {
    const ownedDept =
      resolveEntityId(actor.headOfDepartment) || departmentIdString(actor);
    const employeeDept = departmentIdString(employee);
    if (ownedDept && employeeDept && ownedDept === employeeDept) {
      return true;
    }
  }

  return false;
}
