const TERMINAL_STATUSES = new Set(['Done', 'Cancelled']);

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'object' && value._id) return value._id.toString();
  return value.toString();
};

export function getEffectiveStatusForUser(workItem, userId) {
  if (!workItem) return 'To Do';

  const uid = normalizeId(userId);
  const assigneeIds = (workItem.assignedToMultiple || []).map(normalizeId).filter(Boolean);

  if (assigneeIds.length > 0 && uid) {
    const entry = (workItem.assigneeStatuses || []).find(
      (as) => normalizeId(as.assigneeId) === uid
    );
    if (entry?.status) return entry.status;
  }

  return workItem.status || 'To Do';
}

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getDaysUntilDue(dueDate, referenceDate = new Date()) {
  if (!dueDate) return null;

  const due = startOfLocalDay(new Date(dueDate));
  const today = startOfLocalDay(referenceDate);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isWorkItemDueToday(workItem, userId, referenceDate = new Date()) {
  const status = getEffectiveStatusForUser(workItem, userId);
  if (TERMINAL_STATUSES.has(status) || !workItem?.dueDate) return false;

  return getDaysUntilDue(workItem.dueDate, referenceDate) === 0;
}

export function isWorkItemOverdue(workItem, userId, referenceDate = new Date()) {
  const status = getEffectiveStatusForUser(workItem, userId);
  if (TERMINAL_STATUSES.has(status) || !workItem?.dueDate) return false;

  return getDaysUntilDue(workItem.dueDate, referenceDate) < 0;
}

/**
 * All assignee ids for a work item (multi list, or single assignedTo).
 * @param {object|null|undefined} workItem
 * @returns {string[]}
 */
export function getWorkItemAssigneeIds(workItem) {
  const multi = (workItem?.assignedToMultiple || []).map(normalizeId).filter(Boolean);
  if (multi.length > 0) return [...new Set(multi)];
  const primary = normalizeId(workItem?.assignedTo);
  return primary ? [primary] : [];
}

/**
 * Whether the user is an assignee (single or multi).
 *
 * @param {object|null|undefined} workItem
 * @param {string|object|null|undefined} userId
 * @returns {boolean}
 */
export function isWorkItemAssignedToUser(workItem, userId) {
  const uid = normalizeId(userId);
  if (!workItem || !uid) return false;
  return getWorkItemAssigneeIds(workItem).includes(uid);
}

/**
 * My Work page: work assigned to me, excluding items I created for others.
 *
 * @param {object|null|undefined} workItem
 * @param {string|object|null|undefined} userId
 * @returns {boolean}
 */
export function isWorkItemForMyWork(workItem, userId) {
  const uid = normalizeId(userId);
  if (!workItem || !uid) return false;

  const assigneeIds = getWorkItemAssigneeIds(workItem);
  if (!assigneeIds.includes(uid)) return false;

  const creatorId = normalizeId(workItem.createdBy);
  if (creatorId === uid && assigneeIds.some((id) => id !== uid)) {
    return false;
  }

  return true;
}

/**
 * Pending work the user is responsible for (assigned to them, not Done/Cancelled).
 * Excludes drafts and items they only created for someone else.
 *
 * @param {object|null|undefined} workItem
 * @param {string|object|null|undefined} userId
 * @returns {boolean}
 */
export function isPendingWorkItem(workItem, userId) {
  if (!workItem || workItem.isDeleted) return false;
  if (workItem.visibility === 'draft') return false;
  if (!isWorkItemForMyWork(workItem, userId)) return false;

  const status = getEffectiveStatusForUser(workItem, userId);
  return !TERMINAL_STATUSES.has(status);
}

export function getDueDateLabel(workItem, userId, referenceDate = new Date()) {
  if (!workItem?.dueDate) return null;

  const daysUntilDue = getDaysUntilDue(workItem.dueDate, referenceDate);
  const overdue = isWorkItemOverdue(workItem, userId, referenceDate);
  const dueToday = isWorkItemDueToday(workItem, userId, referenceDate);

  if (overdue) {
    const daysOverdue = Math.abs(daysUntilDue);
    return {
      tone: 'danger',
      text: `${daysOverdue}d overdue`,
      overdue: true,
      dueToday: false,
      daysUntilDue,
    };
  }

  if (dueToday) {
    return {
      tone: 'warning',
      text: 'Due today!',
      overdue: false,
      dueToday: true,
      daysUntilDue,
    };
  }

  if (daysUntilDue === 1) {
    return { tone: 'muted', text: 'Tomorrow', overdue: false, dueToday: false, daysUntilDue };
  }

  if (daysUntilDue > 1) {
    return {
      tone: 'muted',
      text: `${daysUntilDue}d left`,
      overdue: false,
      dueToday: false,
      daysUntilDue,
    };
  }

  return { tone: 'muted', text: 'Past due', overdue: false, dueToday: false, daysUntilDue };
}
