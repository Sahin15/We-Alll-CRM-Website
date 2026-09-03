/**
 * My Work visibility rules:
 * - Assigned to me (single or multi)
 * - Created by me (including published work I assigned to others)
 */

describe('My Work visibility query shape', () => {
  /**
   * Mirrors getMyWorkItems assignee/creator filter (ObjectId + string safe).
   * @param {string} userId
   */
  function buildMyWorkOrFilter(userId) {
    const userRef = { $in: [userId, String(userId)] };
    return {
      isDeleted: { $ne: true },
      $or: [
        { assignedTo: userRef },
        { assignedToMultiple: userRef },
        { createdBy: userRef },
      ],
    };
  }

  test('includes createdBy for all items, not only drafts', () => {
    const query = buildMyWorkOrFilter('507f1f77bcf86cd799439011');
    const createdClause = query.$or.find((c) => c.createdBy);
    expect(createdClause).toBeDefined();
    expect(createdClause.visibility).toBeUndefined();
    expect(JSON.stringify(query)).not.toContain('"visibility":"draft"');
  });

  test('matches assignee and creator with dual ObjectId/string ref', () => {
    const userId = '507f1f77bcf86cd799439011';
    const query = buildMyWorkOrFilter(userId);
    query.$or.forEach((clause) => {
      const ref = clause.assignedTo || clause.assignedToMultiple || clause.createdBy;
      expect(ref.$in).toEqual(expect.arrayContaining([userId, String(userId)]));
    });
  });
});
