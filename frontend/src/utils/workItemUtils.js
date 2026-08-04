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
 * Whether the user is an assignee (single or multi). Creators who only assigned
 * work to others are not assignees — /my-work still returns those items.
 *
 * @param {object|null|undefined} workItem
 * @param {string|object|null|undefined} userId
 * @returns {boolean}
 */
export function isWorkItemAssignedToUser(workItem, userId) {
  const uid = normalizeId(userId);
  if (!workItem || !uid) return false;

  if (normalizeId(workItem.assignedTo) === uid) return true;

  const multiIds = (workItem.assignedToMultiple || []).map(normalizeId).filter(Boolean);
  return multiIds.includes(uid);
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
  if (!isWorkItemAssignedToUser(workItem, userId)) return false;

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
