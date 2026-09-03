import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';

/**
 * Resources pilot parity: assets and software licenses.
 */
describe('Authorization V2 — Resources pilot parity', () => {
  test.each(['employee', 'hod'])(
    'role %s can view assigned assets and licenses',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'assets.asset.view')).toBe(true);
      expect(hasPermission(user, 'licenses.license.view')).toBe(true);
      expect(hasPermission(user, 'assets.asset.manage')).toBe(false);
      expect(hasPermission(user, 'licenses.license.manage')).toBe(false);
    }
  );

  test.each(['admin', 'superadmin', 'hr', 'manager'])(
    'role %s can view and manage resources',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'assets.asset.view')).toBe(true);
      expect(hasPermission(user, 'assets.asset.manage')).toBe(true);
      expect(hasPermission(user, 'licenses.license.view')).toBe(true);
      expect(hasPermission(user, 'licenses.license.manage')).toBe(true);
    }
  );

  test('accounts lacks resource management permissions by default', () => {
    const user = { _id: 'acc1', role: 'accounts' };
    expect(hasPermission(user, 'assets.asset.view')).toBe(false);
    expect(hasPermission(user, 'assets.asset.manage')).toBe(false);
    expect(hasPermission(user, 'licenses.license.manage')).toBe(false);
  });
});
