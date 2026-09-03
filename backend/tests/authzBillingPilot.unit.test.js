import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';

/**
 * Billing pilot parity: invoices, subscriptions, and payment verification.
 */
describe('Authorization V2 — Billing pilot parity', () => {
  test.each(['admin', 'superadmin', 'accounts'])(
    'role %s can manage billing and verify payments',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'billing.invoice.view')).toBe(true);
      expect(hasPermission(user, 'billing.invoice.manage')).toBe(true);
      expect(hasPermission(user, 'billing.subscription.view')).toBe(true);
      expect(hasPermission(user, 'billing.subscription.manage')).toBe(true);
      expect(hasPermission(user, 'billing.payment.verify')).toBe(true);
    }
  );

  test('manager can view and manage billing records', () => {
    const user = { _id: 'mgr1', role: 'manager' };
    expect(hasPermission(user, 'billing.invoice.view')).toBe(true);
    expect(hasPermission(user, 'billing.invoice.manage')).toBe(true);
    expect(hasPermission(user, 'billing.payment.verify')).toBe(true);
  });

  test('client can view own billing portfolio', () => {
    const user = { _id: 'client1', role: 'client' };
    expect(hasPermission(user, 'billing.invoice.view')).toBe(true);
    expect(hasPermission(user, 'billing.subscription.view')).toBe(true);
    expect(hasPermission(user, 'billing.subscription.manage')).toBe(true);
    expect(hasPermission(user, 'billing.payment.verify')).toBe(false);
  });

  test('employee lacks billing permissions by default', () => {
    const user = { _id: 'emp1', role: 'employee' };
    expect(hasPermission(user, 'billing.invoice.view')).toBe(false);
    expect(hasPermission(user, 'billing.invoice.manage')).toBe(false);
  });
});
