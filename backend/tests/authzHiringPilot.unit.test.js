import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';

const HR_PIPELINE_ROLES = ['admin', 'superadmin', 'hr', 'manager'];

/**
 * Hiring pilot parity: HR pipeline vs HoD request permissions.
 */
describe('Authorization V2 — Hiring pilot parity', () => {
  test.each(HR_PIPELINE_ROLES)('role %s can manage hiring pipeline', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'hiring.pipeline.manage')).toBe(true);
    expect(hasPermission(user, 'hiring.request.view')).toBe(true);
  });

  test('hod can create and view department hiring requests', () => {
    const user = { _id: 'hod1', role: 'hod' };
    expect(hasPermission(user, 'hiring.request.create')).toBe(true);
    expect(hasPermission(user, 'hiring.request.view')).toBe(true);
    expect(hasPermission(user, 'hiring.pipeline.manage')).toBe(false);
  });

  test('employee with isHeadOfDepartment receives HoD hiring request grants', () => {
    const user = {
      _id: 'emp-hod',
      role: 'employee',
      isHeadOfDepartment: true,
      headOfDepartment: 'dept1',
    };
    expect(hasPermission(user, 'hiring.request.create')).toBe(true);
    expect(hasPermission(user, 'hiring.request.view')).toBe(true);
    expect(hasPermission(user, 'hiring.pipeline.manage')).toBe(false);
  });

  test.each(['employee', 'sales', 'accounts', 'client'])(
    'role %s lacks hiring permissions by default',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'hiring.request.create')).toBe(false);
      expect(hasPermission(user, 'hiring.request.view')).toBe(false);
      expect(hasPermission(user, 'hiring.pipeline.manage')).toBe(false);
    }
  );

  test('superadmin has full hiring access via platform bypass', () => {
    const user = { _id: 'sa1', role: 'superadmin' };
    expect(hasPermission(user, 'hiring.pipeline.manage')).toBe(true);
    expect(hasPermission(user, 'hiring.request.view')).toBe(true);
    expect(hasPermission(user, 'hiring.request.create')).toBe(true);
  });
});
