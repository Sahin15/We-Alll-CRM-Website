import {
  getPersonalProjectMembershipFilter,
  isUserPersonallyAssignedToProject,
} from '../src/services/projectAccessService.js';

describe('projectAccessService', () => {
  const userId = '507f1f77bcf86cd799439011';

  test('membership filter excludes department and createdBy', () => {
    const filter = getPersonalProjectMembershipFilter(userId);
    const serialized = JSON.stringify(filter);
    expect(serialized).not.toContain('department');
    expect(serialized).not.toContain('createdBy');
    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { assignedUsers: expect.anything() },
        { projectHead: expect.anything() },
        {
          teamMembers: {
            $elemMatch: {
              user: expect.anything(),
              isActive: { $ne: false },
            },
          },
        },
      ])
    );
  });

  test('isUserPersonallyAssignedToProject accepts project head and team members', () => {
    expect(
      isUserPersonallyAssignedToProject(userId, {
        projectHead: userId,
        assignedUsers: [],
        teamMembers: [],
      })
    ).toBe(true);

    expect(
      isUserPersonallyAssignedToProject(userId, {
        projectHead: 'other-user',
        assignedUsers: [userId],
        teamMembers: [],
      })
    ).toBe(true);

    expect(
      isUserPersonallyAssignedToProject(userId, {
        department: userId,
        assignedUsers: [],
        teamMembers: [{ user: userId, isActive: true }],
      })
    ).toBe(true);

    expect(
      isUserPersonallyAssignedToProject(userId, {
        department: 'dept-only',
        assignedUsers: [],
        teamMembers: [],
      })
    ).toBe(false);
  });
});
