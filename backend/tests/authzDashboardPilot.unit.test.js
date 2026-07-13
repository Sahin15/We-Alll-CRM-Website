import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';
import { ALL_LEGACY_ROLES } from '../src/authz/legacyRoleMapping.js';

/**
 * Dashboard pilot parity: every legacy role can view dashboard.
 */
describe('Authorization V2 — Dashboard pilot parity', () => {
  test.each(ALL_LEGACY_ROLES)('role %s has dashboard.view', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'dashboard.view')).toBe(true);
  });

  test('hod with isHeadOfDepartment flag retains dashboard.view', () => {
    const user = {
      _id: 'hod1',
      role: 'employee',
      isHeadOfDepartment: true,
      headOfDepartment: 'dept1',
    };
    expect(hasPermission(user, 'dashboard.view')).toBe(true);
  });
});
