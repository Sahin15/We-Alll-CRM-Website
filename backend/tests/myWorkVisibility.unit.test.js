/**
 * My Work visibility rules:
 * - Assigned to me (single or multi) only
 * - Work I created for others belongs on Assigned Work, not My Work
 */

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
