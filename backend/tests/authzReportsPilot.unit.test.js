import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';

/**
 * Reports pilot parity: HR analytics and workflow reporting.
 */
describe('Authorization V2 — Reports pilot parity', () => {
  test.each(['admin', 'superadmin', 'hr', 'manager', 'accounts'])(
    'role %s can view reports and analytics',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'reports.analytics.view')).toBe(true);
    }
  );

  test('hod can view department-scoped analytics', () => {
    const user = { _id: 'hod1', role: 'hod' };
    expect(hasPermission(user, 'reports.analytics.view')).toBe(true);
  });

  test('employee lacks reports analytics access by default', () => {
    const user = { _id: 'emp1', role: 'employee' };
    expect(hasPermission(user, 'reports.analytics.view')).toBe(false);
  });
});
