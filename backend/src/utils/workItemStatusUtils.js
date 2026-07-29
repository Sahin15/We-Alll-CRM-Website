const TERMINAL_STATUSES = new Set(["Done", "Cancelled"]);
const ACTIVE_STATUSES = new Set(["To Do", "In Progress", "Review"]);

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === "object" && value._id) return value._id.toString();
  return value.toString();
};

export function getEffectiveStatusForUser(workItem, userId) {
  if (!workItem) return "To Do";

  const uid = normalizeId(userId);
  const assigneeIds = (workItem.assignedToMultiple || []).map(normalizeId).filter(Boolean);

  if (assigneeIds.length > 0 && uid) {
    const entry = (workItem.assigneeStatuses || []).find(
      (as) => normalizeId(as.assigneeId) === uid
    );
    if (entry?.status) return entry.status;
  }

  return workItem.status || "To Do";
}

export function isActiveWorkStatus(status) {
  return ACTIVE_STATUSES.has(status);
}

export function syncGlobalStatusFromAssignees(workItem) {
  const assigneeIds = (workItem.assignedToMultiple || []).map(normalizeId).filter(Boolean);
  if (assigneeIds.length === 0) return;

  const statuses = assigneeIds.map((id) => {
    const entry = (workItem.assigneeStatuses || []).find(
      (as) => normalizeId(as.assigneeId) === id
    );
    return entry?.status || workItem.status || "To Do";
  });

  if (statuses.every((status) => status === "Done")) {
    workItem.status = "Done";
    return;
  }

  if (statuses.every((status) => status === "Cancelled")) {
    workItem.status = "Cancelled";
    return;
  }

  if (statuses.some((status) => status === "Review")) {
    workItem.status = "Review";
    return;
  }

  if (statuses.some((status) => status === "In Progress")) {
    workItem.status = "In Progress";
  }
}

export function computeDueDateFlags(workItem, userId, referenceDate = new Date()) {
  const status = getEffectiveStatusForUser(workItem, userId);
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const due = workItem?.dueDate ? new Date(workItem.dueDate) : null;
  if (due) due.setHours(0, 0, 0, 0);

  const isTerminal = TERMINAL_STATUSES.has(status);
  const isOverdue = !isTerminal && Boolean(due && due < today);
  const isDueToday = !isTerminal && Boolean(due && due.getTime() === today.getTime());

  let daysUntilDue = null;
  if (due) {
    daysUntilDue = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    effectiveStatus: status,
    isOverdue,
    isDueToday,
    daysUntilDue,
  };
}

export function isPendingForUser(workItem, userId) {
  return isActiveWorkStatus(getEffectiveStatusForUser(workItem, userId));
}
