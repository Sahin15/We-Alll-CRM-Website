/**
 * Mirrors frontend isPendingWorkItem / isWorkItemAssignedToUser rules used by
 * Employee Dashboard "Pending Tasks" so assigners are not counted for work
 * they only created for someone else.
 */

const TERMINAL_STATUSES = new Set(['Done', 'Cancelled']);

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'object' && value._id) return value._id.toString();
  return value.toString();
};

function isWorkItemAssignedToUser(workItem, userId) {
  const uid = normalizeId(userId);
  if (!workItem || !uid) return false;
  if (normalizeId(workItem.assignedTo) === uid) return true;
  const multiIds = (workItem.assignedToMultiple || []).map(normalizeId).filter(Boolean);
  return multiIds.includes(uid);
}

function getEffectiveStatusForUser(workItem, userId) {
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

function isPendingWorkItem(workItem, userId) {
  if (!workItem || workItem.isDeleted) return false;
  if (workItem.visibility === 'draft') return false;
  if (!isWorkItemAssignedToUser(workItem, userId)) return false;
  return !TERMINAL_STATUSES.has(getEffectiveStatusForUser(workItem, userId));
}

describe('Pending Tasks assignee filter', () => {
  const assignerId = 'assigner-1';
  const assigneeId = 'assignee-1';

  test('does not count work I created for someone else as my pending', () => {
    const item = {
      status: 'To Do',
      visibility: 'active',
      createdBy: assignerId,
      assignedTo: assigneeId,
    };
    expect(isPendingWorkItem(item, assignerId)).toBe(false);
    expect(isPendingWorkItem(item, assigneeId)).toBe(true);
  });

  test('counts work assigned to me even if I also created it', () => {
    const item = {
      status: 'To Do',
      visibility: 'active',
      createdBy: assigneeId,
      assignedTo: assigneeId,
    };
    expect(isPendingWorkItem(item, assigneeId)).toBe(true);
  });

  test('ignores drafts and deleted items', () => {
    expect(
      isPendingWorkItem(
        { status: 'To Do', visibility: 'draft', assignedTo: assigneeId },
        assigneeId
      )
    ).toBe(false);
    expect(
      isPendingWorkItem(
        { status: 'To Do', visibility: 'active', assignedTo: assigneeId, isDeleted: true },
        assigneeId
      )
    ).toBe(false);
  });

  test('uses per-assignee status for multi-assignee items', () => {
    const item = {
      status: 'In Progress',
      visibility: 'active',
      assignedToMultiple: [assigneeId, 'assignee-2'],
      assigneeStatuses: [
        { assigneeId, status: 'Done' },
        { assigneeId: 'assignee-2', status: 'To Do' },
      ],
    };
    expect(isPendingWorkItem(item, assigneeId)).toBe(false);
    expect(isPendingWorkItem(item, 'assignee-2')).toBe(true);
  });
});
