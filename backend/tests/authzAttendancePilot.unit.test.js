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

const VIEW_ROLES = ['admin', 'superadmin', 'hr', 'hod', 'manager'];
const MANAGE_ROLES = ['admin', 'superadmin', 'hr', 'manager'];

describe('Authorization V2 — Attendance pilot parity', () => {
  test.each(SELF_SERVICE_ROLES)('role %s has attendance self-service permissions', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'attendance.clock')).toBe(true);
    expect(hasPermission(user, 'attendance.record.view_self')).toBe(true);
  });

  test.each(VIEW_ROLES)('role %s can view attendance records', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'attendance.record.view')).toBe(true);
  });

  test.each(MANAGE_ROLES)('role %s can manage attendance records', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'attendance.record.manage')).toBe(true);
  });

  test('employee without HoD flag cannot view team attendance', () => {
    const user = { _id: 'emp1', role: 'employee' };
    expect(hasPermission(user, 'attendance.record.view')).toBe(false);
    expect(hasPermission(user, 'attendance.record.manage')).toBe(false);
  });

  test('employee with isHeadOfDepartment can view department attendance', () => {
    const user = {
      _id: 'hod-emp',
      role: 'employee',
      isHeadOfDepartment: true,
      headOfDepartment: 'dept1',
    };
    expect(hasPermission(user, 'attendance.record.view')).toBe(true);
    expect(hasPermission(user, 'attendance.record.manage')).toBe(false);
  });

  test.each(['accounts', 'client'])('role %s lacks attendance self-service by default', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'attendance.clock')).toBe(false);
    expect(hasPermission(user, 'attendance.record.view_self')).toBe(false);
  });
});
