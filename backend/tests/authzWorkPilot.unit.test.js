import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';

const WORK_ITEM_ADMIN_ROLES = ['admin', 'superadmin', 'hr', 'manager'];
const WORK_ITEM_SELF_SERVICE_ROLES = ['employee', 'hod', 'sales', 'manager', 'hr', 'admin', 'superadmin'];

/**
 * Work items pilot parity: self-service create/view/update vs admin and HoD approve gates.
 */
describe('Authorization V2 — Work items pilot parity', () => {
  test.each(WORK_ITEM_SELF_SERVICE_ROLES)(
    'role %s has work item self-service permissions',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'work.item.view')).toBe(true);
      expect(hasPermission(user, 'work.item.create')).toBe(true);
      expect(hasPermission(user, 'work.item.update')).toBe(true);
    }
  );

  test.each(['admin', 'superadmin', 'hr'])('role %s can approve work items at company scope', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'work.item.approve')).toBe(true);
  });

  test('hod can approve work items via department head grants', () => {
    const user = { _id: 'hod1', role: 'hod' };
    expect(hasPermission(user, 'work.item.approve')).toBe(true);
  });

  test('employee cannot approve work items without HoD flag', () => {
    const user = { _id: 'emp1', role: 'employee' };
    expect(hasPermission(user, 'work.item.approve')).toBe(false);
  });

  test('employee with isHeadOfDepartment can approve work items', () => {
    const user = {
      _id: 'emp-hod',
      role: 'employee',
      isHeadOfDepartment: true,
      headOfDepartment: 'dept1',
    };
    expect(hasPermission(user, 'work.item.approve')).toBe(true);
  });

  test.each(['accounts', 'client'])('role %s lacks work item permissions', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'work.item.view')).toBe(false);
    expect(hasPermission(user, 'work.item.create')).toBe(false);
  });

  test('superadmin has full work item access via platform bypass', () => {
    const user = { _id: 'sa1', role: 'superadmin' };
    expect(hasPermission(user, 'work.item.view')).toBe(true);
    expect(hasPermission(user, 'work.item.approve')).toBe(true);
    expect(hasPermission(user, 'work.dashboard.view')).toBe(true);
  });

  test.each(['admin', 'superadmin', 'hr', 'manager'])(
    'role %s can view Work Management Dashboard',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'work.dashboard.view')).toBe(true);
    }
  );

  test('hod lacks Work Management Dashboard by default', () => {
    const user = { _id: 'hod1', role: 'hod' };
    expect(hasPermission(user, 'work.dashboard.view')).toBe(false);
    expect(hasPermission(user, 'reports.analytics.view')).toBe(true);
  });
});
