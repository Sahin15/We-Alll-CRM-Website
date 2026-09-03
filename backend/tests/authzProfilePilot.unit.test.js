import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';
import { ALL_LEGACY_ROLES } from '../src/authz/legacyRoleMapping.js';

/**
 * Profile pilot parity: every legacy role can view/update own profile.
 */
describe('Authorization V2 — Profile pilot parity', () => {
  const profilePermissions = ['profile.view', 'profile.update'];

  test.each(ALL_LEGACY_ROLES)('role %s has profile.view and profile.update', (role) => {
    const user = { _id: `user-${role}`, role };
    for (const permission of profilePermissions) {
      expect(hasPermission(user, permission)).toBe(true);
    }
  });

  test('hod with isHeadOfDepartment flag retains profile permissions', () => {
    const user = {
      _id: 'hod1',
      role: 'employee',
      isHeadOfDepartment: true,
      headOfDepartment: 'dept1',
    };
    expect(hasPermission(user, 'profile.view')).toBe(true);
    expect(hasPermission(user, 'profile.update')).toBe(true);
  });
});
