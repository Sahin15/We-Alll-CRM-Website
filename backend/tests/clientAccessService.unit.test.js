import {
  buildUserProjectMembershipFilter,
  mergeUniqueClientIds,
  resolveAssignedClientsTargetUserId,
} from '../src/services/clientAccessService.js';

describe('clientAccessService', () => {
  test('project membership filter excludes createdBy and uses active teamMembers elemMatch', () => {
    const userId = '507f1f77bcf86cd799439011';
    const filter = buildUserProjectMembershipFilter(userId);

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
    expect(JSON.stringify(filter)).not.toContain('createdBy');
    expect(JSON.stringify(filter)).not.toContain('WorkItem');
  });

  test('mergeUniqueClientIds deduplicates client ids', () => {
    expect(mergeUniqueClientIds(['a', 'b'], ['b', 'c'], [])).toEqual(['a', 'b', 'c']);
  });

  test('resolveAssignedClientsTargetUserId allows self lookup', () => {
    const result = resolveAssignedClientsTargetUserId(
      { _id: 'user1', role: 'hod' },
      undefined
    );
    expect(result).toEqual({ allowed: true, targetUserId: 'user1' });
  });

  test('resolveAssignedClientsTargetUserId allows HR to view another employee', () => {
    const result = resolveAssignedClientsTargetUserId(
      { _id: 'hr1', role: 'hr' },
      'emp1'
    );
    expect(result).toEqual({ allowed: true, targetUserId: 'emp1' });
  });

  test('resolveAssignedClientsTargetUserId blocks staff from viewing others', () => {
    const result = resolveAssignedClientsTargetUserId(
      { _id: 'hod1', role: 'hod' },
      'emp2'
    );
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });
});
