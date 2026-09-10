/**
 * Creative workflow access helpers — mirrors backend creativeWorkflowAuth.js
 */

/** @param {unknown} value */
export const resolveEntityId = (value) => {
  if (!value) return '';
  if (typeof value === 'object' && value !== null) {
    return String(value._id || value.id || '');
  }
  return String(value);
};

/**
 * @param {object|null|undefined} project
 * @returns {Set<string>}
 */
export const getProjectDepartmentHeadIds = (project) => {
  const ids = new Set();
  if (!project) return ids;

  const addHead = (dept) => {
    if (!dept || typeof dept !== 'object') return;
    const headId = resolveEntityId(dept.head);
    if (headId) ids.add(headId);
  };

  if (project.department && typeof project.department === 'object') {
    addHead(project.department);
  }

  if (Array.isArray(project.departments)) {
    project.departments.forEach(addHead);
  }

  return ids;
};

/**
 * @param {object|null|undefined} workItem
 * @returns {boolean}
 */
export const isCreativeWorkflowItem = (workItem) => {
  if (!workItem) return false;
  if (workItem.workflowMode === 'creative') return true;
  const type = workItem.workflowType || workItem.departmentWorkflowType;
  return type === 'design' || type === 'design-advanced' || type === 'video-production';
};

/**
 * @param {object|null|undefined} user
 * @param {object|null|undefined} workItem
 * @returns {boolean}
 */
export const isCreativeAssignee = (user, workItem) => {
  const userId = resolveEntityId(user?._id || user?.id);
  if (!userId || !workItem) return false;

  if (resolveEntityId(workItem.assignedTo) === userId) return true;

  if (Array.isArray(workItem.assignedToMultiple)) {
    return workItem.assignedToMultiple.some(
      (entry) => resolveEntityId(entry) === userId
    );
  }

  return false;
};

/**
 * @param {object|null|undefined} user
 * @param {object|null|undefined} workItem
 * @param {object|null|undefined} project
 * @returns {boolean}
 */
export const canPerformCreativeReview = (user, workItem, project) => {
  const userId = resolveEntityId(user?._id || user?.id);
  if (!userId || !workItem) return false;

  if (resolveEntityId(workItem.createdBy) === userId) return true;

  if (resolveEntityId(project?.projectHead) === userId) return true;

  return getProjectDepartmentHeadIds(project).has(userId);
};

/**
 * @param {object|null|undefined} user
 * @param {object|null|undefined} workItem
 * @param {object|null|undefined} project
 * @returns {boolean}
 */
export const canReviewCreativeWork = (user, workItem, project) => {
  if (!canPerformCreativeReview(user, workItem, project)) return false;

  if (!isCreativeAssignee(user, workItem)) return true;

  const userId = resolveEntityId(user?._id || user?.id);
  const projectHeadId = resolveEntityId(project?.projectHead);
  const deptHeadIds = getProjectDepartmentHeadIds(project);
  return (
    (projectHeadId && userId === projectHeadId) || deptHeadIds.has(userId)
  );
};

/**
 * @param {object|null|undefined} user
 * @param {object|null|undefined} workItem
 * @returns {boolean}
 */
export const isPostingAssignee = (user, workItem) => {
  const userId = resolveEntityId(user?._id || user?.id);
  if (!userId || !workItem) return false;
  return resolveEntityId(workItem.postingAssignedTo) === userId;
};

/** Only the selected posting team member submits live URLs. */
export const canSubmitPostingDone = (user, workItem) =>
  isPostingAssignee(user, workItem);

/**
 * Mark Done: creative assignee, assigner, project head, or department HoD.
 * @param {object|null|undefined} user
 * @param {object|null|undefined} workItem
 * @param {object|null|undefined} project
 * @returns {boolean}
 */
export const canMarkCreativeDone = (user, workItem, project) => {
  if (!workItem) return false;
  const status = workItem.status;
  if (workItem.requiresPosting) {
    if (status !== 'Posted') return false;
  } else if (status !== 'Delivered' && status !== 'Posted') {
    return false;
  }
  const userId = resolveEntityId(user?._id || user?.id);
  if (!userId) return false;
  if (isCreativeAssignee(user, workItem)) return true;
  if (resolveEntityId(workItem.createdBy) === userId) return true;
  if (resolveEntityId(project?.projectHead) === userId) return true;
  return getProjectDepartmentHeadIds(project).has(userId);
};

/**
 * Map creative status to progress percentage for dashboards.
 * @param {string} status
 * @returns {number}
 */
/** Assignee may pause active work to take priority task. */
export const canHoldCreativeWork = (user, workItem) => {
  if (!isCreativeAssignee(user, workItem)) return false;
  return ['In Progress', 'Rework In Progress'].includes(workItem?.status);
};

/** Resume a held task when no other task is actively running. */
export const canResumeCreativeWork = (user, workItem) => {
  if (!isCreativeAssignee(user, workItem)) return false;
  return workItem?.status === 'On Hold';
};

export const getCreativeStatusProgress = (status) => {
  const map = {
    'To Do': 5,
    Assigned: 5,
    Backlog: 5,
    'In Progress': 25,
    'On Hold': 20,
    'Rework In Progress': 35,
    'Submitted for Review': 50,
    'Changes Requested': 40,
    'QA Review': 70,
    Approved: 80,
    Delivered: 90,
    'Awaiting Posting': 92,
    Posted: 95,
    Closed: 100,
    Cancelled: 0,
  };
  return map[status] ?? 0;
};
