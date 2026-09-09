/**
 * Creative workflow role checks — assigner, project head, department HOD only.
 */

import Project from "../models/projectModel.js";

/** @param {unknown} value */
function resolveId(value) {
  if (!value) return "";
  if (typeof value === "object" && value !== null) {
    return String(value._id || value.id || "");
  }
  return String(value);
}

/**
 * Collect department head user IDs from a project record.
 * @param {object|null|undefined} project
 * @returns {Set<string>}
 */
export function getProjectDepartmentHeadIds(project) {
  const ids = new Set();
  if (!project) return ids;

  const addHead = (dept) => {
    if (!dept || typeof dept !== "object") return;
    const headId = resolveId(dept.head);
    if (headId) ids.add(headId);
  };

  if (project.department) {
    if (typeof project.department === "object") {
      addHead(project.department);
    }
  }

  if (Array.isArray(project.departments)) {
    project.departments.forEach((dept) => addHead(dept));
  }

  return ids;
}

/**
 * @param {object} user
 * @param {object} workItem
 * @param {object|null|undefined} project
 */
export function canPerformCreativeReview(user, workItem, project) {
  const userId = resolveId(user?._id || user?.id);
  if (!userId || !workItem) return false;

  const assignerId = resolveId(workItem.createdBy);
  if (assignerId && userId === assignerId) return true;

  const projectHeadId = resolveId(project?.projectHead);
  if (projectHeadId && userId === projectHeadId) return true;

  const deptHeadIds = getProjectDepartmentHeadIds(project);
  if (deptHeadIds.has(userId)) return true;

  return false;
}

/**
 * Assignee check — primary or multi-assignee.
 * @param {object} user
 * @param {object} workItem
 */
export function isCreativeAssignee(user, workItem) {
  const userId = resolveId(user?._id || user?.id);
  if (!userId || !workItem) return false;

  if (resolveId(workItem.assignedTo) === userId) return true;

  if (Array.isArray(workItem.assignedToMultiple)) {
    return workItem.assignedToMultiple.some(
      (entry) => resolveId(entry) === userId
    );
  }

  return false;
}

/**
 * Posting assignee or creative reviewer.
 * @param {object} user
 * @param {object} workItem
 * @param {object|null|undefined} project
 */
export function canSubmitPostingDone(user, workItem, project) {
  const userId = resolveId(user?._id || user?.id);
  if (!userId || !workItem) return false;

  if (resolveId(workItem.postingAssignedTo) === userId) return true;
  return canPerformCreativeReview(user, workItem, project);
}

/**
 * Block assignee from reviewing unless they are project head or department HOD.
 * @param {object} user
 * @param {object} workItem
 * @param {object|null|undefined} project
 */
export function assertCanReviewCreativeWork(user, workItem, project) {
  if (!canPerformCreativeReview(user, workItem, project)) {
    const err = new Error(
      "Only the assigner, project head, or department HOD can review creative work"
    );
    err.statusCode = 403;
    throw err;
  }

  if (!isCreativeAssignee(user, workItem)) {
    return;
  }

  const userId = resolveId(user?._id || user?.id);
  const projectHeadId = resolveId(project?.projectHead);
  const deptHeadIds = getProjectDepartmentHeadIds(project);
  const isLead =
    (projectHeadId && userId === projectHeadId) || deptHeadIds.has(userId);

  if (!isLead) {
    const err = new Error(
      "Assignees cannot review their own work unless they are project head or department HOD"
    );
    err.statusCode = 403;
    throw err;
  }
}

/**
 * Load project with heads populated for auth checks.
 * @param {string|import('mongoose').Types.ObjectId} projectId
 */
export async function loadProjectForCreativeAuth(projectId) {
  if (!projectId) return null;
  return Project.findById(projectId)
    .select("projectHead department departments")
    .populate("projectHead", "_id name email")
    .populate("department", "name head")
    .populate("departments", "name head")
    .populate("department.head", "_id name email")
    .populate("departments.head", "_id name email")
    .lean();
}

/**
 * Assignee-only actions.
 * @param {object} user
 * @param {object} workItem
 */
export function assertCanPerformAssigneeAction(user, workItem) {
  if (!isCreativeAssignee(user, workItem)) {
    const err = new Error("Only the assigned team member can perform this action");
    err.statusCode = 403;
    throw err;
  }
}
