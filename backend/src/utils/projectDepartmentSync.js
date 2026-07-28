/**
 * Keep project.departments in sync with team members' home departments.
 * Example: adding a Posting employee auto-adds the Posting department/service.
 */

/**
 * @param {import("mongoose").Document} project
 * @param {Array<import("mongoose").Document|object|string|null>} users
 * @returns {string[]} newly added department id strings
 */
export function ensureProjectDepartmentsFromUsers(project, users = []) {
  if (!project) return [];

  if (!Array.isArray(project.departments)) {
    project.departments = [];
  }

  const existing = new Set(
    project.departments
      .map((d) => (d?._id || d)?.toString?.())
      .filter(Boolean)
  );

  const added = [];

  for (const user of users) {
    if (!user) continue;
    const deptId = (user.department?._id || user.department)?.toString?.();
    if (!deptId) continue;
    if (existing.has(deptId)) continue;
    project.departments.push(deptId);
    existing.add(deptId);
    added.push(deptId);
  }

  // Keep legacy single department field populated if empty
  if (!project.department && project.departments.length > 0) {
    project.department = project.departments[0];
  }

  return added;
}

export default {
  ensureProjectDepartmentsFromUsers,
};
