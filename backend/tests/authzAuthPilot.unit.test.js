import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';

/**
 * Auth admin pilot parity: role and permission management.
 */
describe('Authorization V2 — Auth admin pilot parity', () => {
  test.each(['admin', 'superadmin'])(
    'role %s can manage roles and assign permissions',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'auth.role.manage')).toBe(true);
      expect(hasPermission(user, 'auth.permission.assign')).toBe(true);
    }
  );

  test.each(['hr', 'manager', 'employee', 'accounts', 'hod'])(
    'role %s lacks auth admin permissions by default',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'auth.role.manage')).toBe(false);
      expect(hasPermission(user, 'auth.permission.assign')).toBe(false);
    }
  );
});
