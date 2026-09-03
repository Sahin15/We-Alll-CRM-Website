import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';

/**
 * Procurement pilot parity: PR self-service, approvals, PO, and vendor permissions.
 */
describe('Authorization V2 — Procurement pilot parity', () => {
  test.each(['employee', 'hod', 'manager', 'hr', 'admin', 'superadmin'])(
    'role %s has purchase request self-service permissions',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'procurement.pr.create')).toBe(true);
      expect(hasPermission(user, 'procurement.pr.view_self')).toBe(true);
    }
  );

  test('hod can approve purchase requests via department head grants', () => {
    const user = { _id: 'hod1', role: 'hod' };
    expect(hasPermission(user, 'procurement.pr.approve_hod')).toBe(true);
    expect(hasPermission(user, 'procurement.pr.view')).toBe(true);
  });

  test.each(['admin', 'superadmin', 'accounts'])(
    'role %s can admin-approve and manage procurement orders/vendors',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'procurement.pr.approve_admin')).toBe(true);
      expect(hasPermission(user, 'procurement.po.manage')).toBe(true);
      expect(hasPermission(user, 'procurement.vendor.manage')).toBe(true);
    }
  );

  test('accounts has HoD approve permission for shared approval UI', () => {
    const user = { _id: 'acc1', role: 'accounts' };
    expect(hasPermission(user, 'procurement.pr.approve_hod')).toBe(true);
  });

  test('client lacks procurement permissions', () => {
    const user = { _id: 'client1', role: 'client' };
    expect(hasPermission(user, 'procurement.pr.create')).toBe(false);
    expect(hasPermission(user, 'procurement.po.manage')).toBe(false);
  });
});
