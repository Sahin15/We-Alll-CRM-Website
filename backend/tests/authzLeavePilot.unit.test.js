import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';
import { ALL_LEGACY_ROLES } from '../src/authz/legacyRoleMapping.js';

const SELF_SERVICE_ROLES = [
  'employee',
  'hod',
  'sales',
  'manager',
  'hr',
  'admin',
  'superadmin',
];

const VIEW_APPROVE_ROLES = ['admin', 'superadmin', 'hr', 'hod', 'manager'];

describe('Authorization V2 — Leave pilot parity', () => {
  test.each(SELF_SERVICE_ROLES)('role %s has leave self-service permissions', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'leave.request.create')).toBe(true);
    expect(hasPermission(user, 'leave.request.view_self')).toBe(true);
  });

  test.each(VIEW_APPROVE_ROLES)('role %s can view and approve leave requests', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'leave.request.view')).toBe(true);
    expect(hasPermission(user, 'leave.request.approve')).toBe(true);
  });

  test('employee without HoD flag cannot view or approve team leaves', () => {
    const user = { _id: 'emp1', role: 'employee' };
    expect(hasPermission(user, 'leave.request.view')).toBe(false);
    expect(hasPermission(user, 'leave.request.approve')).toBe(false);
  });

  test('employee with isHeadOfDepartment can view and approve department leaves', () => {
    const user = {
      _id: 'hod-emp',
      role: 'employee',
      isHeadOfDepartment: true,
      headOfDepartment: 'dept1',
    };
    expect(hasPermission(user, 'leave.request.view')).toBe(true);
    expect(hasPermission(user, 'leave.request.approve')).toBe(true);
  });

  test.each(['accounts', 'client'])('role %s lacks leave self-service by default', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'leave.request.create')).toBe(false);
    expect(hasPermission(user, 'leave.request.view_self')).toBe(false);
  });
});
