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

const REVIEW_ROLES = ['admin', 'superadmin', 'hr', 'manager', 'hod'];

/**
 * Work log pilot parity: self-service for staff roles; review for admin gate + HoD.
 */
describe('Authorization V2 — Work log pilot parity', () => {
  test.each(SELF_SERVICE_ROLES)('role %s has worklog self-service permissions', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'worklog.entry.create')).toBe(true);
    expect(hasPermission(user, 'worklog.entry.view_self')).toBe(true);
  });

  test.each(REVIEW_ROLES)('role %s can review work logs', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'worklog.entry.review')).toBe(true);
  });

  test('employee without HoD flag cannot review work logs', () => {
    const user = { _id: 'emp1', role: 'employee' };
    expect(hasPermission(user, 'worklog.entry.review')).toBe(false);
  });

  test('employee with isHeadOfDepartment can review work logs', () => {
    const user = {
      _id: 'hod-emp',
      role: 'employee',
      isHeadOfDepartment: true,
      headOfDepartment: 'dept1',
    };
    expect(hasPermission(user, 'worklog.entry.review')).toBe(true);
  });

  test.each(['accounts', 'client'])('role %s lacks worklog self-service by default', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'worklog.entry.create')).toBe(false);
    expect(hasPermission(user, 'worklog.entry.view_self')).toBe(false);
  });

  test('employee with direct worklog.entry.review grant can review work logs', () => {
    const user = {
      _id: 'emp1',
      role: 'employee',
      directPermissionGrants: [
        { permission: 'worklog.entry.review', scope: 'COMPANY', effect: 'grant' },
      ],
    };
    expect(hasPermission(user, 'worklog.entry.review')).toBe(true);
  });
});
