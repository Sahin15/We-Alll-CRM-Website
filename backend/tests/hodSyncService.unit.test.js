import { jest } from '@jest/globals';
import { computeHoDSyncPlan } from '../src/services/hodSyncService.js';

describe('HoD sync service', () => {
  test('promotes department head user flags when department.head is set', () => {
    const plan = computeHoDSyncPlan(
      [{ _id: 'dept1', head: 'user1' }],
      [
        {
          _id: 'user1',
          role: 'employee',
          isHeadOfDepartment: false,
          headOfDepartment: null,
        },
      ]
    );

    expect(plan.userUpdates).toEqual([
      {
        userId: 'user1',
        isHeadOfDepartment: true,
        headOfDepartment: 'dept1',
        role: 'hod',
      },
    ]);
    expect(plan.departmentUpdates).toEqual([]);
  });

  test('clears stale HoD flags when user is not a department head', () => {
    const plan = computeHoDSyncPlan(
      [{ _id: 'dept1', head: 'user2' }],
      [
        {
          _id: 'user1',
          role: 'hod',
          isHeadOfDepartment: true,
          headOfDepartment: 'dept1',
        },
        {
          _id: 'user2',
          role: 'employee',
          isHeadOfDepartment: false,
          headOfDepartment: null,
        },
      ]
    );

    expect(plan.userUpdates).toContainEqual({
      userId: 'user1',
      isHeadOfDepartment: false,
      headOfDepartment: null,
      role: 'employee',
    });
    expect(plan.userUpdates).toContainEqual({
      userId: 'user2',
      isHeadOfDepartment: true,
      headOfDepartment: 'dept1',
      role: 'hod',
    });
  });

  test('clears department.head when referenced user is inactive', () => {
    const plan = computeHoDSyncPlan(
      [{ _id: 'dept1', head: 'user1' }],
      [
        {
          _id: 'user1',
          role: 'hod',
          isHeadOfDepartment: true,
          headOfDepartment: 'dept1',
          status: 'terminated',
        },
      ]
    );

    expect(plan.departmentUpdates).toEqual([{ departmentId: 'dept1', head: null }]);
    expect(plan.userUpdates).toEqual([
      {
        userId: 'user1',
        isHeadOfDepartment: false,
        headOfDepartment: null,
        role: 'employee',
      },
    ]);
    expect(plan.issues.some((i) => i.code === 'invalid_department_head')).toBe(true);
  });

  test('records multi-department head as informational issue', () => {
    const plan = computeHoDSyncPlan(
      [
        { _id: 'dept1', head: 'user1' },
        { _id: 'dept2', head: 'user1' },
      ],
      [
        {
          _id: 'user1',
          role: 'hod',
          isHeadOfDepartment: true,
          headOfDepartment: 'dept1',
        },
      ]
    );

    expect(plan.userUpdates).toEqual([]);
    expect(plan.issues.some((i) => i.code === 'multi_department_head')).toBe(true);
  });
});
