import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';
import { ALL_LEGACY_ROLES } from '../src/authz/legacyRoleMapping.js';

/**
 * Support pilot parity: view for all roles; manage for admin/superadmin only.
 */
describe('Authorization V2 — Support pilot parity', () => {
  test.each(ALL_LEGACY_ROLES)('role %s has support.view', (role) => {
    const user = { _id: `user-${role}`, role };
    expect(hasPermission(user, 'support.view')).toBe(true);
  });

  test.each(ALL_LEGACY_ROLES)('role %s support.manage matches legacy admin gate', (role) => {
    const user = { _id: `user-${role}`, role };
    const expected = role === 'admin' || role === 'superadmin';
    expect(hasPermission(user, 'support.manage')).toBe(expected);
  });

  test('employee cannot manage support contacts', () => {
    const user = { _id: 'emp1', role: 'employee' };
    expect(hasPermission(user, 'support.manage')).toBe(false);
    expect(hasPermission(user, 'support.view')).toBe(true);
  });

  test('employee with direct support.manage grant can manage support contacts', () => {
    const user = {
      _id: 'emp1',
      role: 'employee',
      directPermissionGrants: [
        { permission: 'support.manage', scope: 'COMPANY', effect: 'grant' },
      ],
    };
    expect(hasPermission(user, 'support.manage')).toBe(true);
  });
});
