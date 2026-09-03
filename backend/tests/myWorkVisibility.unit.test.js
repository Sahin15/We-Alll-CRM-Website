import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const controllerPath = path.join(__dirname, '../src/controllers/workItemController.js');

/**
 * My Work visibility rules:
 * - Assigned to me (single or multi) only
 * - Work I created for others belongs on Assigned Work, not My Work
 */

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'object' && value._id) return value._id.toString();
  return value.toString();
};

function getWorkItemAssigneeIds(workItem) {
  const multi = (workItem?.assignedToMultiple || []).map(normalizeId).filter(Boolean);
  if (multi.length > 0) return [...new Set(multi)];
  const primary = normalizeId(workItem?.assignedTo);
  return primary ? [primary] : [];
}

function isWorkItemAssignedToUser(workItem, userId) {
  const uid = normalizeId(userId);
  if (!workItem || !uid) return false;
  return getWorkItemAssigneeIds(workItem).includes(uid);
}

function isWorkItemForMyWork(workItem, userId) {
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

describe('My Work visibility query shape', () => {
  /**
   * Mirrors getMyWorkItems assignee filter (ObjectId + string safe).
   * @param {string} userId
   */
  function buildMyWorkOrFilter(userId) {
    const userRef = { $in: [userId, String(userId)] };
    return {
      isDeleted: { $ne: true },
      $or: [
        { assignedTo: userRef },
        { assignedToMultiple: userRef },
      ],
    };
  }

  test('does not include createdBy (assigned-to-others stays on Assigned Work)', () => {
    const query = buildMyWorkOrFilter('507f1f77bcf86cd799439011');
    expect(query.$or.find((c) => c.createdBy)).toBeUndefined();
    expect(JSON.stringify(query)).not.toContain('createdBy');
  });

  test('matches assignee with dual ObjectId/string ref', () => {
    const userId = '507f1f77bcf86cd799439011';
    const query = buildMyWorkOrFilter(userId);
    expect(query.$or).toHaveLength(2);
    query.$or.forEach((clause) => {
      const ref = clause.assignedTo || clause.assignedToMultiple;
      expect(ref.$in).toEqual(expect.arrayContaining([userId, String(userId)]));
    });
  });
});

describe('My Work assignee scope', () => {
  const assignerId = 'assigner-1';
  const assigneeId = 'assignee-1';
  const otherId = 'assignee-2';

  test('includes work assigned to me by someone else', () => {
    const item = {
      createdBy: assignerId,
      assignedTo: assigneeId,
    };
    expect(isWorkItemForMyWork(item, assigneeId)).toBe(true);
    expect(isWorkItemForMyWork(item, assignerId)).toBe(false);
  });

  test('excludes work I created and assigned to another employee', () => {
    const item = {
      createdBy: assignerId,
      assignedTo: assigneeId,
    };
    expect(isWorkItemForMyWork(item, assignerId)).toBe(false);
    expect(isWorkItemAssignedToUser(item, assigneeId)).toBe(true);
  });

  test('includes work I assigned only to myself', () => {
    const item = {
      createdBy: assignerId,
      assignedTo: assignerId,
    };
    expect(isWorkItemForMyWork(item, assignerId)).toBe(true);
  });

  test('excludes creator who is also listed with other assignees', () => {
    const item = {
      createdBy: assignerId,
      assignedTo: assigneeId,
      assignedToMultiple: [assigneeId, assignerId],
    };
    expect(getWorkItemAssigneeIds(item)).toEqual(
      expect.arrayContaining([assigneeId, assignerId])
    );
    expect(isWorkItemForMyWork(item, assignerId)).toBe(false);
    expect(isWorkItemForMyWork(item, assigneeId)).toBe(true);
  });

  test('includes multi-assignee work for non-creator assignees', () => {
    const item = {
      createdBy: assignerId,
      assignedTo: assigneeId,
      assignedToMultiple: [assigneeId, otherId],
    };
    expect(isWorkItemForMyWork(item, assigneeId)).toBe(true);
    expect(isWorkItemForMyWork(item, otherId)).toBe(true);
  });
});

describe('My Work query regression', () => {
  /**
   * getMyWorkItems must not cap rows before the frontend applies Today/All filters.
   * limit(500) + sort({ dueDate: 1 }) dropped the newest assignee work when a user
   * had more than 500 items (e.g. Rakesh Das: 594 assigned, 90+ overdue hidden).
   */
  test('getMyWorkItems does not apply limit(500)', () => {
    const source = fs.readFileSync(controllerPath, 'utf8');
    const myWorkBlock = source.slice(
      source.indexOf('const getMyWorkItems'),
      source.indexOf('const getAllWorkItems')
    );
    expect(myWorkBlock).not.toMatch(/\.limit\s*\(\s*500\s*\)/);
  });
});

describe('Assigned Work creator filter', () => {
  /**
   * Mirrors isAssignedWorkForCreator in workItemController.
   * @param {object} item
   * @param {string} userIdStr
   */
  function isAssignedWorkForCreator(item, userIdStr) {
    const multi = (item.assignedToMultiple || [])
      .map((a) => (a && (a._id || a)).toString())
      .filter(Boolean);
    if (multi.length > 0) {
      return multi.some((id) => id !== userIdStr);
    }
    const assignee = item.assignedTo && (item.assignedTo._id || item.assignedTo);
    if (!assignee) return true;
    return assignee.toString() !== userIdStr;
  }

  const me = 'user-me';
  const other = 'user-other';

  test('includes work I assigned to someone else', () => {
    expect(isAssignedWorkForCreator({ assignedTo: other }, me)).toBe(true);
  });

  test('excludes work assigned only to me', () => {
    expect(isAssignedWorkForCreator({ assignedTo: me }, me)).toBe(false);
  });

  test('includes multi-assignee when another person is included', () => {
    expect(
      isAssignedWorkForCreator({ assignedToMultiple: [me, other] }, me)
    ).toBe(true);
  });

  test('excludes multi-assignee when only I am listed', () => {
    expect(isAssignedWorkForCreator({ assignedToMultiple: [me] }, me)).toBe(false);
  });

  test('includes unassigned items I created', () => {
    expect(isAssignedWorkForCreator({ assignedTo: null }, me)).toBe(true);
  });
});
