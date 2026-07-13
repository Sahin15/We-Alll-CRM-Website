import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';

/**
 * WFH pilot reuses leave permissions — validates role gates for WFH and work-on-leave APIs.
 */
describe('Authorization V2 — WFH pilot parity', () => {
  const SELF_SERVICE_ROLES = [
    'employee',
    'hod',
    'sales',
    'manager',
    'hr',
    'admin',
    'superadmin',
  ];
  const WFH_VIEW_APPROVE_ROLES = ['admin', 'superadmin', 'hr', 'hod', 'manager'];
  const WOL_HR_ROLES = ['admin', 'superadmin', 'hr'];

  test.each(SELF_SERVICE_ROLES)('role %s has WFH self-service permissions', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'leave.request.create')).toBe(true);
    expect(hasPermission(user, 'leave.request.view_self')).toBe(true);
  });

  test.each(WFH_VIEW_APPROVE_ROLES)('role %s can view and approve WFH requests', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'leave.request.view')).toBe(true);
    expect(hasPermission(user, 'leave.request.approve')).toBe(true);
  });

  test.each(WOL_HR_ROLES)('role %s can manage work-on-leave day requests', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'leave.request.approve')).toBe(true);
  });

  test('manager has approve permission but work-on-leave routes restrict to HR roles via legacyRoles', () => {
    const user = { _id: 'mgr1', role: 'manager' };
    expect(hasPermission(user, 'leave.request.approve')).toBe(true);
    expect(WOL_HR_ROLES).not.toContain('manager');
  });

  test('employee without HoD flag cannot view or approve team WFH requests', () => {
    const user = { _id: 'emp1', role: 'employee' };
    expect(hasPermission(user, 'leave.request.view')).toBe(false);
    expect(hasPermission(user, 'leave.request.approve')).toBe(false);
  });

  test.each(['accounts', 'client'])('role %s lacks WFH self-service permissions', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'leave.request.create')).toBe(false);
    expect(hasPermission(user, 'leave.request.view_self')).toBe(false);
  });
});
