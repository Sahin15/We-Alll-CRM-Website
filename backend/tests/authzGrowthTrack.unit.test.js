import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';

const MANAGE_ROLES = ['admin', 'superadmin', 'hr', 'manager', 'hod'];
describe('Authorization V2 — Growth Track permissions', () => {
  test.each(MANAGE_ROLES)('role %s can view and manage growth tracks (legacy mapping)', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'growth_track.view')).toBe(true);
    expect(hasPermission(user, 'growth_track.manage')).toBe(true);
  });

  test('employee can view own track but not manage', () => {
    const user = { _id: 'user-employee', role: 'employee' };
    expect(hasPermission(user, 'growth_track.view')).toBe(true);
    expect(hasPermission(user, 'growth_track.manage')).toBe(false);
  });

  test.each(['accounts', 'client'])(
    'role %s has no growth track permissions by default',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'growth_track.view')).toBe(false);
      expect(hasPermission(user, 'growth_track.manage')).toBe(false);
    }
  );

  test('employee with isHeadOfDepartment receives department growth track manage grant', () => {
    const user = {
      _id: 'emp-hod',
      role: 'employee',
      isHeadOfDepartment: true,
      headOfDepartment: 'dept1',
    };
    expect(hasPermission(user, 'growth_track.view')).toBe(true);
    expect(hasPermission(user, 'growth_track.manage')).toBe(true);
  });
});
