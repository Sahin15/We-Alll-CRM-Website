import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';
import { makeAuthzTestUser } from './helpers/authzTestFixtures.js';

const WORK_ITEM_ADMIN_ROLES = ['admin', 'superadmin', 'hr', 'manager'];
const WORK_ITEM_SELF_SERVICE_ROLES = ['employee', 'hod', 'sales', 'manager', 'hr', 'admin', 'superadmin'];

/**
 * Work items pilot parity: self-service create/view/update vs admin and HoD approve gates.
 */
describe('Authorization V2 — Work items pilot parity', () => {
  test.each(WORK_ITEM_SELF_SERVICE_ROLES)(
    'role %s has work item self-service permissions',
    (role) => {
      const user = makeAuthzTestUser(role);
      expect(hasPermission(user, 'work.item.view')).toBe(true);
      expect(hasPermission(user, 'work.item.create')).toBe(true);
      expect(hasPermission(user, 'work.item.update')).toBe(true);
    }
  );

  test.each(['admin', 'superadmin', 'hr'])('role %s can approve work items at company scope', (role) => {
    const user = makeAuthzTestUser(role);
    expect(hasPermission(user, 'work.item.approve')).toBe(true);
  });

  test('hod can approve work items via department head grants', () => {
    const user = makeAuthzTestUser('hod');
    expect(hasPermission(user, 'work.item.approve')).toBe(true);
  });

  test('employee cannot approve work items without HoD flag', () => {
    const user = makeAuthzTestUser('employee');
    expect(hasPermission(user, 'work.item.approve')).toBe(false);
  });

  test('employee with isHeadOfDepartment can approve work items', () => {
    const user = makeAuthzTestUser('employee', {
      isHeadOfDepartment: true,
      headOfDepartment: makeAuthzTestUser('dept')._id,
    });
    expect(hasPermission(user, 'work.item.approve')).toBe(true);
  });

  test.each(['accounts', 'client'])('role %s lacks work item permissions', (role) => {
    const user = makeAuthzTestUser(role);
    expect(hasPermission(user, 'work.item.view')).toBe(false);
    expect(hasPermission(user, 'work.item.create')).toBe(false);
  });

  test('superadmin has full work item access via platform bypass', () => {
    const user = makeAuthzTestUser('superadmin');
    expect(hasPermission(user, 'work.item.view')).toBe(true);
    expect(hasPermission(user, 'work.item.approve')).toBe(true);
    expect(hasPermission(user, 'work.dashboard.view')).toBe(true);
  });

  test.each(['admin', 'superadmin', 'hr', 'manager'])(
    'role %s can view Work Management Dashboard',
    (role) => {
      const user = makeAuthzTestUser(role);
      expect(hasPermission(user, 'work.dashboard.view')).toBe(true);
    }
  );

  test('hod lacks Work Management Dashboard by default', () => {
    const user = makeAuthzTestUser('hod');
    expect(hasPermission(user, 'work.dashboard.view')).toBe(false);
    expect(hasPermission(user, 'reports.analytics.view')).toBe(true);
  });
});
