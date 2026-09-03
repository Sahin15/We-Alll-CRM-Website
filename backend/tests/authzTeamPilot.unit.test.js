import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';

const USER_MANAGE_ROLES = ['admin', 'superadmin', 'hr', 'manager'];
const DEPT_MANAGE_ROLES = ['admin', 'superadmin'];

/**
 * Team pilot parity: user/department view and manage gates match legacy role middleware.
 */
describe('Authorization V2 — Team pilot parity', () => {
  test.each(USER_MANAGE_ROLES)('role %s can view users for HR/employee workflows', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'team.user.view')).toBe(true);
    expect(hasPermission(user, 'team.user.create')).toBe(true);
  });

  test('only superadmin inherits Users admin (/users) update permission by default', () => {
    expect(hasPermission({ _id: 'sa1', role: 'superadmin' }, 'team.user.update')).toBe(true);
    expect(hasPermission({ _id: 'admin1', role: 'admin' }, 'team.user.update')).toBe(false);
    expect(hasPermission({ _id: 'hr1', role: 'hr' }, 'team.user.update')).toBe(false);
    expect(hasPermission({ _id: 'mgr1', role: 'manager' }, 'team.user.update')).toBe(false);
  });

  test.each(DEPT_MANAGE_ROLES)('role %s can manage departments', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'team.department.view')).toBe(true);
    expect(hasPermission(user, 'team.department.manage')).toBe(true);
  });

  test('manager can view departments but not manage them', () => {
    const user = { _id: 'mgr1', role: 'manager' };
    expect(hasPermission(user, 'team.department.view')).toBe(true);
    expect(hasPermission(user, 'team.department.manage')).toBe(false);
  });

  test('hr can view departments but not manage departments', () => {
    const user = { _id: 'hr1', role: 'hr' };
    expect(hasPermission(user, 'team.department.view')).toBe(true);
    expect(hasPermission(user, 'team.department.manage')).toBe(false);
    expect(hasPermission(user, 'team.user.update')).toBe(false);
  });

  test.each(['employee', 'hod', 'sales'])(
    'role %s does not inherit Team → Departments tab by default',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'team.department.view')).toBe(false);
    }
  );

  test.each(['employee', 'hod', 'sales'])('role %s lacks user management permissions', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'team.user.view')).toBe(false);
    expect(hasPermission(user, 'team.user.create')).toBe(false);
  });

  test.each(['accounts', 'client'])('role %s lacks team permissions', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'team.user.view')).toBe(false);
    expect(hasPermission(user, 'team.department.view')).toBe(false);
  });

  test('superadmin bypasses explicit grants via platform role', () => {
    const user = { _id: 'sa1', role: 'superadmin' };
    expect(hasPermission(user, 'team.user.view')).toBe(true);
    expect(hasPermission(user, 'team.department.manage')).toBe(true);
  });
});
